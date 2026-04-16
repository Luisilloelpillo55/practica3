// API GATEWAY - Central routing point for all microservices (Fastify version)
import Fastify from 'fastify';
import httpProxy from '@fastify/http-proxy';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../response-handler.js';

dotenv.config();

const fastify = Fastify({ logger: true });
const GATEWAY_PORT = process.env.GATEWAY_PORT || 3008;
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secret-key-aqui-cambiar-en-produccion';

// Microservice URLs
const USERS_SERVICE = process.env['USERS_SERVICE_URL'] || 'http://localhost:3001';
const GROUPS_SERVICE = process.env['GROUPS_SERVICE_URL'] || 'http://localhost:3002';
const TICKETS_SERVICE = process.env['TICKETS_SERVICE_URL'] || 'http://localhost:3003';

console.log('🚀 API Gateway starting on Fastify...');
console.log(`   Users Service: ${USERS_SERVICE}`);
console.log(`   Groups Service: ${GROUPS_SERVICE}`);
console.log(`   Tickets Service: ${TICKETS_SERVICE}`);
console.log(`   Gateway Port: ${GATEWAY_PORT}`);

// Register CORS with explicit methods to allow PUT/DELETE
await fastify.register(cors, { 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type']
});

// ============================================
// PERMISSION MAP - Action-based permissions
// ============================================

const PERMISSION_ROUTES: { [key: string]: string } = {
  // Tickets
  'POST:/api/tickets': 'tickets:add',
  'PATCH:/api/tickets': 'tickets:edit',
  'PATCH:/api/tickets/*': 'tickets:edit',
  'DELETE:/api/tickets/*': 'tickets:delete',
  
  // Groups
  'POST:/api/groups': 'groups:create',
  'PATCH:/api/groups/*': 'groups:edit',
  'DELETE:/api/groups/*': 'groups:delete',
  
  // Users (admin only)
  'POST:/api/users': 'users:manage',
  'PUT:/api/users/*': 'users:manage',
  'DELETE:/api/users/*': 'users:manage',
};

// Public routes that don't require permission
const PUBLIC_ROUTES = [
  'POST:/api/users/register',
  'POST:/api/users/login',
  'GET:/health',
];

// ============================================
// AUTH AND PERMISSION MIDDLEWARE
// ============================================

// Auth middleware: Extract and validate JWT token
fastify.addHook('preHandler', async (request, reply) => {
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  // Extract route pattern
  const routePattern = `${request.method}:${request.url.split('?')[0]}`;
  const isPublic = PUBLIC_ROUTES.some(route => routePattern === route || routePattern.startsWith(route.replace('*', '')));
  
  // Public routes don't need token
  if (isPublic) {
    (request as any).user = null;
    (request as any).userId = null;
    (request as any).userPermissions = [];
    return;
  }
  
  // Protected routes: require token
  if (!token) {
    console.warn('⚠️ [GATEWAY] Unauthorized access attempt - No token:', routePattern);
    reply.status(401).send(errorResponse(401, 'USER_UNAUTHORIZED', 'Token requerido'));
    return;
  }
  
  try {
    // Verify JWT token
    const decoded: any = jwt.verify(token, JWT_SECRET) || jwt.decode(token);
    
    if (decoded && decoded.userId) {
      (request as any).user = decoded;
      (request as any).userId = decoded.userId;
      (request as any).userPermissions = decoded.permissions || [];
      
      console.log('✅ [GATEWAY AUTH] Token verified for user:', decoded.usuario);
    } else {
      throw new Error('Invalid token');
    }
  } catch (err) {
    console.warn('❌ [GATEWAY] Invalid token:', err);
    reply.status(401).send(errorResponse(401, 'USER_UNAUTHORIZED', 'Token inválido'));
    return;
  }
});

// Permission validation middleware
fastify.addHook('preHandler', async (request, reply) => {
  // Skip for public routes
  const routePattern = `${request.method}:${request.url.split('?')[0]}`;
  if (PUBLIC_ROUTES.some(route => routePattern === route || routePattern.startsWith(route.replace('*', '')))) {
    return;
  }
  
  // Check if route requires permission
  let requiredPermission: string | null = null;
  for (const [pattern, permission] of Object.entries(PERMISSION_ROUTES)) {
    if (pattern.includes('*')) {
      const [method, path] = pattern.split(':');
      const pathRegex = path.replace('*', '.*');
      if (request.method === method && new RegExp(`^${pathRegex}$`).test(request.url.split('?')[0])) {
        requiredPermission = permission;
        break;
      }
    } else if (`${request.method}:${request.url.split('?')[0]}` === pattern) {
      requiredPermission = permission;
      break;
    }
  }
  
  // If route requires permission, validate
  if (requiredPermission) {
    const userPermissions = (request as any).userPermissions || [];
    const hasPermission = userPermissions.includes(requiredPermission);
    
    if (!hasPermission) {
      console.warn('🚫 [GATEWAY] Permission denied:', {
        user: (request as any).userId,
        route: routePattern,
        required: requiredPermission,
        userHas: userPermissions
      });
      
      reply.status(403).send(errorResponse(403, 'USER_FORBIDDEN', `Permiso requerido: ${requiredPermission}`));
      return;
    }
    
    console.log('✅ [GATEWAY] Permission granted:', {
      user: (request as any).userId,
      route: routePattern,
      permission: requiredPermission
    });
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
// HEALTH CHECK
// ============================================

fastify.get('/health', async (request, reply) => {
  return { 
    status: 'Gateway OK',
    timestamp: new Date(),
    services: {
      users: USERS_SERVICE,
      groups: GROUPS_SERVICE,
      tickets: TICKETS_SERVICE
    }
  };
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

// ============================================
// ERROR HANDLERS
// ============================================

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send(errorResponse(404, 'NOT_FOUND', 'Ruta no encontrada'));
});

// Error handler
fastify.setErrorHandler((error: any, request, reply) => {
  fastify.log.error('[Gateway Error]', error);
  reply.status(error.statusCode || 500).send(errorResponse(error.statusCode || 500, 'INTERNAL_ERROR', error.message));
});

// ============================================
// START SERVER
// ============================================

try {
  await fastify.listen({ port: Number(GATEWAY_PORT), host: '0.0.0.0' });
  console.log(`✅ API Gateway listening on http://localhost:${GATEWAY_PORT}`);
  console.log('🔐 Permission validation: ENABLED');
  console.log('📊 Action-based permissions system active');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
