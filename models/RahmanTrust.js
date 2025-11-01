// models/RahmanTrust.js
const mongoose = require('mongoose');

const RahmanTrustSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  pic: { type: String, required: true },
  manager: { type: String, required: true },
  location: { type: String, required: true },
  value: { type: Number, required: true },
  rate: { type: Number, required: true },
  mandate: { type: String, required: true }
});

module.exports = mongoose.models.RahmanTrust || mongoose.model('RahmanTrust', RahmanTrustSchema, 'rahman_trust_data');
