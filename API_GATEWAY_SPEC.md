# Estructura del API Gateway y Endpoints

Este documento describe los endpoints necesarios, validaciones y estructura del API Gateway.

## 🏗️ Arquitectura de Microservicios

```
┌─────────────────────────────────────────────────────┐
│           Frontend Angular                           │
│    (PermissionService, HasPermissionDirective)       │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTP REST
                     │
┌────────────────────▼────────────────────────────────┐
│         API Gateway (Fastify)                        │
│  - Validación JWT                                    │
│  - Verificación de permisos                          │
│  - Rate limiting                                     │
│  - Logging centralizados                             │
└───┬───────────────┬──────────────────┬──────────────┘
    │               │                  │
    │               │                  │
┌───▼──┐     ┌──────▼────┐     ┌──────▼────┐
│Users │     │  Groups    │     │  Tickets   │
│(UP2U)│     │   (UP2U)   │     │  (Fastify) │
└────┬─┘     └──────┬─────┘     └──────┬─────┘
     │              │                  │
     └──────────────┴──────────────────┘
              │
              │ (Supabase)
              │
          ┌───▼─────────────┐
          │ Supabase        │
          │ - PostgreSQL    │
          │ - Auth          │
          │ - Storage       │
          └─────────────────┘
```

## 📡 Endpoints del API Gateway

Todos los endpoints pasan obligatoriamente por el API Gateway.

### 🔐 Autenticación (sin requiere permisos previos)

#### POST /api/users/register
**Descripción**: Registrar nuevo usuario

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "usuario": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "passwordConfirm": "SecurePass123!"
}
```

**Validaciones**:
- `usuario`: requerido, 3-50 caracteres, solo alfanuméricos y guiones
- `email`: requerido, válido formato email, único
- `password`: requerido, mínimo 8 caracteres, debe contener mayúscula, minúscula, número
- Confirmar que `password === passwordConfirm`

**Respuesta exitosa (201)**:
```json
{
  "statusCode": 201,
  "intOpCode": "SxUS201",
  "data": {
    "id": "uuid-xxx",
    "usuario": "john_doe",
    "email": "john@example.com",
    "message": "Usuario registrado exitosamente"
  }
}
```

**Respuesta error**:
```json
{
  "statusCode": 400,
  "intOpCode": "SxUS400",
  "data": null,
  "error": "El usuario ya existe"
}
```

---

#### POST /api/users/login
**Descripción**: Login y obtener JWT + permisos

**Body**:
```json
{
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Respuesta exitosa (200)**:
```json
{
  "statusCode": 200,
  "intOpCode": "SxUS200",
  "data": {
    "usuario": "john_doe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "permissionsByGroup": {
      "group-123": ["tickets:add", "tickets:move", "tickets:delete"],
      "group-456": ["tickets:add"]
    },
    "defaultGroupId": "group-123"
  }
}
```

**El token JWT debe incluir**:
```json
{
  "sub": "user-id-uuid",
  "usuario": "john_doe",
  "email": "john@example.com",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

### 🎫 Tickets (requieren autenticación y permisos)

#### GET /api/tickets
**Descripción**: Obtener tickets del grupo actual

**Headers**:
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Query params**:
- `groupId` (requerido): UUID del grupo
- `estado` (opcional): "todo", "in-progress", "done"
- `prioridad` (opcional): "low", "medium", "high"
- `page` (opcional, default=1): número de página
- `limit` (opcional, default=20): items por página

**Respuesta (200)**:
```json
{
  "statusCode": 200,
  "intOpCode": "SxTK200",
  "data": [
    {
      "id": "ticket-uuid-1",
      "titulo": "Implementar login",
      "descripcion": "...",
      "estado": "in-progress",
      "prioridad": "high",
      "asignadoA": "user-uuid-1",
      "groupId": "group-123",
      "createdBy": "user-uuid-2",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-16T14:20:00Z"
    }
  ]
}
```

**Validación de permisos**: No requiere permiso específico (todos pueden ver)

---

#### POST /api/tickets
**Descripción**: Crear nuevo ticket

**Headers**:
```json
{
  "Authorization": "Bearer ...",
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "titulo": "Implementar dashboard",
  "descripcion": "Crear componente dashboard con estadísticas",
  "prioridad": "medium",
  "groupId": "group-123"
}
```

**Validaciones**:
- `titulo`: requerido, 5-255 caracteres
- `descripcion`: opcional, máximo 2000 caracteres
- `prioridad`: requerido, uno de: "low", "medium", "high"
- `groupId`: requerido, debe existir y usuario debe pertenecer

**Validación de permisos**: Requiere "tickets:add" en el grupo

**Respuesta (201)**:
```json
{
  "statusCode": 201,
  "intOpCode": "SxTK201",
  "data": {
    "id": "ticket-uuid-new",
    "titulo": "Implementar dashboard",
    "estado": "todo",
    "createdBy": "auth-user-id"
  }
}
```

**Error si no tiene permiso (403)**:
```json
{
  "statusCode": 403,
  "intOpCode": "SxTK403",
  "data": null,
  "error": "No tienes permiso para crear tickets en este grupo"
}
```

---

#### PATCH /api/tickets/:id/status
**Descripción**: Cambiar estado de un ticket

**Body**:
```json
{
  "estado": "in-progress"
}
```

**Validaciones**:
- `estado`: requerido, uno de: "todo", "in-progress", "done"

**Validación de permisos**: 
- Requiere "tickets:move"
- El ticket debe estar asignado al usuario que lo mueve (o ser admin)

**Respuesta (200)**:
```json
{
  "statusCode": 200,
  "intOpCode": "SxTK200",
  "data": {
    "id": "ticket-uuid",
    "estado": "in-progress",
    "updatedAt": "2025-01-16T15:45:00Z"
  }
}
```

---

### 👥 Usuarios (requieren autenticación)

#### PATCH /api/users/:id
**Descripción**: Actualizar perfil de usuario

**Permiso requerido**: Solo puede actualizar su propio perfil, o ser admin

**Body**:
```json
{
  "email": "new-email@example.com",
  "usuario": "new_username"
}
```

**Validaciones**:
- `email`: formato válido, único
- `usuario`: 3-50 caracteres, único

---

#### GET /api/users/me
**Descripción**: Obtener datos del usuario actual

**Respuesta (200)**:
```json
{
  "statusCode": 200,
  "intOpCode": "SxUS200",
  "data": {
    "id": "user-uuid",
    "usuario": "john_doe",
    "email": "john@example.com",
    "permissionsByGroup": {
      "group-123": ["tickets:add", ...]
    }
  }
}
```

---

### 👨‍💼 Administración (requieren "users:manage" o "groups:manage")

#### GET /api/users
**Descripción**: Listar todos los usuarios (solo admin)

**Permiso requerido**: "users:manage" (global)

---

#### POST /api/groups/:groupId/permissions
**Descripción**: Asignar permiso a usuario en un grupo

**Permiso requerido**: "groups:manage" en ese grupo

**Body**:
```json
{
  "userId": "user-uuid",
  "permiso": "tickets:add"
}
```

---

## 🔍 Validación de Permisos en el API Gateway

Pseudocódigo de ejemplo:

```javascript
// En API Gateway
app.post('/api/tickets', async (request, reply) => {
  // 1. Validar token JWT
  const userId = verifyJWT(request.headers.authorization);
  if (!userId) {
    return reply.code(401).send({
      statusCode: 401,
      intOpCode: 'SxGW401',
      data: null,
      error: 'Token inválido o expirado'
    });
  }

  // 2. Verificar que el usuario tenga el permiso "tickets:add"
  const groupId = request.body.groupId;
  const hasPermission = await checkPermission(userId, groupId, 'tickets:add');
  
  if (!hasPermission) {
    return reply.code(403).send({
      statusCode: 403,
      intOpCode: 'SxGW403',
      data: null,
      error: 'No tienes permiso para crear tickets en este grupo'
    });
  }

  // 3. Si todo es válido, reenviar a microservicio de tickets
  const response = await ticketsService.createTicket(request.body);
  return reply.code(201).send(response);
});
```

---

## 📊 Rate Limiting

El API Gateway debe implementar rate limiting:

**Límites**:
- **Global**: 1000 requests por minuto por IP
- **Por usuario**: 500 requests por minuto por usuario autenticado
- **Por endpoint**: Límites específicos (ej: login = 5 intentos/minuto)

**Respuesta cuando se excede (429)**:
```json
{
  "statusCode": 429,
  "intOpCode": "SxGW429",
  "data": null,
  "error": "Demasiadas solicitudes. Intenta de nuevo en 60 segundos.",
  "retryAfter": 60
}
```

---

## 📝 Logs Centralizados

Cada request debe registrarse en la tabla `audit_logs`:

```javascript
{
  user_id: "uuid",
  endpoint: "/api/tickets",
  metodo: "POST",
  ip_address: "192.168.1.1",
  status_code: 201,
  response_time: 245, // ms
  created_at: "2025-01-16T15:45:00Z"
}
```

---

## 📈 Métricas

Agregar registros a la tabla `metrics`:

```javascript
{
  endpoint: "/api/tickets",
  request_count: 1234,
  avg_response_time: 156.42,
  last_updated: "2025-01-16T16:00:00Z"
}
```

