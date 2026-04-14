import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Supabase PostgreSQL connection
const pool = new Pool({
  host: process.env['SUPABASE_HOST'] || 'cehhyegczbdoiuztsxpk.supabase.co',
  port: Number(process.env['SUPABASE_PORT'] || 5432),
  user: process.env['SUPABASE_DB_USER'] || 'postgres',
  password: process.env['SUPABASE_DB_PASSWORD'] || '',
  database: process.env['SUPABASE_DB_NAME'] || 'postgres',
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;

