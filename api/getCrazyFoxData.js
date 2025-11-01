// api/getCrazyFoxData.js
import dbConnect from '../../lib/dbConnect';
import CrazyFox from '../../models/CrazyFox';

export default async function handler(req, res) {
  try {
    await dbConnect(); // Connect to DB

    // SQL: SELECT * FROM crazyfox_sim_data ORDER BY year ASC;
    const data = await CrazyFox.find({}).sort({ year: 'asc' });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}