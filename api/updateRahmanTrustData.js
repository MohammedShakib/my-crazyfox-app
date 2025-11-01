// api/updateRahmanTrustData.js
import dbConnect from '../../lib/dbConnect';
import RahmanTrust from '../../models/RahmanTrust';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    await dbConnect(); // Connect to DB

    const { id, rate } = req.body;
    if (id === undefined || rate === undefined) {
      return res.status(400).send('Missing id or rate');
    }

    // SQL: UPDATE rahman_trust_data SET rate = ${rate} WHERE id = ${id};
    await RahmanTrust.findOneAndUpdate(
      { id: id },    // Find condition (WHERE)
      { rate: rate } // Update (SET)
    );

    // Re-fetch updated data as per original logic
    const data = await RahmanTrust.find({}).sort({ id: 'asc' });
    
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}