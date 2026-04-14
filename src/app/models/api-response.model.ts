/**
 * Esquema de respuesta JSON universal para toda la aplicación.
 * Todos los microservicios y API Gateway deben devolver este formato.
 * 
 * Ejemplo:
 * {
 *   "statusCode": 200,
 *   "intOpCode": "SxUS200",
 *   "data": [{ id: 1, name: "Ticket 1" }, ...]
 * }
 */
export interface ApiResponse<T = any> {
  /**
   * Código HTTP semántico (200, 400, 403, 404, 500, etc.)
   */
  statusCode: number;

  /**
   * Código de operación interno del sistema.
   * Ejemplos:
   * - SxUS200: Operación de usuario exitosa
   * - SxUS400: Error de validación
   * - SxUS403: Permiso denegado
   * - SxUS404: Recurso no encontrado
   * - SxUS500: Error interno del servidor
   * - SxTK200: Operación de ticket exitosa
   * - SxGR200: Operación de grupo exitosa
   */
  intOpCode: string;

  /**
   * Payload de la respuesta.
   * Puede ser:
   * - Array de objetos: cuando devuelve una lista
   * - Objeto único: cuando devuelve un recurso específico
   * - null: cuando no hay datos que devolver
   */
  data: T;

  /**
   * Mensaje de error (opcional, incluido en casos de error)
   */
  error?: string;

  /**
   * Detalles adicionales de error (opcional)
   */
  details?: any;
}

/**
 * Códigos de operación internos estándar
 */
export const INTERNAL_OP_CODES = {
  // Usuario (SxUS)
  USER_SUCCESS: 'SxUS200',
  USER_CREATED: 'SxUS201',
  USER_BAD_REQUEST: 'SxUS400',
  USER_UNAUTHORIZED: 'SxUS401',
  USER_FORBIDDEN: 'SxUS403',
  USER_NOT_FOUND: 'SxUS404',
  USER_CONFLICT: 'SxUS409',
  USER_SERVER_ERROR: 'SxUS500',

  // Ticket (SxTK)
  TICKET_SUCCESS: 'SxTK200',
  TICKET_CREATED: 'SxTK201',
  TICKET_BAD_REQUEST: 'SxTK400',
  TICKET_UNAUTHORIZED: 'SxTK401',
  TICKET_FORBIDDEN: 'SxTK403',
  TICKET_NOT_FOUND: 'SxTK404',
  TICKET_SERVER_ERROR: 'SxTK500',

  // Grupo (SxGR)
  GROUP_SUCCESS: 'SxGR200',
  GROUP_CREATED: 'SxGR201',
  GROUP_BAD_REQUEST: 'SxGR400',
  GROUP_UNAUTHORIZED: 'SxGR401',
  GROUP_FORBIDDEN: 'SxGR403',
  GROUP_NOT_FOUND: 'SxGR404',
  GROUP_SERVER_ERROR: 'SxGR500',

  // API Gateway (SxGW)
  GATEWAY_RATE_LIMIT: 'SxGW429',
  GATEWAY_BAD_REQUEST: 'SxGW400',
  GATEWAY_UNAUTHORIZED: 'SxGW401',
  GATEWAY_FORBIDDEN: 'SxGW403',
  GATEWAY_SERVER_ERROR: 'SxGW500',
};

/**
 * Modelo de usuario con permisos por grupo
 */
export interface UserModel {
  id: string;
  usuario: string;
  email: string;
  token: string;
  permissionsByGroup: {
    [groupId: string]: string[];
  };
  defaultGroupId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Modelo de grupo/workspace
 */
export interface GroupModel {
  id: string;
  nombre: string;
  descripcion?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Modelo de ticket
 */
export interface TicketModel {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: 'todo' | 'in-progress' | 'done';
  prioridad: 'low' | 'medium' | 'high';
  asignadoA?: string;
  groupId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Modelo de permiso
 */
export interface PermissionModel {
  id: string;
  userId: string;
  groupId: string;
  permiso: string; // ej: "tickets:add", "tickets:move", "groups:manage"
  createdAt: Date;
}
