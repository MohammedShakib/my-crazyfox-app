// api/getRahmanTrustData.js
import dbConnect from '../../lib/dbConnect';
import RahmanTrust from '../../models/RahmanTrust';

export default async function handler(req, res) {
  try {
    await dbConnect(); // Connect to DB

    // SQL: SELECT * FROM rahman_trust_data ORDER BY id ASC;
    const data = await RahmanTrust.find({}).sort({ id: 'asc' });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}