require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function migrate() {
  try {
    const sql = fs.readFileSync('postgres_setup.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration successful!');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

migrate();
