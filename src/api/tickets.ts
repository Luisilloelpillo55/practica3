import express from 'express';
import pool from './db.js';
import { verifyToken, loadPermissions, requirePermission } from './auth.js';

const router = express.Router();

// GET all tickets (requiere token)
router.get('/', verifyToken, loadPermissions, async (req, res) => {
  try {
    const [tickets] = await pool.query(
      'SELECT id, group_id, titulo, descripcion, estado, created_by, created_at FROM tickets ORDER BY created_at DESC'
    );
    return res.json(tickets);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db error' });
  }
});

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
router.put('/:id', verifyToken, loadPermissions, async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, estado } = req.body || {};
  // permitir que usuarios con permiso 'ticket_edit' o 'ticket_move' actualicen el estado
  const perms = Array.isArray((req as any).permissions) ? (req as any).permissions : [];
  if (!perms.includes('ticket_edit') && !perms.includes('ticket_move')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const [ticketRows] = await pool.query('SELECT * FROM tickets WHERE id = ? LIMIT 1', [id]);
    // @ts-ignore
    const ticket = (ticketRows as any)[0];
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Usar valores existentes si no se proporcionan en el payload
    const newTitulo = typeof titulo !== 'undefined' && titulo !== null ? titulo : ticket.titulo;
    const newDescripcion = typeof descripcion !== 'undefined' ? descripcion : ticket.descripcion;
    const newEstado = typeof estado !== 'undefined' && estado !== null ? estado : ticket.estado;

    await pool.query(
      'UPDATE tickets SET titulo = ?, descripcion = ?, estado = ? WHERE id = ?',
      [newTitulo, newDescripcion || null, newEstado || 'abierto', id]
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
