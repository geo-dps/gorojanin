const { Pool } = require('pg');
const config = require('./config');

// Railway's internal Postgres connections don't need SSL; managed/external
// Postgres (e.g. when DATABASE_URL points off-platform) often does.
const useSsl = /sslmode=require/.test(config.databaseUrl) || process.env.PGSSL === 'true';

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
