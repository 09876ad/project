const mongoose = require('mongoose');

const workerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: [String],
  experience: Number,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  reviews: [{
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }],
  isVerified: { type: Boolean, default: false },
  insuranceStatus: { type: String, default: 'Active' },
  cooperativeFundBalance: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('WorkerProfile', workerProfileSchema);