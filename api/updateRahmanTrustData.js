// api/updateRahmanTrustData.js
const dbConnect = require('../../lib/dbConnect');
const rahmanTrustModule = require('../../models/RahmanTrust');
const RahmanTrust = rahmanTrustModule.default || rahmanTrustModule;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    await dbConnect(); // Connect to DB

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

    // SQL: UPDATE rahman_trust_data SET rate = ${rate} WHERE id = ${id};
    await RahmanTrust.findOneAndUpdate(
      { id },    // Find condition (WHERE)
      { $set: update }, // Update (SET)
      { upsert: true }
    );

    // Re-fetch updated data as per original logic
    const data = await RahmanTrust.find({}).sort({ id: 'asc' });
    
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
