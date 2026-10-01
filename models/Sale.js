const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, unique: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: { type: [saleItemSchema], required: true, validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank', 'other'],
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'completed'
    },
    notes: { type: String, default: '' },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    saleDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Auto-generate invoice number: INV-<timestamp>-<random>
saleSchema.pre('validate', function (next) {
  if (!this.invoiceNo) {
    this.invoiceNo =
      'INV-' + Date.now().toString().slice(-8) + '-' + Math.floor(1000 + Math.random() * 9000);
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
