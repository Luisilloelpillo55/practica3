// USERS MICROSERVICE - User authentication and management
import express from 'express';
import cors from 'cors';
import supabasePool from '../shared-db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '../response-handler.js';
import { DEFAULT_PERMISSIONS } from '../permissions-definitions.js';

dotenv.config();

const app = express();
const USERS_PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secret-key-aqui-cambiar-en-produccion';

console.log('🚀 Users Service starting...');

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'users-service', status: 'OK', timestamp: new Date() });
});

// ============================================
// USER ENDPOINTS
// ============================================

// Register user
app.post('/register', async (req, res) => {
  const { usuario, email, password, fullname, address, dob, phone } = req.body || {};
  if (!usuario || !email || !password) {
    return res.status(400).json(errorResponse(400, 'USER_BAD_REQUEST', 'Missing required fields: usuario, email, password'));
  }

  try {
    // Check if user exists
    const checkResult = await supabasePool.query(
      'SELECT id FROM users WHERE usuario = $1 OR email = $2 LIMIT 1',
      [usuario, email]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json(errorResponse(409, 'USER_ALREADY_EXISTS', 'Usuario o email ya registrado'));
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Default permissions array (ALL action-based permissions)
    const defaultPermissions = DEFAULT_PERMISSIONS;

    // Insert user with default permissions
    const result = await supabasePool.query(
      `INSERT INTO users (usuario, email, password, fullname, address, dob, phone, permisos, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, usuario, email, fullname, address, dob, phone, permisos, is_admin, created_at`,
      [usuario, email, hashed, fullname || null, address || null, dob || null, phone || null, defaultPermissions, false]
    );

    const newUser = result.rows[0];

    // Return user data with permissions assigned
    res.status(201).json(successResponse({
      id: newUser.id,
      usuario: newUser.usuario,
      email: newUser.email,
      fullname: newUser.fullname,
      address: newUser.address,
      dob: newUser.dob,
      phone: newUser.phone,
      permisos: defaultPermissions,
      is_admin: newUser.is_admin,
      created_at: newUser.created_at,
      message: 'Usuario registrado exitosamente. Por favor inicia sesión.'
    }, 201, 'USER_REGISTER_SUCCESS'));
  } catch (error: any) {
    console.error('[Users Service Error]', error);
    res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', error.message));
  }
});

// Login user
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(401).json(errorResponse(401, 'USER_BAD_REQUEST', 'Username and password are required'));
  }

  try {
    console.log('🔐 [Users Service] Login attempt for user:', username);
    
    const result = await supabasePool.query(
      'SELECT id, usuario, email, password, fullname, address, dob, phone, permisos, is_admin, created_at FROM users WHERE usuario = $1 LIMIT 1',
      [username]
    );

    if (result.rows.length === 0) {
      console.warn('❌ [Users Service] User not found:', username);
      return res.status(401).json(errorResponse(401, 'USER_INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    const user = result.rows[0];
    console.log('✓ [Users Service] User found:', user.usuario, '(ID:', user.id, ')');
    
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.warn('❌ [Users Service] Password mismatch for user:', username);
      return res.status(401).json(errorResponse(401, 'USER_INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    console.log('✓ [Users Service] Password verified for:', username);

    // Get permissions from user record (stored as array) - action-based permissions
    const permissions = Array.isArray(user.permisos) ? user.permisos : [];
    console.log('✓ [Users Service] Permissions loaded:', permissions.length, 'items -', permissions);

    // Normalizar permisos para compatibilidad con el Gateway (ej: 'users:manage')
    const PERM_MAP: { [key: string]: string } = {
      'ticket_view': 'tickets:view',
      'ticket_create': 'tickets:add',
      'ticket_add': 'tickets:add',
      'ticket_edit': 'tickets:edit',
      'ticket_move': 'tickets:move',
      'ticket_delete': 'tickets:delete',
      'group_view': 'groups:view',
      'group_create': 'groups:create',
      'group_edit': 'groups:edit',
      'group_delete': 'groups:delete',
      'user_view': 'users:view',
      'user_edit': 'users:edit',
      'user_manage': 'users:manage',
      'user_delete': 'users:delete',
      'admin': 'admin'
    };

    const normalized = permissions.map((p: string) => PERM_MAP[p] || (p.includes(':') ? p : p));
    const tokenPermissions = Array.from(new Set([...(permissions || []), ...normalized]));

    // Generate JWT token with normalized permissions included
    const token = jwt.sign(
      {
        userId: user.id,
        usuario: user.usuario,
        email: user.email,
        permissions: tokenPermissions,
        is_admin: user.is_admin || false
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✓ [Users Service] JWT token generated for:', username, '(length:', token.length, ')');

    // Return user data (without password) + token
    const response = {
      id: user.id,
      usuario: user.usuario,
      email: user.email,
      fullname: user.fullname,
      address: user.address,
      dob: user.dob,
      phone: user.phone,
      permisos: permissions, // legacy
      is_admin: user.is_admin,
      created_at: user.created_at,
      token: token,
      permissions: tokenPermissions // include normalized permissions for clients
    };
    
    console.log('✓ [Users Service] Login successful! Returning:', {
      usuario: response.usuario,
      id: response.id,
      email: response.email,
      permissions: response.permissions,
      is_admin: response.is_admin,
      token_length: response.token.length
    });
    
    res.status(200).json(successResponse(response, 200, 'USER_LOGIN_SUCCESS'));
  } catch (error: any) {
    console.error('❌ [Users Service Error]', error);
    res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', error.message));
  }
});

// Get all users
app.get('/', async (req, res) => {
  try {
    const result = await supabasePool.query(
      'SELECT id, usuario, email, fullname, address, dob, phone, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(successResponse(result.rows, 200, 'USER_LOGIN_SUCCESS'));
  } catch (error: any) {
    console.error('❌ [Users Service] GET / error:', error);
    res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', error.message));
  }
});

// Get all available permissions
app.get('/permissions', async (req, res) => {
  try {
    const result = await supabasePool.query('SELECT id, nombre, descripcion FROM permissions ORDER BY nombre');
    res.json(successResponse(result.rows, 200, 'USER_LOGIN_SUCCESS'));
  } catch (error: any) {
    console.error('[Users Service] GET /permissions error:', error);
    res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', error.message));
  }
});

// Get user's permissions by user ID
app.get('/:id/permissions', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await supabasePool.query(
      'SELECT permisos FROM users WHERE id = $1 LIMIT 1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse(404, 'USER_NOT_FOUND', 'Usuario no encontrado'));
    }

    const permisos = result.rows[0].permisos || [];
    res.json(successResponse(permisos, 200, 'USER_LOGIN_SUCCESS'));
  } catch (error: any) {
    console.error('[Users Service] GET /:id/permissions error:', error);
    res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', error.message));
  }
});

// Get user by ID
app.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await supabasePool.query(
      'SELECT id, usuario, email, fullname, address, dob, phone, permisos, created_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse(404, 'USER_NOT_FOUND', 'Usuario no encontrado'));
    }

    res.json(successResponse(result.rows[0], 200, 'USER_LOGIN_SUCCESS'));
  } catch (error: any) {
    console.error('[Users Service Error]', error);
    res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', error.message));
  }
});

// Update user
app.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { fullname, address, phone } = req.body;

  try {
    const result = await supabasePool.query(
      `UPDATE users SET fullname = $1, address = $2, phone = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, usuario, email, fullname, address, dob, phone, updated_at`,
      [fullname, address, phone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse(404, 'USER_NOT_FOUND', 'Usuario no encontrado'));
    }

    res.json(successResponse(result.rows[0], 200, 'USER_LOGIN_SUCCESS'));
  } catch (error: any) {
    console.error('[Users Service Error]', error);
    res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', error.message));
  }
});

// Update user permissions
app.put('/:id/permissions', async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json(errorResponse(400, 'USER_BAD_REQUEST', 'permissions must be an array'));
  }

  try {
    console.log(`🔁 [Users Service] PUT /${id}/permissions - incoming permissions:`, permissions);

    // Normalize incoming permissions to legacy canonical ids (ticket_create, group_view, user_manage, ...)
    const reverseMap: { [key: string]: string } = {
      'tickets:add': 'ticket_create',
      'tickets:view': 'ticket_view',
      'tickets:edit': 'ticket_edit',
      'tickets:move': 'ticket_move',
      'tickets:delete': 'ticket_delete',
      'groups:view': 'group_view',
      'groups:create': 'group_create',
      'groups:edit': 'group_edit',
      'groups:delete': 'group_delete',
      'users:view': 'user_view',
      'users:edit': 'user_edit',
      'users:manage': 'user_manage',
      'users:delete': 'user_delete'
    };

    const normalizeToLegacy = (arr: any[]): string[] => {
      const out: string[] = [];
      for (let p of arr) {
        if (!p) continue;
        p = String(p).trim();
        const mapped = reverseMap[p] || p;
        // map alias ticket_add -> ticket_create as well
        if (mapped === 'ticket_add') continue;
        if (!out.includes(mapped)) out.push(mapped);
      }
      return out;
    };

    const permsToStore = normalizeToLegacy(permissions);
    console.log(`🔁 [Users Service] Normalized permissions to store for user ${id}:`, permsToStore);
    const result = await supabasePool.query(
      'UPDATE users SET permisos = $1, updated_at = NOW() WHERE id = $2 RETURNING id, usuario, permisos, is_admin, updated_at',
      [permsToStore, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse(404, 'USER_NOT_FOUND', 'Usuario no encontrado'));
    }

    console.log(`✅ [Users Service] Permissions updated for user ${id}:`, result.rows[0].permisos);

    // Si quien solicitó el cambio es el mismo usuario, emitir un nuevo JWT con permisos actualizados
    try {
      // Preferir identificar al requester por el token Authorization (más fiable que headers proxy)
      const authHeader = req.headers['authorization'] || (req.headers as any).Authorization || null;
      let requesterId: any = null;
      if (authHeader) {
        try {
          const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : String(authHeader);
          const decoded: any = jwt.verify(token, JWT_SECRET);
          requesterId = decoded?.userId || decoded?.id || null;
        } catch (e) {
          // ignore token parse errors
          requesterId = null;
        }
      }

      // Also accept gateway-injected header as fallback
      const headerRequester = req.headers['x-user-id'] || req.headers['x_user_id'] || req.headers['x-user'] || null;
      const requester = requesterId || headerRequester;

      if (requester && String(requester) === String(id)) {
        const updated = result.rows[0];
        // Map legacy -> action (tickets:add, groups:create, users:manage, ...)
        const legacyToAction: { [key: string]: string } = {
          'ticket_create': 'tickets:add',
          'ticket_view': 'tickets:view',
          'ticket_edit': 'tickets:edit',
          'ticket_move': 'tickets:move',
          'ticket_delete': 'tickets:delete',
          'group_view': 'groups:view',
          'group_create': 'groups:create',
          'group_edit': 'groups:edit',
          'group_delete': 'groups:delete',
          'user_view': 'users:view',
          'user_edit': 'users:edit',
          'user_manage': 'users:manage',
          'user_delete': 'users:delete'
        };

        const actionPerms = (updated.permisos || []).map((p: string) => legacyToAction[p] || p);
        const tokenPermissions = Array.from(new Set([...(updated.permisos || []), ...actionPerms]));

        const newToken = jwt.sign(
          {
            userId: updated.id,
            usuario: updated.usuario,
            permissions: tokenPermissions,
            is_admin: updated.is_admin || false
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        const payload = { ...updated, token: newToken, permissions: tokenPermissions };
        return res.json(successResponse(payload, 200, 'USER_PERMISSIONS_UPDATED'));
      }
    } catch (e) {
      console.warn('[Users Service] Could not generate new token after permissions update:', e?.message || e);
    }

    res.json(successResponse(result.rows[0], 200, 'USER_PERMISSIONS_UPDATED'));
  } catch (error: any) {
    console.error('[Users Service] PUT /:id/permissions error:', error);
    res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', error.message));
  }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Users Service Error]', err);
  res.status(500).json(errorResponse(500, 'USER_INTERNAL_ERROR', err.message));
});

app.listen(USERS_PORT, () => {
  console.log(`✅ Users Service listening on http://localhost:${USERS_PORT}`);
});
