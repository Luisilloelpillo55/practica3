/**
 * Permisos por acción del sistema ERP
 * 
 * El sistema utiliza permisos basados en acciones (sin roles).
 * Cada usuario puede tener diferentes permisos en cada grupo.
 */

export interface PermissionDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'tickets' | 'groups' | 'users' | 'admin';
  icon: string;
}

export const PERMISSIONS: { [key: string]: PermissionDefinition } = {
  // Tickets permissions
  'tickets:view': {
    id: 'tickets:view',
    nombre: 'Ver Tickets',
    descripcion: 'Permiso para ver tickets en grupos',
    categoria: 'tickets',
    icon: 'pi-eye'
  },
  'tickets:add': {
    id: 'tickets:add',
    nombre: 'Agregar Tickets',
    descripcion: 'Permiso para crear nuevos tickets',
    categoria: 'tickets',
    icon: 'pi-plus'
  },
  'tickets:edit': {
    id: 'tickets:edit',
    nombre: 'Editar Tickets',
    descripcion: 'Permiso para editar detalles de tickets',
    categoria: 'tickets',
    icon: 'pi-pencil'
  },
  'tickets:move': {
    id: 'tickets:move',
    nombre: 'Mover Tickets',
    descripcion: 'Permiso para cambiar el estado de tickets',
    categoria: 'tickets',
    icon: 'pi-arrow-right'
  },
  'tickets:delete': {
    id: 'tickets:delete',
    nombre: 'Eliminar Tickets',
    descripcion: 'Permiso para eliminar tickets',
    categoria: 'tickets',
    icon: 'pi-trash'
  },

  // Groups permissions
  'groups:view': {
    id: 'groups:view',
    nombre: 'Ver Grupos',
    descripcion: 'Permiso para ver grupos/workspaces',
    categoria: 'groups',
    icon: 'pi-building'
  },
  'groups:create': {
    id: 'groups:create',
    nombre: 'Crear Grupos',
    descripcion: 'Permiso para crear nuevos grupos',
    categoria: 'groups',
    icon: 'pi-plus'
  },
  'groups:edit': {
    id: 'groups:edit',
    nombre: 'Editar Grupos',
    descripcion: 'Permiso para editar grupos',
    categoria: 'groups',
    icon: 'pi-pencil'
  },
  'groups:delete': {
    id: 'groups:delete',
    nombre: 'Eliminar Grupos',
    descripcion: 'Permiso para eliminar grupos',
    categoria: 'groups',
    icon: 'pi-trash'
  },
  'groups:manage': {
    id: 'groups:manage',
    nombre: 'Gestionar Grupos',
    descripcion: 'Permiso administrativo para gestionar todos los grupos',
    categoria: 'groups',
    icon: 'pi-cog'
  },

  // Users permissions
  'users:view': {
    id: 'users:view',
    nombre: 'Ver Usuarios',
    descripcion: 'Permiso para ver lista de usuarios',
    categoria: 'users',
    icon: 'pi-user'
  },
  'users:edit': {
    id: 'users:edit',
    nombre: 'Editar Usuarios',
    descripcion: 'Permiso para editar datos de usuarios',
    categoria: 'users',
    icon: 'pi-pencil'
  },
  'users:manage': {
    id: 'users:manage',
    nombre: 'Gestionar Usuarios',
    descripcion: 'Permiso administrativo para gestionar usuarios y permisos',
    categoria: 'users',
    icon: 'pi-cog'
  },

  // Admin permissions
  'admin:logs': {
    id: 'admin:logs',
    nombre: 'Ver Logs',
    descripcion: 'Permiso para ver logs de auditoría',
    categoria: 'admin',
    icon: 'pi-list'
  },
  'admin:metrics': {
    id: 'admin:metrics',
    nombre: 'Ver Métricas',
    descripcion: 'Permiso para ver métricas del sistema',
    categoria: 'admin',
    icon: 'pi-chart-bar'
  }
};

/**
 * Permisos por defecto para nuevos usuarios
 */
export const DEFAULT_PERMISSIONS: string[] = [
  'tickets:view',
  'tickets:add',
  'tickets:edit',
  'tickets:move',
  'tickets:delete',
  'groups:view',
  'groups:create',
  'groups:edit',
  'groups:delete',
  'users:view'
];

/**
 * Permisos para administrador (máximo acceso)
 */
export const ADMIN_PERMISSIONS: string[] = [
  'tickets:view', 'tickets:add', 'tickets:edit', 'tickets:move', 'tickets:delete',
  'groups:view', 'groups:create', 'groups:edit', 'groups:delete', 'groups:manage',
  'users:view', 'users:edit', 'users:manage',
  'admin:logs', 'admin:metrics'
];

/**
 * Obtiene todas las definiciones de permisos por categoría
 */
export function getPermissionsByCategory(category: 'tickets' | 'groups' | 'users' | 'admin'): PermissionDefinition[] {
  return Object.values(PERMISSIONS).filter(p => p.categoria === category);
}

/**
 * Obtiene la definición de un permiso
 */
export function getPermissionDefinition(permissionId: string): PermissionDefinition | undefined {
  return PERMISSIONS[permissionId];
}

/**
 * Valida si un string es un permiso válido
 */
export function isValidPermission(permission: string): boolean {
  return permission in PERMISSIONS;
}

export default {
  PERMISSIONS,
  DEFAULT_PERMISSIONS,
  ADMIN_PERMISSIONS,
  getPermissionsByCategory,
  getPermissionDefinition,
  isValidPermission
};
