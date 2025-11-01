// api/getRahmanTrustData.js
const dbConnect = require('../../lib/dbConnect');
const rahmanTrustModule = require('../../models/RahmanTrust');
const RahmanTrust = rahmanTrustModule.default || rahmanTrustModule;

module.exports = async (req, res) => {
  try {
    await dbConnect(); // Connect to DB

    // SQL: SELECT * FROM rahman_trust_data ORDER BY id ASC;
    const data = await RahmanTrust.find({}).sort({ id: 'asc' });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
