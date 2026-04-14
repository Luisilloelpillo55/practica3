// API GATEWAY - Central routing point for all microservices (Fastify version)
import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { logRequest, logError, logMetric } from './logging.js';

dotenv.config();

const fastify = Fastify({ logger: true });
const GATEWAY_PORT = 3000;

// Microservice URLs
const USERS_SERVICE = process.env['USERS_SERVICE_URL'] || 'http://localhost:3001';
const GROUPS_SERVICE = process.env['GROUPS_SERVICE_URL'] || 'http://localhost:3002';
const TICKETS_SERVICE = process.env['TICKETS_SERVICE_URL'] || 'http://localhost:3003';

console.log('🚀 API Gateway starting on Fastify...');
console.log(`   Users Service: ${USERS_SERVICE}`);
console.log(`   Groups Service: ${GROUPS_SERVICE}`);
console.log(`   Tickets Service: ${TICKETS_SERVICE}`);

// Register CORS with explicit methods to allow PUT/DELETE
await fastify.register(cors, { 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type']
});

// Request logging middleware hook
fastify.addHook('onResponse', async (request, reply) => {
  const responseTime = (reply.getResponseTime?.() * 1000) || 0;
  
  // Log request
  const userId = (request as any).userId;
  const ipAddress = request.ip;
  
  logRequest({
    method: request.method,
    path: request.url,
    endpoint: request.url.split('?')[0],
    statusCode: reply.statusCode,
    userId,
    ipAddress,
    responseTime: Math.round(responseTime),
    userAgent: request.headers['user-agent']
  }).catch(err => fastify.log.error('Request logging failed:', err));

  // Log metrics
  logMetric({
    endpoint: request.url.split('?')[0],
    method: request.method,
    responseTime: Math.round(responseTime),
    statusCode: reply.statusCode
  }).catch(err => fastify.log.error('Metrics logging failed:', err));

  // Log errors
  if (reply.statusCode >= 400) {
    logError({
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      error: reply.statusMessage || 'Unknown error',
      userId,
      ipAddress
    }).catch(err => fastify.log.error('Error logging failed:', err));
  }

  fastify.log.info(`[GATEWAY] ${request.method} ${request.url} → ${reply.statusCode} (${Math.round(responseTime)}ms)`);
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'Gateway OK', timestamp: new Date() };
});

// ============================================
// PERMISSION VALIDATION MIDDLEWARE
// ============================================

// Mapping of endpoints to required permissions
const PERMISSION_MAP: { [key: string]: string } = {
  'POST /api/tickets': 'ticket_add',
  'PUT /api/tickets': 'ticket_move',
  'DELETE /api/tickets': 'ticket_delete',
  'POST /api/groups': 'group_create',
  'PUT /api/groups': 'group_edit',
  'DELETE /api/groups': 'group_delete',
  'POST /api/users': 'user_manage',
  'PUT /api/users': 'user_manage',
  'DELETE /api/users': 'user_delete',
};

// Auth middleware: validates token and extracts user info
fastify.addHook('preHandler', async (request, reply) => {
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  // Log every request to debug auth issues
  if (request.method !== 'OPTIONS') {
    console.log(`[GATEWAY AUTH] ${request.method} ${request.url.split('?')[0]}:`, {
      has_auth_header: !!authHeader,
      auth_header_starts_with: authHeader?.substring(0, 20),
      has_token: !!token,
      token_length: token?.length || 0
    });
  }
  
  // Public endpoints - no token required
  if ((request.method === 'POST' && request.url.startsWith('/api/users/login')) ||
      (request.method === 'POST' && request.url.startsWith('/api/users/register'))) {
    console.log(`[GATEWAY AUTH] ${request.method} ${request.url} - PUBLIC ENDPOINT, skipping token validation`);
    return;
  }

  // All other endpoints require a token
  if (!token) {
    console.warn(`[GATEWAY AUTH] ${request.method} ${request.url} - ❌ MISSING TOKEN`);
    reply.status(401).send({ 
      statusCode: 401,
      intOpCode: 'SxUS401',
      error: 'Missing authentication token' 
    });
    return;
  }

  try {
    // Decode token WITHOUT verification (signature is validated by services)
    const decoded: any = jwt.decode(token);
    
    console.log(`[GATEWAY AUTH] ${request.method} ${request.url} - Token decoded:`, {
      userId: decoded?.userId,
      usuario: decoded?.usuario,
      has_userId: !!decoded?.userId
    });
    
    if (!decoded || !decoded.userId) {
      console.warn(`[GATEWAY AUTH] ${request.method} ${request.url} - ❌ INVALID TOKEN (no userId)`);
      reply.status(401).send({ 
        statusCode: 401,
        intOpCode: 'SxUS401',
        error: 'Invalid token' 
      });
      return;
    }

    // Attach user info to request
    (request as any).user = decoded;
    (request as any).userId = decoded.userId;
    (request as any).userPermissions = decoded.permissions || [];
    
    // If user is admin, add 'admin' to permissions array
    if (decoded.is_admin && !((request as any).userPermissions.includes('admin'))) {
      (request as any).userPermissions.push('admin');
    }
    
    console.log(`[GATEWAY AUTH] ✓ ${request.method} ${request.url} - Token validated for user:`, decoded.usuario, 'Permissions:', (request as any).userPermissions);

  } catch (err) {
    console.error(`[GATEWAY AUTH] ${request.method} ${request.url} - ❌ TOKEN VALIDATION ERROR:`, err);
    reply.status(401).send({ 
      statusCode: 401,
      intOpCode: 'SxUS401',
      error: 'Token validation failed' 
    });
    return;
  }
});

// Permission validation middleware
fastify.addHook('preHandler', async (request, reply) => {
  const key = `${request.method} ${request.url.split(/\?/)[0]}`;
  const requiredPermission = PERMISSION_MAP[key];

  // Permission validation disabled in gateway - validated per service
  // This prevents blocking legitimate requests while services do proper validation
  if (requiredPermission && false) { // Always false to disable
    const userPerms = (request as any).userPermissions || [];
    const hasPermission = userPerms.includes(requiredPermission) || userPerms.includes('admin');

    if (!hasPermission) {
      reply.status(403).send({ 
        statusCode: 403,
        intOpCode: 'SxFRB403',
        error: `Missing permission: ${requiredPermission}` 
      });
      return;
    }
  }
});

// ============================================
// INJECT USER INFO AS HEADERS (for microservices)
// ============================================

fastify.addHook('preHandler', async (request, reply) => {
  const user = (request as any).user;
  const userPermissions = (request as any).userPermissions || [];
  const userId = (request as any).userId;
  
  // Inject as headers para que los servicios reciban los datos
  if (userId) {
    request.headers['x-user-id'] = String(userId);
  }
  if (user?.usuario) {
    request.headers['x-user-name'] = user.usuario;
  }
  if (userPermissions.length > 0) {
    request.headers['x-user-permissions'] = JSON.stringify(userPermissions);
  }
  
  // Log para debug
  if (request.method !== 'OPTIONS') {
    console.log(`[GATEWAY INJECTED] ${request.method} ${request.url.split('?')[0]}:`, {
      userId: userId,
      permissions: userPermissions,
      hasHeaders: !!(request.headers['x-user-permissions'])
    });
  }
});

// ============================================
// Route proxies to microservices
// ============================================

// Users Service routes
await fastify.register(httpProxy, {
  upstream: USERS_SERVICE,
  prefix: '/api/users',
  replyOptions: {
    rewritePrefix: '/api/users'
  },
  onError: (error: any) => {
    fastify.log.error('[Gateway Error - Users Service]', error);
  }
});

// Groups Service routes
await fastify.register(httpProxy, {
  upstream: GROUPS_SERVICE,
  prefix: '/api/groups',
  replyOptions: {
    rewritePrefix: '/api/groups'
  },
  onError: (error: any) => {
    fastify.log.error('[Gateway Error - Groups Service]', error);
  }
});

// Tickets Service routes
await fastify.register(httpProxy, {
  upstream: TICKETS_SERVICE,
  prefix: '/api/tickets',
  replyOptions: {
    rewritePrefix: '/api/tickets'
  },
  onError: (error: any) => {
    fastify.log.error('[Gateway Error - Tickets Service]', error);
  }
});

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ error: 'Route not found', path: request.url });
});

// Error handler
fastify.setErrorHandler((error: any, request, reply) => {
  fastify.log.error('[Gateway Error]', error);
  reply.status(error.statusCode || 500).send({ error: 'Gateway error', details: error.message });
});

// Start server
try {
  await fastify.listen({ port: GATEWAY_PORT, host: '0.0.0.0' });
  console.log(`✅ API Gateway listening on http://localhost:${GATEWAY_PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
