// Shared database connection for all microservices
import pg from 'pg';
import dotenv from 'dotenv';

// Cargar .env.local primero, luego .env como fallback
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { Pool } = pg;

const config = {
  host: process.env['SUPABASE_HOST'] || 'aws-0-us-west-2.pooler.supabase.com',
  port: Number(process.env['SUPABASE_PORT'] || 5432),
  user: process.env['SUPABASE_DB_USER'] || 'postgres.cehhyegczbdoiuztsxpk',
  password: process.env['SUPABASE_DB_PASSWORD'] || '',
  database: process.env['SUPABASE_DB_NAME'] || 'postgres',
  ssl: { rejectUnauthorized: false },
};

console.log('[Shared DB] Connecting to:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database
});

export const supabasePool = new Pool(config);

supabasePool.on('error', (err: Error) => {
  console.error('[Shared DB Error]', err);
});

export default supabasePool;
