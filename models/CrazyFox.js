// models/CrazyFox.js
const mongoose = require('mongoose');

const CrazyFoxSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  start_aum: Number,
  loan: Number,
  gross_return: Number,
  net_profit: Number,
  repayment: Number,
  end_aum: Number
});

module.exports = mongoose.models.CrazyFox || mongoose.model('CrazyFox', CrazyFoxSchema, 'crazyfox_sim_data');
