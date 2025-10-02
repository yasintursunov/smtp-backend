const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', e => console.error('PG pool error', e));
async function query(text, params){ const res = await pool.query(text, params); return { rows: res.rows, rowCount: res.rowCount }; }
module.exports = { pool, query };
