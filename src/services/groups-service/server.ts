// GROUPS MICROSERVICE - Group management (Fastify version)
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
const GROUPS_PORT = 3002;
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

console.log('🚀 Groups Service starting on Fastify...');

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
      fastify.log.warn('[Groups] Failed to load permisos from DB for user:', headerUserId, err?.message || err);
    }
  }

  // Primero intenta leer del header que inyecta el gateway
  let userPerms = (request.headers['x-user-permissions'] as string)?.trim();
  if (userPerms) {
    try {
      (request as any).userPermissions = JSON.parse(userPerms);
      return; // Usa los permisos del gateway
    } catch (err) {
      fastify.log.warn('[Groups] Failed to parse x-user-permissions header:', userPerms);
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
      fastify.log.warn('[Groups] Token decode failed:', err);
    }
  }

  // Si no hay nada, set empty permissions
  if (!(request as any).userPermissions) {
    (request as any).userPermissions = [];
  }
});

// Helper function to check permissions
function requirePermission(permission: string) {
  return async (request: any, reply: any) => {
    const userPerms = request.userPermissions || [];
    const hasPermission = userPerms.includes(permission) || userPerms.includes('admin');
    
    if (!hasPermission) {
      reply.status(403);
      return { statusCode: 403, error: `Missing permission: ${permission}` };
    }
  };
}

// Health check
fastify.get('/health', async (request, reply) => {
  return { service: 'groups-service', status: 'OK', timestamp: new Date() };
});

// ============================================
// GROUP ENDPOINTS
// ============================================

// Create group
fastify.post('/', async (request, reply) => {
  // Check permission: group_create
  const userPerms = (request as any).userPermissions || [];
  const hasPermission = userPerms.includes('group_create') || userPerms.includes('admin');
  
  if (!hasPermission) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: group_create' };
  }

  const { nivel, autor, nombre, integrantes, descripcion } = request.body as any || {};
  if (!nombre) {
    reply.status(400);
    return { error: 'Group name is required' };
  }

  try {
    const integ = integrantes ? JSON.stringify(integrantes) : JSON.stringify([]);
    const result = await supabasePool.query(
      `INSERT INTO groups (nivel, autor, nombre, integrantes, descripcion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nivel || null, autor || null, nombre, integ, descripcion || null]
    );

    const group = result.rows[0];
    group.integrantes = group.integrantes ? JSON.parse(group.integrantes) : [];
    reply.status(201);
    return group;
  } catch (error: any) {
    fastify.log.error('[Groups Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Get all groups
fastify.get('/', async (request, reply) => {
  // Check permission: groups:view
  const userPerms = (request as any).userPermissions || [];
  const hasView = userPerms.includes('group_view') || userPerms.includes('groups:view') || userPerms.includes('admin');
  if (!hasView) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: groups:view' };
  }
  try {
    const result = await supabasePool.query('SELECT * FROM groups ORDER BY created_at DESC');
    const groups = result.rows.map((g: any) => ({
      ...g,
      integrantes: g.integrantes ? JSON.parse(g.integrantes) : [],
    }));
    return groups;
  } catch (error: any) {
    fastify.log.error('[Groups Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Get single group
fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
  const { id } = request.params;
  // Check permission: groups:view
  const userPerms = (request as any).userPermissions || [];
  const hasView = userPerms.includes('group_view') || userPerms.includes('groups:view') || userPerms.includes('admin');
  if (!hasView) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: groups:view' };
  }

  try {
    const result = await supabasePool.query('SELECT * FROM groups WHERE id = $1 LIMIT 1', [id]);

    if (result.rows.length === 0) {
      reply.status(404);
      return { error: 'Group not found' };
    }

    const group = result.rows[0];
    group.integrantes = group.integrantes ? JSON.parse(group.integrantes) : [];
    return group;
  } catch (error: any) {
    fastify.log.error('[Groups Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Update group
fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
  // Check permission: group_edit
  const userPerms = (request as any).userPermissions || [];
  const hasPermission = userPerms.includes('group_edit') || userPerms.includes('admin');
  
  if (!hasPermission) {
    console.warn('❌ No permission to edit group:', (request as any).userId);
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: group_edit' };
  }

  const { id } = request.params;
  const { nivel, autor, nombre, integrantes, descripcion } = request.body as any || {};

  try {
    console.log('✏️  Updating group:', { id, nombre, autor });
    const integ = integrantes ? JSON.stringify(integrantes) : JSON.stringify([]);
    const result = await supabasePool.query(
      `UPDATE groups SET nivel = $1, autor = $2, nombre = $3, integrantes = $4, descripcion = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [nivel || null, autor || null, nombre, integ, descripcion || null, id]
    );

    if (result.rows.length === 0) {
      console.warn('⚠️  Group not found:', id);
      reply.status(404);
      return { error: 'Group not found' };
    }

    const group = result.rows[0];
    group.integrantes = group.integrantes ? JSON.parse(group.integrantes) : [];
    console.log('✅ Group updated successfully:', id);
    return group;
  } catch (error: any) {
    console.error('❌ Update error:', error);
    fastify.log.error('[Groups Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Delete group
fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
  // Check permission: group_delete
  const userPerms = (request as any).userPermissions || [];
  const hasPermission = userPerms.includes('group_delete') || userPerms.includes('admin');
  
  if (!hasPermission) {
    console.warn('❌ No permission to delete group:', (request as any).userId);
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: group_delete' };
  }

  const { id } = request.params;

  try {
    console.log('🗑️  Deleting group:', id);
    await supabasePool.query('DELETE FROM groups WHERE id = $1', [id]);
    console.log('✅ Group deleted successfully:', id);
    reply.status(200);
    return { ok: true };
  } catch (error: any) {
    console.error('❌ Delete error:', error);
    fastify.log.error('[Groups Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Get group tickets
fastify.get<{ Params: { id: string } }>('/:id/tickets', async (request, reply) => {
  const { id } = request.params;
  // Check permission: ticket_view
  const userPerms = (request as any).userPermissions || [];
  const hasTicketView = userPerms.includes('ticket_view') || userPerms.includes('tickets:view') || userPerms.includes('admin');
  if (!hasTicketView) {
    reply.status(403);
    return { statusCode: 403, error: 'Missing permission: ticket_view' };
  }

  try {
    const result = await supabasePool.query(
      `SELECT id, group_id, titulo, descripcion, estado, priority, created_by, created_at 
       FROM tickets WHERE group_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    return result.rows;
  } catch (error: any) {
    fastify.log.error('[Groups Service Error]', error);
    reply.status(500);
    return { error: 'Database error', details: error.message };
  }
});

// Start server
try {
  await fastify.listen({ port: GROUPS_PORT, host: '0.0.0.0' });
  console.log(`✅ Groups Service listening on http://localhost:${GROUPS_PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
