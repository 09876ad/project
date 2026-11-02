const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  // Stable identifier used by the seed script and future renames.
  slug: { type: String, required: true, trim: true, lowercase: true, index: true },
  name: { type: String, required: true },
  nameHi: { type: String, required: true },
  // Category is the matching unit: workers are tagged with it and bookings
  // verify the assigned worker offers it.
  category: { type: String, required: true, index: true },
  categoryHi: { type: String, required: true },
  description: { type: String, default: '' },
  descriptionHi: { type: String, default: '' },
  basePrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
