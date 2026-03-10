import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env['JWT_SECRET'] || 'tu-secreto-super-seguro-cambiar-en-produccion';

// Extender tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      permissions?: string[];
    }
  }
}

// Generar JWT
export function generateToken(userId: number, usuario: string): string {
  return jwt.sign({ id: userId, usuario }, JWT_SECRET, { expiresIn: '24h' });
}

// Middleware: Verificar JWT
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware: Cargar permisos del usuario
export async function loadPermissions(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT p.nombre FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       WHERE up.user_id = ?`,
      [req.user.id]
    );
    // @ts-ignore
    req.permissions = (rows as any[]).map((r: any) => r.nombre);
    return next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error loading permissions' });
  }
}

// Helper: Verificar si usuario tiene permiso
export function hasPermission(permissions: string[], required: string | string[]): boolean {
  const perms = Array.isArray(required) ? required : [required];
  return perms.some(perm => permissions.includes(perm));
}

// Middleware genérico para proteger ruta con permiso
export function requirePermission(requiredPermissions: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.permissions || !hasPermission(req.permissions, requiredPermissions)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}
