import express from 'express';
import pool from './db.js';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken, loadPermissions, requirePermission, requireAdmin } from './auth.js';

const router = express.Router();

// Create user
router.post('/', async (req, res) => {
  const { usuario, email, password, fullname, address, dob, phone } = req.body || {};
  if (!usuario || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE usuario = ? OR email = ? LIMIT 1', [usuario, email]);
    // @ts-ignore
    if (Array.isArray(exists) && (exists as any).length) return res.status(409).json({ error: 'Usuario o email ya registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (usuario, email, password, fullname, address, dob, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [usuario, email, hashed, fullname || null, address || null, dob || null, phone || null],
    );
    // @ts-ignore
    const insertId = (result as any).insertId;
    
    // Asignar permisos por defecto al nuevo usuario
    try {
      // Assign only 'view' permissions by default (no create/edit)
      const defaultPermissions = ['group_view', 'ticket_view', 'user_view'];
      for (const perm of defaultPermissions) {
        await pool.query(
          `INSERT IGNORE INTO user_permissions (user_id, permission_id)
           SELECT ?, id FROM permissions WHERE nombre = ?`,
          [insertId, perm]
        );
      }
    } catch (pe) {
      console.warn('Warning: Could not assign default permissions (table may not exist)');
    }
    
    const [rows] = await pool.query('SELECT id, usuario, email, fullname, address, dob, phone, permiso, created_at FROM users WHERE id = ? LIMIT 1', [insertId]);
    // @ts-ignore
    return res.status(201).json((rows as any)[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE usuario = ? LIMIT 1', [username]);
    // @ts-ignore
    const user = Array.isArray(rows) && (rows as any)[0] ? (rows as any)[0] : null;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Generar JWT
    const token = generateToken(user.id, user.usuario);
    
    // Cargar permisos del usuario: soportar users.permissions (JSON/text), permiso numérico, o user_permissions legacy
    let permissions: string[] = [];
    try {
      // Check if users.permissions column exists before selecting it
      const [colInfo] = await pool.query(
        `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'permissions'`
      );
      // @ts-ignore
      const hasPermissionsCol = Array.isArray(colInfo) && (colInfo as any)[0] && (colInfo as any)[0].cnt > 0;

      let uRec: any = null;
      if (hasPermissionsCol) {
        const [userRows] = await pool.query('SELECT permiso, permissions FROM users WHERE id = ? LIMIT 1', [user.id]);
        // @ts-ignore
        uRec = Array.isArray(userRows) && (userRows as any)[0] ? (userRows as any)[0] : null;
      } else {
        const [userRows] = await pool.query('SELECT permiso FROM users WHERE id = ? LIMIT 1', [user.id]);
        // @ts-ignore
        uRec = Array.isArray(userRows) && (userRows as any)[0] ? (userRows as any)[0] : null;
      }

      if (uRec && uRec.permissions) {
        try {
          if (typeof uRec.permissions === 'string') permissions = JSON.parse(uRec.permissions);
          else if (Array.isArray(uRec.permissions)) permissions = uRec.permissions;
        } catch (pe) {
          console.warn('Could not parse users.permissions JSON, falling back to legacy table');
        }
      }

      // If permiso numeric indicates admin (2), grant all permissions
      if ((!permissions || permissions.length === 0) && uRec && (uRec.permiso === 2 || String(uRec.permiso) === '2')) {
        const [all] = await pool.query('SELECT nombre FROM permissions');
        // @ts-ignore
        permissions = Array.isArray(all) ? (all as any[]).map((r: any) => r.nombre) : [];
      }

      // Fallback to legacy user_permissions table
      if (!permissions || permissions.length === 0) {
        try {
          const [permRows] = await pool.query(
            `SELECT p.nombre FROM user_permissions up
             JOIN permissions p ON up.permission_id = p.id
             WHERE up.user_id = ?`,
            [user.id]
          );
          // @ts-ignore
          permissions = (permRows as any[]).map((r: any) => r.nombre);
        } catch (pe) {
          console.warn('Warning: Could not load permissions from DB');
        }
      }
    } catch (e) {
      console.error('Failed to load user permissions, falling back to defaults:', e);
    }

    // Si todavía no hay permisos, asignar permisos por defecto (solo view)
    if (!permissions || permissions.length === 0) {
      permissions = ['group_view', 'ticket_view', 'user_view'];
    }
    
    // remove password
    delete user.password;
    return res.json({ ...user, token, permissions });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Get all users (requires 'user_view' permission)
router.get('/', verifyToken, loadPermissions, requirePermission('user_view'), async (req, res) => {
  try {
    // No asumimos que la columna `is_admin` exista en todas las instalaciones.
    const [rows] = await pool.query('SELECT id, usuario, email, fullname, address, dob, phone, permiso, created_at FROM users');
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Get all available permissions
router.get('/permissions', verifyToken, loadPermissions, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, descripcion FROM permissions ORDER BY nombre');
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Get permissions for a specific user
router.get('/:id/permissions', verifyToken, loadPermissions, requireAdmin, async (req, res) => {
  const id = req.params['id'];
  try {
    const [rows] = await pool.query(
      `SELECT p.nombre FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       WHERE up.user_id = ?`,
      [id]
    );
    // @ts-ignore
    const perms = Array.isArray(rows) ? (rows as any[]).map((r: any) => r.nombre) : [];
    return res.json(perms);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Replace permissions for a specific user
router.put('/:id/permissions', verifyToken, loadPermissions, requireAdmin, async (req, res) => {
  const id = req.params['id'];
  const { permissions } = req.body || {};
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'Invalid payload' });
  try {
    await pool.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);
    for (const nombre of permissions) {
      await pool.query(
        `INSERT IGNORE INTO user_permissions (user_id, permission_id)
         SELECT ?, id FROM permissions WHERE nombre = ?`,
        [id, nombre]
      );
    }
    // Also update users.permissions JSON column if present
    try {
      await pool.query('UPDATE users SET permissions = ? WHERE id = ?', [JSON.stringify(permissions), id]);
    } catch (e) { /* ignore if column not present */ }
    const [rows] = await pool.query('SELECT id, usuario, email, fullname, address, dob, phone, created_at FROM users WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    return res.json((rows as any)[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Get single user
router.get('/:id', verifyToken, loadPermissions, async (req, res) => {
  const id = req.params['id'];
  try {
    const [rows] = await pool.query('SELECT id, usuario, email, fullname, address, dob, phone, permiso, created_at FROM users WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    if (!Array.isArray(rows) || !(rows as any).length) return res.status(404).json({ error: 'Not found' });
    // @ts-ignore
    return res.json((rows as any)[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Update user
router.put('/:id', verifyToken, loadPermissions, async (req, res) => {
  const id = req.params['id'];
  const { usuario, email, password, fullname, address, dob, phone } = req.body || {};
  try {
    let hashed = null;
    if (password) hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET usuario = ?, email = ?, password = COALESCE(?, password), fullname = ?, address = ?, dob = ?, phone = ? WHERE id = ?', [
      usuario,
      email,
      hashed,
      fullname,
      address,
      dob,
      phone,
      id,
    ]);
    const [rows] = await pool.query('SELECT id, usuario, email, fullname, address, dob, phone, created_at FROM users WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    return res.json((rows as any)[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Delete user
router.delete('/:id', verifyToken, loadPermissions, async (req, res) => {
  const id = req.params['id'];
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

export default router;
