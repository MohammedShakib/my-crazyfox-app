// api/getCrazyFoxData.js
const dbConnect = require('../../lib/dbConnect');
const crazyFoxModule = require('../../models/CrazyFox');
const CrazyFox = crazyFoxModule.default || crazyFoxModule;

module.exports = async (req, res) => {
  try {
    await dbConnect(); // Connect to DB

    // SQL: SELECT * FROM crazyfox_sim_data ORDER BY year ASC;
    const data = await CrazyFox.find({}).sort({ year: 'asc' });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
