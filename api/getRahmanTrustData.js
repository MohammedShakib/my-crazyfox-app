import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // ডাটাবেস থেকে সব ডেটা 'id' অনুযায়ী সাজিয়ে নিয়ে আসা হচ্ছে
    const { rows } = await sql`SELECT * FROM rahman_trust_data ORDER BY id ASC;`;
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
