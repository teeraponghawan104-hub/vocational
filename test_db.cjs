const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const pool = new Pool({
  connectionString: `postgresql://${process.env.SQL_USER}:${process.env.SQL_PASSWORD}@${process.env.SQL_HOST}:5432/${process.env.SQL_DB_NAME}`,
  ssl: false
});
const db = drizzle(pool);
pool.query('SELECT * FROM assessments').then(console.log).catch(console.error).finally(() => pool.end());
