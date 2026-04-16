// USERS MICROSERVICE - User authentication and management
import express from 'express';
import cors from 'cors';
import supabasePool from '../shared-db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if user exists
    const checkResult = await supabasePool.query(
      'SELECT id FROM users WHERE usuario = $1 OR email = $2 LIMIT 1',
      [usuario, email]
    );

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: 'User or email already registered' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Default permissions array (all except admin and user_view)
    const defaultPermissions = [
      'ticket_view', 'ticket_create', 'ticket_edit', 'ticket_move', 'ticket_delete',
      'group_view', 'group_create', 'group_edit', 'group_delete'
    ];

    // Insert user with default permissions
    const result = await supabasePool.query(
      `INSERT INTO users (usuario, email, password, fullname, address, dob, phone, permisos, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, usuario, email, fullname, address, dob, phone, permisos, is_admin, created_at`,
      [usuario, email, hashed, fullname || null, address || null, dob || null, phone || null, defaultPermissions, false]
    );

    const newUser = result.rows[0];

    // Return user data with permissions assigned
    res.status(201).json({
      ...newUser,
      permisos: defaultPermissions,
      message: 'Usuario registrado exitosamente. Por favor inicia sesión.'
    });
  } catch (error: any) {
    console.error('[Users Service Error]', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Login user
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    console.log('🔐 [Users Service] Login attempt for user:', username);
    
    const result = await supabasePool.query(
      'SELECT id, usuario, email, password, fullname, address, dob, phone, permisos, is_admin, created_at FROM users WHERE usuario = $1 LIMIT 1',
      [username]
    );

    if (result.rows.length === 0) {
      console.warn('❌ [Users Service] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('✓ [Users Service] User found:', user.usuario, '(ID:', user.id, ')');
    
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.warn('❌ [Users Service] Password mismatch for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✓ [Users Service] Password verified for:', username);

    // Get permissions from user record (stored as array)
    const permissions = Array.isArray(user.permisos) ? user.permisos : [];
    console.log('✓ [Users Service] Permissions loaded:', permissions.length, 'items -', permissions);

    // Generate JWT token with permissions
    const token = jwt.sign(
      {
        userId: user.id,
        usuario: user.usuario,
        email: user.email,
        permissions: permissions,
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
      permisos: permissions,
      is_admin: user.is_admin,
      created_at: user.created_at,
      token: token,
      permissions: permissions
    };
    
    console.log('✓ [Users Service] Login successful! Returning:', {
      usuario: response.usuario,
      id: response.id,
      email: response.email,
      permissions: response.permissions,
      is_admin: response.is_admin,
      token_length: response.token.length
    });
    
    res.json(response);
  } catch (error: any) {
    console.error('❌ [Users Service Error]', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Get all users
app.get('/', async (req, res) => {
  try {
    const result = await supabasePool.query(
      'SELECT id, usuario, email, fullname, address, dob, phone, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('❌ [Users Service] GET / error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Get all available permissions
app.get('/permissions', async (req, res) => {
  try {
    const result = await supabasePool.query('SELECT id, nombre, descripcion FROM permissions ORDER BY nombre');
    res.json(result.rows);
  } catch (error: any) {
    console.error('[Users Service] GET /permissions error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
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
      return res.status(404).json({ error: 'User not found' });
    }

    const permisos = result.rows[0].permisos || [];
    res.json(permisos);
  } catch (error: any) {
    console.error('[Users Service] GET /:id/permissions error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
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
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[Users Service Error]', error);
    res.status(500).json({ error: 'Database error', details: error.message });
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
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[Users Service Error]', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Update user permissions
app.put('/:id/permissions', async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'permissions must be an array' });
  }

  try {
    const result = await supabasePool.query(
      'UPDATE users SET permisos = $1, updated_at = NOW() WHERE id = $2 RETURNING id, usuario, permisos, updated_at',
      [permissions, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[Users Service] PUT /:id/permissions error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Users Service Error]', err);
  res.status(500).json({ error: 'Service error', details: err.message });
});

app.listen(USERS_PORT, () => {
  console.log(`✅ Users Service listening on http://localhost:${USERS_PORT}`);
});
