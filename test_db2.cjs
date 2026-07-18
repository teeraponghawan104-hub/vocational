const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
  port: 5432,
  ssl: false
});
pool.query("SELECT * FROM assessments").then(console.log).catch(console.error).finally(() => pool.end());
