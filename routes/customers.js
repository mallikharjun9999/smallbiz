const express = require('express');
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/customers?search=&page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const q = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } }
          ]
        }
      : {};
    const total = await Customer.countDocuments(q);
    const data = await Customer.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ total, page: parseInt(page), pages: Math.ceil(total / limit), data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post(
  '/',
  authorize('admin', 'staff'),
  [body('name').notEmpty().withMessage('Name required'), body('phone').notEmpty().withMessage('Phone required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const customer = await Customer.create({ ...req.body, createdBy: req.user._id });
      res.status(201).json(customer);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
