import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { assessments } from './src/db/schema.js';
import { eq, desc } from 'drizzle-orm';

const { Pool } = pkg;

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  const pool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
  });
  
  const db = drizzle(pool);

  // API Routes
  app.get("/api/assessments", async (req, res) => {
    try {
      const data = await db.select().from(assessments).orderBy(desc(assessments.timestamp));
      
      // Map to the shape expected by frontend (nested objects)
      const formatted = data.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        student: {
          firstName: row.firstName,
          lastName: row.lastName,
          classLevel: row.classLevel,
          room: row.room,
          studentNumber: row.studentNumber
        },
        part1Score: {
          R: row.part1ScoreR,
          I: row.part1ScoreI,
          S: row.part1ScoreS,
          C: row.part1ScoreC,
          E: row.part1ScoreE,
          A: row.part1ScoreA
        },
        part2Score: {
          D: row.part2ScoreD,
          P: row.part2ScoreP,
          T: row.part2ScoreT
        },
        part3ConsistencyPercentage: row.part3ConsistencyPercentage
      }));
      
      res.json(formatted);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/assessments", async (req, res) => {
    try {
      const result = req.body;
      const id = result.id || Math.random().toString(36).substring(2, 15);
      
      console.log(`[API POST] Receiving assessment for ${result.student?.firstName} ${result.student?.lastName} (Room: ${result.student?.room}, No: ${result.student?.studentNumber})`);
      
      await db.delete(assessments).where(eq(assessments.id, id));
      await db.insert(assessments).values({
        id,
        timestamp: Number(result.timestamp) || Date.now(),
        firstName: String(result.student?.firstName || ''),
        lastName: String(result.student?.lastName || ''),
        classLevel: String(result.student?.classLevel || ''),
        room: String(result.student?.room || ''),
        studentNumber: String(result.student?.studentNumber || ''),
        part1ScoreR: Number(result.part1Score?.R) || 0,
        part1ScoreI: Number(result.part1Score?.I) || 0,
        part1ScoreS: Number(result.part1Score?.S) || 0,
        part1ScoreC: Number(result.part1Score?.C) || 0,
        part1ScoreE: Number(result.part1Score?.E) || 0,
        part1ScoreA: Number(result.part1Score?.A) || 0,
        part2ScoreD: Number(result.part2Score?.D) || 0,
        part2ScoreP: Number(result.part2Score?.P) || 0,
        part2ScoreT: Number(result.part2Score?.T) || 0,
        part3ConsistencyPercentage: Number(result.part3ConsistencyPercentage) || 0
      });
      
      console.log(`[API POST] Assessment saved successfully: ${id}`);
      res.json({ success: true, id });
    } catch (e: any) {
      console.error("[API POST Error]:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/assessments/:id", async (req, res) => {
    try {
      await db.delete(assessments).where(eq(assessments.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
