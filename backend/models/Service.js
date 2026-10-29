const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  basePrice: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);