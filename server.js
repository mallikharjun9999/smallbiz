require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
// Restrict CORS when FRONTEND_URL is set (comma-separated allowlist), else open (local dev).
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(allowedOrigins.length ? cors({ origin: allowedOrigins }) : cors());
app.use(express.json());

// Health check for hosts (Render / load balancers).
app.get('/healthz', (req, res) => res.json({ ok: true }));

connectDB();

app.get('/', (req, res) => {
  res.json({
    name: 'Small Business Management API (MERN)',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET/POST /api/products',
      'GET/PUT/DELETE /api/products/:id',
      'GET/POST /api/customers',
      'GET/PUT/DELETE /api/customers/:id',
      'GET/POST /api/sales',
      'GET/PUT/DELETE /api/sales/:id',
      'GET /api/dashboard/stats'
    ]
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));

// 404 + error handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
// eslint-disable-next-line
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

module.exports = app;
