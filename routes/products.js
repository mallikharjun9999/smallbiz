const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/products?search=&category=&lowStock=true&page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const { search = '', category = '', lowStock, page = 1, limit = 20 } = req.query;
    const q = {};
    if (search) {
      q.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) q.category = category;
    let products = await Product.find(q).sort({ createdAt: -1 });
    if (lowStock === 'true') {
      products = products.filter((p) => p.quantity <= p.lowStockThreshold);
    }
    const total = products.length;
    const pg = Math.max(1, parseInt(page));
    const lm = Math.max(1, parseInt(limit));
    const data = products.slice((pg - 1) * lm, pg * lm);
    res.json({ total, page: pg, pages: Math.ceil(total / lm), data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Product not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products (admin + staff)
router.post(
  '/',
  authorize('admin', 'staff'),
  [
    body('name').notEmpty(),
    body('sku').notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const product = await Product.create({ ...req.body, createdBy: req.user._id });
      res.status(201).json(product);
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: 'SKU must be unique' });
      res.status(500).json({ message: err.message });
    }
  }
);

// PUT /api/products/:id (admin + staff)
router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'SKU must be unique' });
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/products/:id (admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
