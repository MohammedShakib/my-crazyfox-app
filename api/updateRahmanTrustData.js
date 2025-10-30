import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // শুধু 'POST' রিকোয়েস্ট গ্রহণ করা হবে
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { id, rate } = req.body; // React থেকে পাঠানো 'id' এবং নতুন 'rate'
    
    if (id === undefined || rate === undefined) {
      return res.status(400).send('Missing id or rate');
    }

    // নির্দিষ্ট 'id'-এর সারিটি আপডেট করা হচ্ছে
    await sql`
      UPDATE rahman_trust_data
      SET rate = ${rate}
      WHERE id = ${id};
    `;
    
    // আপডেটের পর, নতুন সব ডেটা আবার SELECT করে React-এ পাঠানো হচ্ছে
    const { rows } = await sql`SELECT * FROM rahman_trust_data ORDER BY id ASC;`;
    res.status(200).json(rows); // আপডেটেড লিস্ট পাঠানো হচ্ছে

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
