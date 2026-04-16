/**
 * Response Handler para estandarizar todas las respuestas en el esquema JSON universal
 * 
 * Esquema:
 * {
 *   "statusCode": 200,
 *   "intOpCode": "SxUS200",
 *   "data": {...}
 * }
 */

export interface ApiResponse<T = any> {
  statusCode: number;
  intOpCode: string;
  data?: T;
  error?: string;
}

// Códigos de operación interna (intOpCode)
const OP_CODES: { [key: string]: string } = {
  // User operations
  'USER_LOGIN_SUCCESS': 'SxUS200',
  'USER_REGISTER_SUCCESS': 'SxUS201',
  'USER_NOT_FOUND': 'SxUS404',
  'USER_INVALID_CREDENTIALS': 'SxUS401',
  'USER_ALREADY_EXISTS': 'SxUS409',
  'USER_BAD_REQUEST': 'SxUS400',
  'USER_UNAUTHORIZED': 'SxUS401',
  'USER_FORBIDDEN': 'SxUS403',
  'USER_INTERNAL_ERROR': 'SxUS500',

  // Ticket operations
  'TICKET_CREATED': 'SxTK201',
  'TICKET_UPDATED': 'SxTK200',
  'TICKET_DELETED': 'SxTK200',
  'TICKET_FETCHED': 'SxTK200',
  'TICKET_NOT_FOUND': 'SxTK404',
  'TICKET_BAD_REQUEST': 'SxTK400',
  'TICKET_FORBIDDEN': 'SxTK403',
  'TICKET_INTERNAL_ERROR': 'SxTK500',

  // Group operations
  'GROUP_CREATED': 'SxGRP201',
  'GROUP_UPDATED': 'SxGRP200',
  'GROUP_DELETED': 'SxGRP200',
  'GROUP_FETCHED': 'SxGRP200',
  'GROUP_NOT_FOUND': 'SxGRP404',
  'GROUP_BAD_REQUEST': 'SxGRP400',
  'GROUP_FORBIDDEN': 'SxGRP403',
  'GROUP_INTERNAL_ERROR': 'SxGRP500',

  // General operations
  'BAD_REQUEST': 'SxERR400',
  'UNAUTHORIZED': 'SxERR401',
  'FORBIDDEN': 'SxERR403',
  'NOT_FOUND': 'SxERR404',
  'CONFLICT': 'SxERR409',
  'RATE_LIMIT': 'SxERR429',
  'INTERNAL_ERROR': 'SxERR500',
};

/**
 * Crea una respuesta de éxito estandarizada
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  opCode: string = 'SxSUC200'
): ApiResponse<T> {
  return {
    statusCode,
    intOpCode: OP_CODES[opCode] || opCode,
    data,
  };
}

/**
 * Crea una respuesta de error estandarizada
 */
export function errorResponse(
  statusCode: number = 500,
  opCode: string = 'INTERNAL_ERROR',
  error: string = 'An error occurred'
): ApiResponse {
  return {
    statusCode,
    intOpCode: OP_CODES[opCode] || opCode,
    error,
  };
}

/**
 * Mapper para convenir respuestas Express a formato estandarizado
 */
export function formatResponse(res: any, statusCode: number, opCode: string, data?: any, error?: string) {
  res.status(statusCode).json(
    error
      ? errorResponse(statusCode, opCode, error)
      : successResponse(data, statusCode, opCode)
  );
}

export default {
  successResponse,
  errorResponse,
  formatResponse,
  OP_CODES,
};
