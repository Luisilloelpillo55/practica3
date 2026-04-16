import express from 'express';
import pool from './db.js';
import { verifyToken, loadPermissions, requirePermission } from './auth.js';

const router = express.Router();

// Create group
router.post('/', async (req, res) => {
  const { nivel, autor, nombre, integrantes, tickets, descripcion } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'Missing fields' });
  try {
    const integ = integrantes ? JSON.stringify(integrantes) : JSON.stringify([]);
    const [result] = await pool.query(
      'INSERT INTO groups (nivel, autor, nombre, integrantes, tickets, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
      [nivel || null, autor || null, nombre, integ, tickets || 0, descripcion || null],
    );
    // @ts-ignore
    const insertId = (result as any).insertId;
    const [rows] = await pool.query('SELECT * FROM groups WHERE id = ? LIMIT 1', [insertId]);
    // @ts-ignore
    return res.status(201).json((rows as any)[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Get all groups
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM groups ORDER BY created_at DESC');
    // @ts-ignore
    const mapped = (rows as any).map((g: any) => ({ ...g, integrantes: g.integrantes ? JSON.parse(g.integrantes) : [] }));
    return res.json(mapped);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Get single group
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM groups WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    if (!Array.isArray(rows) || !(rows as any).length) return res.status(404).json({ error: 'Not found' });
    // @ts-ignore
    const g = (rows as any)[0];
    g.integrantes = g.integrantes ? JSON.parse(g.integrantes) : [];
    return res.json(g);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Update group
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { nivel, autor, nombre, integrantes, tickets, descripcion } = req.body || {};
  try {
    const integ = integrantes ? JSON.stringify(integrantes) : JSON.stringify([]);
    await pool.query('UPDATE groups SET nivel = ?, autor = ?, nombre = ?, integrantes = ?, tickets = ?, descripcion = ? WHERE id = ?', [
      nivel || null,
      autor || null,
      nombre,
      integ,
      tickets || 0,
      descripcion || null,
      id,
    ]);
    const [rows] = await pool.query('SELECT * FROM groups WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    const g = (rows as any)[0];
    g.integrantes = g.integrantes ? JSON.parse(g.integrantes) : [];
    return res.json(g);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Delete group
router.delete('/:id', async (req, res) => {
  const id = req.params['id'];
  try {
    await pool.query('DELETE FROM groups WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// Tickets for a group (route added here)
router.get('/:id/tickets', verifyToken, loadPermissions, requirePermission('ticket_view'), async (req, res) => {
  const id = req.params['id'];
  try {
    const [rows] = await pool.query('SELECT id, group_id, titulo, descripcion, estado, priority, created_by, created_at FROM tickets WHERE group_id = ? ORDER BY created_at DESC', [id]);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

export default router;
