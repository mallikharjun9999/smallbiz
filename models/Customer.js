const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, required: true, trim: true },
    company: { type: String, default: '', trim: true },
    address: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
