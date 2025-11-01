// server.js

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Create once-and-reuse Mongo connection in this process.
let isConnecting = null;
const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!isConnecting) {
    isConnecting = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false
    });
  }

  return isConnecting;
};

// Re-create the schemas here so the standalone server does not depend on Next/Vercel runtime.
const CrazyFoxSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, unique: true },
    start_aum: Number,
    loan: Number,
    gross_return: Number,
    net_profit: Number,
    repayment: Number,
    end_aum: Number
  },
  { collection: 'crazyfox_sim_data' }
);

const RahmanTrustSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    pic: { type: String, required: true },
    manager: { type: String, required: true },
    location: { type: String, required: true },
    value: { type: Number, required: true },
    rate: { type: Number, required: true },
    mandate: { type: String, required: true }
  },
  { collection: 'rahman_trust_data' }
);

const CrazyFox =
  mongoose.models.CrazyFox || mongoose.model('CrazyFox', CrazyFoxSchema);
const RahmanTrust =
  mongoose.models.RahmanTrust || mongoose.model('RahmanTrust', RahmanTrustSchema);

// CrazyFox routes
app.get('/api/getCrazyFoxData', async (req, res) => {
  try {
    await connectToDatabase();
    const data = await CrazyFox.find({}).sort({ year: 'asc' });
    res.status(200).json(data);
  } catch (error) {
    console.error('GET /api/getCrazyFoxData failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/updateCrazyFoxData', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const simData = req.body;
  if (!simData || !Array.isArray(simData)) {
    return res.status(400).send('Invalid data format. Expected an array.');
  }

  try {
    await connectToDatabase();

    const operations = simData.map((row) => ({
      updateOne: {
        filter: { year: row.year },
        update: {
          $set: {
            year: row.year,
            start_aum: row.start_aum,
            loan: row.loan,
            gross_return: row.gross_return,
            net_profit: row.net_profit,
            repayment: row.repayment,
            end_aum: row.end_aum
          }
        },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await CrazyFox.bulkWrite(operations);
    }

    const data = await CrazyFox.find({}).sort({ year: 'asc' });
    res.status(200).json(data);
  } catch (error) {
    console.error('POST /api/updateCrazyFoxData failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Rahman Trust routes
app.get('/api/getRahmanTrustData', async (req, res) => {
  try {
    await connectToDatabase();
    const data = await RahmanTrust.find({}).sort({ id: 'asc' });
    res.status(200).json(data);
  } catch (error) {
    console.error('GET /api/getRahmanTrustData failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/updateRahmanTrustData', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { id, rate, value, pic, manager, location, mandate } = req.body || {};
  if (id === undefined) {
    return res.status(400).send('Missing id');
  }

  const update = {};
  if (rate !== undefined) update.rate = rate;
  if (value !== undefined) update.value = value;
  if (pic !== undefined) update.pic = pic;
  if (manager !== undefined) update.manager = manager;
  if (location !== undefined) update.location = location;
  if (mandate !== undefined) update.mandate = mandate;

  if (Object.keys(update).length === 0) {
    return res.status(400).send('No fields to update');
  }

  try {
    await connectToDatabase();
    await RahmanTrust.findOneAndUpdate({ id }, { $set: update }, { upsert: true });
    const data = await RahmanTrust.find({}).sort({ id: 'asc' });
    res.status(200).json(data);
  } catch (error) {
    console.error('POST /api/updateRahmanTrustData failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
