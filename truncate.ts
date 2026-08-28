import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { assessments } from './src/db/schema.js';
import { sql } from 'drizzle-orm';
const { Pool } = pkg;
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});
const db = drizzle(pool);
async function run() {
  await db.execute(sql`TRUNCATE TABLE assessments;`);
  console.log('Database truncated successfully.');
  process.exit(0);
}
run();
