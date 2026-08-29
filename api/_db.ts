import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

let inMemoryAssessments: Record<string, any> = {};
let inMemoryLocks: Record<string, { sessionId: string; updatedAt: number }> = {};

function getConnectionString(): string | null {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

let dbInitialized = false;

export async function getDb() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    return null;
  }

  try {
    const sql = neon(connectionString);
    if (!dbInitialized) {
      await sql`
        CREATE TABLE IF NOT EXISTS assessments (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS locks (
          student_id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          updated_at BIGINT NOT NULL
        );
      `;
      dbInitialized = true;
    }
    return sql;
  } catch (err) {
    console.error('Database connection / init error:', err);
    return null;
  }
}

// In-Memory fallbacks for local/preview if no database is connected yet
export const memoryDb = {
  getAssessments: () => Object.values(inMemoryAssessments),
  saveAssessment: (id: string, data: any) => {
    inMemoryAssessments[id] = data;
  },
  deleteAssessment: (id: string) => {
    delete inMemoryAssessments[id];
  },
  getLocks: () => {
    const now = Date.now();
    const active: string[] = [];
    for (const [studentId, lock] of Object.entries(inMemoryLocks)) {
      if (now - lock.updatedAt < 600000) {
        active.push(studentId);
      }
    }
    return active;
  },
  acquireLock: (studentId: string, sessionId: string): boolean => {
    const now = Date.now();
    const existing = inMemoryLocks[studentId];
    if (existing && existing.sessionId !== sessionId && now - existing.updatedAt < 600000) {
      return false;
    }
    inMemoryLocks[studentId] = { sessionId, updatedAt: now };
    return true;
  },
  renewLock: (studentId: string, sessionId: string) => {
    inMemoryLocks[studentId] = { sessionId, updatedAt: Date.now() };
  },
  releaseLock: (studentId: string, sessionId: string) => {
    const existing = inMemoryLocks[studentId];
    if (existing && existing.sessionId === sessionId) {
      delete inMemoryLocks[studentId];
    }
  },
  forceReleaseLock: (studentId: string) => {
    delete inMemoryLocks[studentId];
  },
  clearAll: () => {
    inMemoryAssessments = {};
    inMemoryLocks = {};
  },
};
