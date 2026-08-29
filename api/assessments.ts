import { getDb, memoryDb } from './_db';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const sql = await getDb();

    if (req.method === 'GET') {
      if (sql) {
        const rows = await sql`
          SELECT data FROM assessments ORDER BY created_at DESC;
        `;
        const list = rows.map((r: any) => r.data);
        return res.status(200).json({ success: true, data: list });
      } else {
        const list = memoryDb.getAssessments();
        return res.status(200).json({ success: true, data: list, source: 'memory' });
      }
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = body.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Missing ID' });
      }

      if (sql) {
        await sql`
          INSERT INTO assessments (id, data, created_at)
          VALUES (${id}, ${JSON.stringify(body)}, NOW())
          ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(body)};
        `;
        return res.status(200).json({ success: true, message: 'Saved to Vercel Database' });
      } else {
        memoryDb.saveAssessment(id, body);
        return res.status(200).json({ success: true, message: 'Saved to local memory store' });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      if (!id) {
        return res.status(400).json({ success: false, error: 'Missing ID' });
      }

      if (sql) {
        await sql`
          DELETE FROM assessments WHERE id = ${id};
        `;
      } else {
        memoryDb.deleteAssessment(id);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API /assessments error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
}
