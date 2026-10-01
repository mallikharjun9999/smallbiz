const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [salesCount, productCount, customerCount] = await Promise.all([
      Sale.countDocuments({ status: 'completed' }),
      Product.countDocuments(),
      Customer.countDocuments()
    ]);
    const revenueAgg = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, revenue: { $sum: '$total' } } }
    ]);
    const revenue = revenueAgg[0]?.revenue || 0;

    const stockAgg = await Product.aggregate([
      { $group: { _id: null, units: { $sum: '$quantity' } } }
    ]);
    const stockUnits = stockAgg[0]?.units || 0;

    const lowStock = await Product.find({
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] }
    })
      .sort({ quantity: 1 })
      .limit(10);

    const recentSales = await Sale.find()
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
      .limit(8);

    // Revenue by last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyRevenue = await Sale.aggregate([
      { $match: { status: 'completed', saleDate: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      revenue,
      salesCount,
      productCount,
      customerCount,
      stockUnits,
      lowStock,
      recentSales,
      dailyRevenue
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
