const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'pending_approval', 'in_progress', 'completed', 'cancelled'], 
    default: 'pending' },
  totalAmount: { type: Number, default: 0 },
  workerPayout: { type: Number, default: 0 },
  cooperativeFundContribution: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  isReviewed: { type: Boolean, default: false },
  photos: [String],

  // ✅ NEW FIELDS FOR QUOTE SYSTEM
  diagnosticFee: { type: Number, default: 100 }, // Base inspection fee
  diagnosis: { type: String, default: '' }, // Worker's diagnosis (e.g., "Faulty capacitor")
  partsCost: { type: Number, default: 0 }, // Cost of replacement parts
  finalQuoteAmount: { type: Number, default: 0 }, // Total: diagnosticFee + partsCost
  quoteApproved: { type: Boolean, default: false }, // Customer approval status

  // Payment Tracking Fields
  amountPaid: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);