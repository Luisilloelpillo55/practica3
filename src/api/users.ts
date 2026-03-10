import express from 'express';
import pool from './db.js';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken, loadPermissions, requirePermission } from './auth.js';

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
    
    // Cargar permisos del usuario
    const [permRows] = await pool.query(
      `SELECT p.nombre FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       WHERE up.user_id = ?`,
      [user.id]
    );
    // @ts-ignore
    const permissions = (permRows as any[]).map((r: any) => r.nombre);
    
    // remove password
    delete user.password;
    return res.json({ ...user, token, permissions });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, usuario, email, fullname, address, dob, phone, permiso, created_at FROM users');
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  const id = req.params.id;
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
router.put('/:id', async (req, res) => {
  const id = req.params.id;
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
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

export default router;
