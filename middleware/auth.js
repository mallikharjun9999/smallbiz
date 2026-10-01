const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role-based access: authorize('admin') or authorize('admin','staff')
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }
  next();
};

module.exports = { auth, authorize };
