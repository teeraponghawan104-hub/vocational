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
      
      await db.insert(assessments).values({
        id,
        timestamp: result.timestamp,
        firstName: result.student.firstName,
        lastName: result.student.lastName,
        classLevel: result.student.classLevel,
        room: result.student.room,
        studentNumber: result.student.studentNumber,
        part1ScoreR: result.part1Score.R,
        part1ScoreI: result.part1Score.I,
        part1ScoreS: result.part1Score.S,
        part1ScoreC: result.part1Score.C,
        part1ScoreE: result.part1Score.E,
        part1ScoreA: result.part1Score.A,
        part2ScoreD: result.part2Score.D,
        part2ScoreP: result.part2Score.P,
        part2ScoreT: result.part2Score.T,
        part3ConsistencyPercentage: result.part3ConsistencyPercentage
      });
      
      res.json({ success: true, id });
    } catch (e: any) {
      console.error(e);
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
