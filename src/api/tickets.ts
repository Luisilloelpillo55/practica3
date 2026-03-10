import express from 'express';
import pool from './db.js';
import { verifyToken, loadPermissions, requirePermission } from './auth.js';

const router = express.Router();

// GET all tickets for a group (público, requiere token)
router.get('/group/:groupId', verifyToken, loadPermissions, async (req, res) => {
  const { groupId } = req.params;
  try {
    const [tickets] = await pool.query(
      'SELECT id, group_id, titulo, descripcion, estado, created_by, created_at FROM tickets WHERE group_id = ? ORDER BY created_at DESC',
      [groupId]
    );
    return res.json(tickets);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// GET single ticket
router.get('/:id', verifyToken, loadPermissions, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tickets WHERE id = ? LIMIT 1',
      [id]
    );
    // @ts-ignore
    const ticket = Array.isArray(rows) && (rows as any)[0] ? (rows as any)[0] : null;
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    return res.json(ticket);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// CREATE ticket (requiere permisos)
router.post('/', verifyToken, loadPermissions, requirePermission('ticket_create'), async (req, res) => {
  const { group_id, titulo, descripcion, estado } = req.body || {};
  if (!group_id || !titulo) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [result] = await pool.query(
      'INSERT INTO tickets (group_id, titulo, descripcion, estado, created_by) VALUES (?, ?, ?, ?, ?)',
      [group_id, titulo, descripcion || null, estado || 'abierto', req.user.id]
    );
    // @ts-ignore
    const ticketId = (result as any).insertId;
    const [rows] = await pool.query('SELECT * FROM tickets WHERE id = ? LIMIT 1', [ticketId]);
    // @ts-ignore
    return res.status(201).json((rows as any)[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// UPDATE ticket (requiere permisos)
router.put('/:id', verifyToken, loadPermissions, requirePermission('ticket_edit'), async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, estado } = req.body || {};
  if (!titulo) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [ticketRows] = await pool.query('SELECT created_by FROM tickets WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    const ticket = (ticketRows as any)[0];
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await pool.query(
      'UPDATE tickets SET titulo = ?, descripcion = ?, estado = ? WHERE id = ?',
      [titulo, descripcion || null, estado || 'abierto', id]
    );
    const [rows] = await pool.query('SELECT * FROM tickets WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    return res.json((rows as any)[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

// DELETE ticket (requiere permisos)
router.delete('/:id', verifyToken, loadPermissions, requirePermission('ticket_delete'), async (req, res) => {
  const { id } = req.params;
  try {
    const [ticketRows] = await pool.query('SELECT id FROM tickets WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    if (!Array.isArray(ticketRows) || (ticketRows as any).length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
    return res.json({ message: 'Ticket deleted' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

export default router;
