import { getDb, memoryDb } from './_db';

export default async function handler(req: any, res: any) {
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
      const now = Date.now();
      if (sql) {
        const rows = await sql`
          SELECT student_id, updated_at FROM locks;
        `;
        const active = rows
          .filter((r: any) => now - Number(r.updated_at) < 600000)
          .map((r: any) => r.student_id);
        return res.status(200).json({ success: true, locks: active });
      } else {
        const active = memoryDb.getLocks();
        return res.status(200).json({ success: true, locks: active });
      }
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { studentId, sessionId } = body || {};
      const now = Date.now();

      if (!studentId || !sessionId) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
      }

      if (sql) {
        const existing = await sql`
          SELECT session_id, updated_at FROM locks WHERE student_id = ${studentId} LIMIT 1;
        `;
        if (existing.length > 0) {
          const row = existing[0];
          if (row.session_id !== sessionId && now - Number(row.updated_at) < 600000) {
            return res.status(200).json({ success: false, acquired: false, reason: 'Already locked' });
          }
        }

        await sql`
          INSERT INTO locks (student_id, session_id, updated_at)
          VALUES (${studentId}, ${sessionId}, ${now})
          ON CONFLICT (student_id) DO UPDATE 
          SET session_id = ${sessionId}, updated_at = ${now};
        `;
        return res.status(200).json({ success: true, acquired: true });
      } else {
        const acquired = memoryDb.acquireLock(studentId, sessionId);
        return res.status(200).json({ success: true, acquired });
      }
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { studentId, sessionId } = body || {};
      const now = Date.now();

      if (sql && studentId && sessionId) {
        await sql`
          UPDATE locks SET updated_at = ${now} WHERE student_id = ${studentId} AND session_id = ${sessionId};
        `;
      } else if (studentId && sessionId) {
        memoryDb.renewLock(studentId, sessionId);
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { studentId, sessionId, force } = req.query || {};

      if (sql && studentId) {
        if (force === 'true') {
          await sql`DELETE FROM locks WHERE student_id = ${studentId};`;
        } else if (sessionId) {
          await sql`DELETE FROM locks WHERE student_id = ${studentId} AND session_id = ${sessionId};`;
        }
      } else if (studentId) {
        if (force === 'true') {
          memoryDb.forceReleaseLock(studentId);
        } else if (sessionId) {
          memoryDb.releaseLock(studentId, sessionId);
        }
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API /locks error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
}
