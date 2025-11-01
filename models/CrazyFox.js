// models/CrazyFox.js
import mongoose from 'mongoose';

const CrazyFoxSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  start_aum: Number,
  loan: Number,
  gross_return: Number,
  net_profit: Number,
  repayment: Number,
  end_aum: Number
});

export default mongoose.models.CrazyFox || mongoose.model('CrazyFox', CrazyFoxSchema, 'crazyfox_sim_data');