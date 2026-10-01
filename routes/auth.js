const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'devsecret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// POST /api/auth/register  (first user becomes admin; afterwards only admin can create admins)
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { name, email, password, role } = req.body;
      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists) return res.status(400).json({ message: 'Email already registered' });

      const userCount = await User.countDocuments();
      // First registered user is admin automatically
      let finalRole = userCount === 0 ? 'admin' : 'staff';
      if (role === 'admin' && userCount === 0) finalRole = 'admin';

      const user = await User.create({ name, email, password, role: finalRole });
      const token = signToken(user);
      res.status(201).json({ token, user });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });
      const ok = await user.comparePassword(password);
      if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
      const token = signToken(user);
      res.json({ token, user });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

// GET /api/auth/users (admin only)
router.get('/users', auth, authorize('admin'), async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

// PUT /api/auth/users/:id/role (admin only)
router.put('/users/:id/role', auth, authorize('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'staff'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', auth, authorize('admin'), async (req, res) => {
  if (req.params.id === req.user._id.toString())
    return res.status(400).json({ message: 'Cannot delete yourself' });
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
});

module.exports = router;
