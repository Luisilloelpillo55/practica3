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

// Generar JWT (incluye permisos en el payload)
export function generateToken(userId: number, usuario: string, permissions: string[] = []): string {
  return jwt.sign({ userId, usuario, permissions }, JWT_SECRET, { expiresIn: '24h' });
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
    const userId = req.user.userId || req.user.id; // Support both field names

    // Try to load user with permissions
    const [userRows] = await pool.query(
      'SELECT permiso, permissions FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    // @ts-ignore
    const userRec = Array.isArray(userRows) && userRows[0] ? userRows[0] : null;

    if (!userRec) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If there's an explicit JSON/text `permissions` column, use it
    if (userRec && userRec.permissions) {
      try {
        if (typeof userRec.permissions === 'string') {
          req.permissions = JSON.parse(userRec.permissions);
        } else if (Array.isArray(userRec.permissions)) {
          req.permissions = userRec.permissions;
        } else {
          req.permissions = [];
        }
        return next();
      } catch (e) {
        console.warn('Could not parse users.permissions JSON, falling back to legacy table');
      }
    }

    // If there is a numeric permiso flag and it's 2 (admin), grant all permissions
    if (userRec && (userRec.permiso === 2 || String(userRec.permiso) === '2')) {
      const [all] = await pool.query('SELECT nombre FROM permissions');
      // @ts-ignore
      req.permissions = Array.isArray(all) ? (all as any[]).map((r: any) => r.nombre) : [];
      return next();
    }

    // Fallback: legacy user_permissions join
    const [rows] = await pool.query(
      `SELECT p.nombre FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       WHERE up.user_id = ?`,
      [userId]
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

// Middleware: Verificar si usuario es administrador
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  // Verificar si el usuario es admin
  // Por ahora, asumimos que los usuarios con permiso user_delete son admins
  // O podemos cargar el flag is_admin de la BD
  if (!req.permissions || !req.permissions.includes('user_delete')) {
    return res.status(403).json({ error: 'Only administrators can access this resource' });
  }
  
  return next();
}
