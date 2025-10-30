import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // ডাটাবেস থেকে সব ডেটা 'year' অনুযায়ী সাজিয়ে নিয়ে আসা হচ্ছে
    const { rows } = await sql`SELECT * FROM crazyfox_sim_data ORDER BY year ASC;`;
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
