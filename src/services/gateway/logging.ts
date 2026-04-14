// Logging service for centralized request/error logging
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { Pool } = pg;

const logsPool = new Pool({
  host: process.env['SUPABASE_HOST'] || 'aws-0-us-west-2.pooler.supabase.com',
  port: Number(process.env['SUPABASE_PORT'] || 5432),
  user: process.env['SUPABASE_DB_USER'] || 'postgres.cehhyegczbdoiuztsxpk',
  password: process.env['SUPABASE_DB_PASSWORD'] || '',
  database: process.env['SUPABASE_DB_NAME'] || 'postgres',
  ssl: { rejectUnauthorized: false },
});

export async function logRequest(data: {
  method: string;
  path: string;
  endpoint: string;
  statusCode: number;
  userId?: number;
  ipAddress?: string;
  responseTime?: number;
  userAgent?: string;
}): Promise<void> {
  try {
    await logsPool.query(
      `INSERT INTO public.audit_logs (entity_type, action, user_id, new_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        'REQUEST',
        `${data.method} ${data.endpoint}`,
        data.userId || null,
        JSON.stringify({
          method: data.method,
          path: data.path,
          endpoint: data.endpoint,
          statusCode: data.statusCode,
          ipAddress: data.ipAddress,
          responseTime: data.responseTime,
          userAgent: data.userAgent,
          timestamp: new Date().toISOString()
        })
      ]
    );
  } catch (err: any) {
    console.error('[Logging Error]', err.message);
  }
}

export async function logError(data: {
  method: string;
  path: string;
  statusCode: number;
  error: string;
  stack?: string;
  userId?: number;
  ipAddress?: string;
}): Promise<void> {
  try {
    await logsPool.query(
      `INSERT INTO public.audit_logs (entity_type, action, user_id, new_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        'ERROR',
        `${data.method} ${data.path}`,
        data.userId || null,
        JSON.stringify({
          method: data.method,
          path: data.path,
          statusCode: data.statusCode,
          error: data.error,
          stack: data.stack || '',
          ipAddress: data.ipAddress,
          timestamp: new Date().toISOString()
        })
      ]
    );
  } catch (err: any) {
    console.error('[Logging Error]', err.message);
  }
}

export async function logMetric(data: {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
}): Promise<void> {
  try {
    await logsPool.query(
      `INSERT INTO public.metrics (metric_name, metric_value, recorded_at)
       VALUES ($1, $2, NOW())`,
      [
        `${data.method} ${data.endpoint}`,
        data.responseTime
      ]
    );
  } catch (err: any) {
    console.error('[Metrics Error]', err.message);
  }
}

export default { logRequest, logError, logMetric };
