// Optional seed script: creates admin user + sample products/customers.
// Usage: npm run seed  (requires MONGO_URI in .env)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Customer = require('./models/Customer');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smallbiz');
    console.log('Connected for seeding');

    let admin = await User.findOne({ email: 'admin@shop.com' });
    if (!admin) {
      admin = await User.create({ name: 'Shop Admin', email: 'admin@shop.com', password: 'admin123', role: 'admin' });
      console.log('Admin created: admin@shop.com / admin123');
    } else {
      console.log('Admin already exists');
    }

    if ((await Product.countDocuments()) === 0) {
      await Product.insertMany([
        { name: 'Wireless Mouse', sku: 'WM-001', description: 'Ergonomic wireless mouse', category: 'Electronics', price: 899, costPrice: 550, quantity: 50, createdBy: admin._id },
        { name: 'Notebook (Pack of 5)', sku: 'NB-005', description: 'A5 ruled notebooks', category: 'Stationery', price: 299, costPrice: 150, quantity: 120, createdBy: admin._id },
        { name: 'Coffee Beans 1kg', sku: 'CF-100', description: 'Arabica coffee beans', category: 'Grocery', price: 749, costPrice: 480, quantity: 8, createdBy: admin._id }
      ]);
      console.log('Sample products inserted');
    }

    if ((await Customer.countDocuments()) === 0) {
      await Customer.insertMany([
        { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876500001', company: 'Priya Boutique', address: 'MG Road, Bengaluru', createdBy: admin._id },
        { name: 'Rahul Verma', email: 'rahul@example.com', phone: '9876500002', address: 'Andheri, Mumbai', createdBy: admin._id }
      ]);
      console.log('Sample customers inserted');
    }

    console.log('Seeding done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
