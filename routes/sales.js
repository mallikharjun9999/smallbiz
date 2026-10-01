const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/sales?status=&customer=&page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const { status = '', customer = '', page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (customer) q.customer = customer;
    const total = await Sale.countDocuments(q);
    const data = await Sale.find(q)
      .populate('customer', 'name email phone company')
      .populate('soldBy', 'name email')
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
    const sale = await Sale.findById(req.params.id)
      .populate('customer')
      .populate('items.product')
      .populate('soldBy', 'name email');
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sales — body: { customer, items: [{product, quantity}], tax, discount, paymentMethod, status, notes }
router.post('/', authorize('admin', 'staff'), async (req, res) => {
  try {
    const { customer, items, tax = 0, discount = 0, paymentMethod = 'cash', status = 'completed', notes = '' } = req.body;
    if (!customer) return res.status(400).json({ message: 'Customer is required' });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'At least one item is required' });

    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) return res.status(400).json({ message: 'Invalid customer' });

    // Resolve products, validate stock, build snapshot items
    const saleItems = [];
    let subtotal = 0;
    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod) return res.status(400).json({ message: `Invalid product: ${it.product}` });
      const qty = parseInt(it.quantity);
      if (!qty || qty < 1) return res.status(400).json({ message: `Invalid quantity for ${prod.name}` });
      if (status === 'completed' && prod.quantity < qty)
        return res.status(400).json({ message: `Insufficient stock for ${prod.name} (have ${prod.quantity})` });
      saleItems.push({ product: prod._id, name: prod.name, price: prod.price, quantity: qty });
      subtotal += prod.price * qty;
    }
    const total = Math.max(0, subtotal + Number(tax) - Number(discount));

    const sale = await Sale.create({
      customer,
      items: saleItems,
      subtotal,
      tax: Number(tax),
      discount: Number(discount),
      total,
      paymentMethod,
      status,
      notes,
      soldBy: req.user._id
    });

    // Decrement stock for completed sales
    if (status === 'completed') {
      for (const it of saleItems) {
        await Product.findByIdAndUpdate(it.product, { $inc: { quantity: -it.quantity } });
      }
    }

    const populated = await sale.populate('customer', 'name email phone');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/sales/:id — allow status/notes/paymentMethod updates; cancelling restores stock once
router.put('/:id', authorize('admin', 'staff'), async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    const prevStatus = sale.status;
    const { status, paymentMethod, notes } = req.body;
    if (status) sale.status = status;
    if (paymentMethod) sale.paymentMethod = paymentMethod;
    if (notes !== undefined) sale.notes = notes;
    await sale.save();

    // Restore stock if a completed sale is cancelled (once)
    if (prevStatus === 'completed' && sale.status === 'cancelled') {
      for (const it of sale.items) {
        await Product.findByIdAndUpdate(it.product, { $inc: { quantity: it.quantity } });
      }
    }
    const updated = await Sale.findById(sale._id).populate('customer', 'name email phone');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/sales/:id (admin only) — restores stock if it was completed
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.status === 'completed') {
      for (const it of sale.items) {
        await Product.findByIdAndUpdate(it.product, { $inc: { quantity: it.quantity } });
      }
    }
    res.json({ message: 'Sale deleted, stock restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
