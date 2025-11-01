// models/RahmanTrust.js
import mongoose from 'mongoose';

const RahmanTrustSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  entity_name: String,
  rate: Number
  // Add other columns as needed
});

export default mongoose.models.RahmanTrust || mongoose.model('RahmanTrust', RahmanTrustSchema, 'rahman_trust_data');