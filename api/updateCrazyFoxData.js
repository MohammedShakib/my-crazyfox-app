// api/updateCrazyFoxData.js
import dbConnect from '../../lib/dbConnect';
import CrazyFox from '../../models/CrazyFox';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const simData = req.body; // Full array from React

  if (!simData || !Array.isArray(simData)) {
    return res.status(400).send('Invalid data format. Expected an array.');
  }

  try {
    await dbConnect(); // Connect to DB

    // Use bulkWrite for efficient batch updates
    const operations = simData.map((row) => ({
      updateOne: {
        filter: { year: row.year }, // WHERE year = ...
        update: {
          $set: { // SET ...
            start_aum: row.start_aum,
            loan: row.loan,
            gross_return: row.gross_return,
            net_profit: row.net_profit,
            repayment: row.repayment,
            end_aum: row.end_aum
          }
        },
        upsert: true // If year doesn't exist, create new doc
      }
    }));

    await CrazyFox.bulkWrite(operations); // Execute all operations

    res.status(200).json({ message: 'Simulation updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}