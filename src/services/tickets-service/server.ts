// TICKETS MICROSERVICE - Ticket management (Fastify version)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import supabasePool from '../shared-db.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const fastify = Fastify({ 
  logger: true,
  bodyLimit: 1048576
});
const TICKETS_PORT = 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secret-key-aqui-cambiar-en-produccion';

// Register CORS with all methods
await fastify.register(cors, { 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type']
});

// Hook to handle empty JSON body for DELETE/PUT
fastify.addHook('onRequest', async (request, reply) => {
  // For DELETE/PUT: if Content-Length is 0 or missing, change content-type to prevent JSON parsing error
  if ((request.method === 'DELETE' || request.method === 'PUT')) {
    const contentLength = request.headers['content-length'];
    if (contentLength === '0' || !contentLength) {
      request.headers['content-type'] = 'text/plain';
    }
  }
});

console.log('🚀 Tickets Service starting on Fastify...');

// ============================================
// PERMISSION MIDDLEWARE
// ============================================

// Middleware to extract user permissions from JWT token OR from gateway headers
fastify.addHook('preHandler', async (request, reply) => {
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  // If gateway provided a user id, prefer loading fresh permisos from DB (source of truth)
  const headerUserId = (request.headers['x-user-id'] || request.headers['x_user_id'] || request.headers['x-user']) as string | undefined;
  if (headerUserId) {
    try {
      const result = await supabasePool.query('SELECT permisos FROM users WHERE id = $1 LIMIT 1', [headerUserId]);
      const perms = (result.rows && result.rows[0] && result.rows[0].permisos) ? result.rows[0].permisos : [];
      (request as any).userPermissions = perms;
      return; // Use DB-backed permissions to ensure immediate consistency
    } catch (err) {
      fastify.log.warn('[Tickets] Failed to load permisos from DB for user:', headerUserId, err?.message || err);
    }
  }

  // Primero intenta leer del header que inyecta el gateway
  let userPerms = (request.headers['x-user-permissions'] as string)?.trim();
  if (userPerms) {
    try {
      (request as any).userPermissions = JSON.parse(userPerms);
      return; // Usa los permisos del gateway
    } catch (err) {
      fastify.log.warn('[Tickets] Failed to parse x-user-permissions header:', userPerms);
    }
  }

  // Fallback: intenta decodificar del token
  if (token) {
    try {
      const decoded: any = jwt.decode(token);
      if (decoded) {
        (request as any).user = decoded;
        (request as any).userPermissions = decoded.permissions || [];
      }
    } catch (err) {
      fastify.log.warn('[Tickets] Token decode failed:', err);
    }
  }

  // Si no hay nada, set empty permissions
  if (!(request as any).userPermissions) {
    (request as any).userPermissions = [];
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { service: 'tickets-service', status: 'OK', timestamp: new Date() };
});

// ============================================
// TICKET ENDPOINTS
// ============================================

// Get all tickets
fastify.get('/', async (request, reply) => {
  // Check permission: ticket_view
  const userPerms = (request as any).userPermissions || [];
  const hasView = userPerms.includes('ticket_view') || userPerms.includes('tickets:view') || userPerms.includes('admin');
  if (!hasView) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: ticket_view' };
  }

  try {
    const result = await supabasePool.query(
      'SELECT id, group_id, titulo, descripcion, estado, created_by, created_at, priority FROM tickets ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (error: any) {
    console.error('❌ [Tickets Service] GET / ERROR:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });
    fastify.log.error('[Tickets Service Error]', error.message || error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Get all tickets for a group
fastify.get<{ Params: { groupId: string } }>('/group/:groupId', async (request, reply) => {
  const { groupId } = request.params;
  // Check permission: ticket_view
  const userPerms = (request as any).userPermissions || [];
  const hasView = userPerms.includes('ticket_view') || userPerms.includes('tickets:view') || userPerms.includes('admin');
  if (!hasView) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: ticket_view' };
  }

  try {
    const result = await supabasePool.query(
      `SELECT id, group_id, titulo, descripcion, estado, created_by, created_at, priority 
       FROM tickets WHERE group_id = $1 ORDER BY created_at DESC`,
      [groupId]
    );
    return result.rows;
  } catch (error: any) {
    fastify.log.error('[Tickets Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Get ticket history (last entries)
fastify.get<{ Params: { id: string } }>('/:id/history', async (request, reply) => {
  const { id } = request.params;

  // Permission: ticket_view required to access history
  const userPerms = (request as any).userPermissions || [];
  const hasPermission = userPerms.includes('ticket_view') || userPerms.includes('admin');
  if (!hasPermission) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: ticket_view' };
  }

  try {
    const result = await supabasePool.query(
      `SELECT estado_anterior, estado_nuevo, changed_by, changed_at
       FROM ticket_history WHERE ticket_id = $1
       ORDER BY changed_at DESC LIMIT 10`,
      [id]
    );
    return result.rows;
  } catch (error: any) {
    fastify.log.error('[Tickets Service Error - History]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Get single ticket
fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
  const { id } = request.params;
  // Check permission: ticket_view
  const userPerms = (request as any).userPermissions || [];
  const hasView = userPerms.includes('ticket_view') || userPerms.includes('tickets:view') || userPerms.includes('admin');
  if (!hasView) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: ticket_view' };
  }

  try {
    const result = await supabasePool.query(
      'SELECT * FROM tickets WHERE id = $1 LIMIT 1',
      [id]
    );

    if (result.rows.length === 0) {
      reply.status(404);
      return { error: 'Ticket not found' };
    }

    return result.rows[0];
  } catch (error: any) {
    fastify.log.error('[Tickets Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Create ticket
fastify.post('/', async (request, reply) => {
  // Check permission: ticket_create
  const userPerms = (request as any).userPermissions || [];
  const hasPermission = userPerms.includes('ticket_create') || userPerms.includes('admin');
  
  if (!hasPermission) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: ticket_create' };
  }

  const { group_id, titulo, descripcion, estado, priority, created_by } = request.body as any || {};

  if (!group_id || !titulo || !created_by) {
    reply.status(400);
    return { error: 'Missing required fields' };
  }

  try {
    console.log('🎫 [Tickets Service] POST / - Received payload:', {
      group_id,
      titulo,
      descripcion,
      estado,
      priority,
      created_by
    });

    const queryString = `INSERT INTO tickets (group_id, titulo, descripcion, estado, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`;
    
    const queryParams = [group_id, titulo, descripcion || null, estado || 'No iniciado', priority || 'moderada', created_by];
    
    console.log('📝 [Tickets Service] INSERT Query:', {
      query: queryString,
      params: queryParams
    });

    const result = await supabasePool.query(queryString, queryParams);

    console.log('✅ [Tickets Service] Ticket inserted successfully:', result.rows[0]);
    
    reply.status(201);
    return result.rows[0];
  } catch (error: any) {
    console.error('❌ [Tickets Service] INSERT ERROR - Full details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      query: error.query,
      stack: error.stack
    });
    
    fastify.log.error('[Tickets Service Error]', error);
    reply.status(500);
    return { 
      error: 'Database error', 
      details: error.message,
      code: error.code,
      detail: error.detail
    };
  }
});

// Update ticket
fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
  // Check permission: ticket_edit
  const userPerms = (request as any).userPermissions || [];
  const hasPermission = userPerms.includes('ticket_edit') || userPerms.includes('admin');
  
  if (!hasPermission) {
    console.warn('❌ No permission to edit ticket:', (request as any).userId);
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: ticket_edit' };
  }

  const { id } = request.params;
  const { titulo, descripcion, estado, priority } = request.body as any || {};

  try {
    console.log('✏️  Updating ticket:', { id, titulo, estado, priority, descripcion });
    const result = await supabasePool.query(
      `UPDATE tickets SET titulo = $1, descripcion = $2, estado = $3, priority = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [titulo, descripcion, estado, priority || 'moderada', id]
    );

    if (result.rows.length === 0) {
      console.warn('⚠️  Ticket not found:', id);
      reply.status(404);
      return { error: 'Ticket not found' };
    }

    console.log('✅ Ticket updated successfully:', id);
    reply.status(200);
    return result.rows[0];
  } catch (error: any) {
    console.error('❌ Update error:', error);
    fastify.log.error('[Tickets Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Delete ticket
fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
  // Check permission: ticket_delete
  const userPerms = (request as any).userPermissions || [];
  const hasPermission = userPerms.includes('ticket_delete') || userPerms.includes('admin');
  
  if (!hasPermission) {
    console.warn('❌ No permission to delete ticket:', (request as any).userId);
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: ticket_delete' };
  }

  const { id } = request.params;

  try {
    console.log('🗑️  Deleting ticket:', id);
    await supabasePool.query('DELETE FROM tickets WHERE id = $1', [id]);
    console.log('✅ Ticket deleted successfully:', id);
    reply.status(200);
    return { ok: true };
  } catch (error: any) {
    console.error('❌ Delete error:', error);
    fastify.log.error('[Tickets Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Start server
try {
  await fastify.listen({ port: TICKETS_PORT, host: '0.0.0.0' });
  console.log(`✅ Tickets Service listening on http://localhost:${TICKETS_PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
