import { db, sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // শুধু 'POST' রিকোয়েস্ট গ্রহণ করা হবে
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const client = await db.connect();
  const simData = req.body; // React থেকে পাঠানো সম্পূর্ণ ২০ বছরের অ্যারে

  if (!simData || !Array.isArray(simData)) {
    return res.status(400).send('Invalid data format. Expected an array.');
  }

  try {
    await client.sql`BEGIN`; // ডাটাবেস ট্রানজ্যাকশন শুরু
    
    // অ্যারের প্রতিটি আইটেমের জন্য লুপ চালানো হচ্ছে
    for (const row of simData) {
      // প্রতিটি সারি তার 'year' অনুযায়ী আপডেট করা হচ্ছে
      await client.sql`
        UPDATE crazyfox_sim_data
        SET 
          start_aum = ${row.start_aum},
          loan = ${row.loan},
          gross_return = ${row.gross_return},
          net_profit = ${row.net_profit},
          repayment = ${row.repayment},
          end_aum = ${row.end_aum}
        WHERE year = ${row.year};
      `;
    }
    
    await client.sql`COMMIT`; // সব ঠিক থাকলে সেভ করা হচ্ছে
    res.status(200).json({ message: 'Simulation updated successfully' });
  } catch (error) {
    await client.sql`ROLLBACK`; // কোনো সমস্যা হলে আগের অবস্থায় ফিরে যাওয়া হচ্ছে
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}
