# Arquitectura de Microservicios - ERPJir

Este proyecto ahora está estructurado como **microservicios desacoplados** para pruebas de escalabilidad.

## Estructura

```
src/
├── services/
│   ├── shared-db.ts           ← Conexión compartida a Supabase
│   ├── gateway/               ← API Gateway (puerto 3000)
│   │   └── server.ts
│   ├── users-service/         ← Users Service (puerto 3001)
│   │   └── server.ts
│   ├── groups-service/        ← Groups Service (puerto 3002)
│   │   └── server.ts
│   └── tickets-service/       ← Tickets Service (puerto 3003)
│       └── server.ts
├── app/                       ← Angular Frontend
└── api/                       ← (Deprecado - usar services/)
```

## Puertos Asignados

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| API Gateway | 3000 | Enrutador central de todas las requests |
| Users Service | 3001 | Autenticación y gestión de usuarios |
| Groups Service | 3002 | Gestión de grupos/workspaces |
| Tickets Service | 3003 | Gestión de tickets/tareas |
| Angular App | 4200 | Frontend |

## Cómo Ejecutar

### Opción 1: Ejecutar todos en paralelo (Manual - abre 5 terminales)

**Terminal 1 - API Gateway:**
```bash
npm run start:gateway
```

**Terminal 2 - Users Service:**
```bash
npm run start:users
```

**Terminal 3 - Groups Service:**
```bash
npm run start:groups
```

**Terminal 4 - Tickets Service:**
```bash
npm run start:tickets
```

**Terminal 5 - Frontend (Angular):**
```bash
npm run start
```

### Opción 2: Ejecutar todo con un script (requiere agregar a package.json)

Pendiente: agregar `concurrently` package y scripts

## Flujo de Requests

```
Angular Frontend (4200)
        ↓
    API Gateway (3000)
        ↓
    ┌───────────────────────────────┐
    ↓           ↓           ↓
Users (3001) Groups (3002) Tickets (3003)
    ↓           ↓           ↓
    └───────────────────────────────┘
              ↓
        Supabase PostgreSQL
```

## Variables de Entorno Requeridas

Asegúrate que `.env.local` contenga:

```env
# Supabase Frontend
VITE_SUPABASE_URL=https://cehhyegczbdoiuztsxpk.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_SERVICE_ROLE_KEY=...

# Supabase Backend
SUPABASE_HOST=cehhyegczbdoiuztsxpk.supabase.co
SUPABASE_PORT=5432
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=...
SUPABASE_DB_NAME=postgres

# URLs de Microservicios (opcional si están localhost)
USERS_SERVICE_URL=http://localhost:3001
GROUPS_SERVICE_URL=http://localhost:3002
TICKETS_SERVICE_URL=http://localhost:3003
```

## Ventajas de esta Arquitectura

✅ **Escalabilidad**: Cada servicio puede deployarse y escalarse independientemente
✅ **Desacoplamiento**: Los servicios no dependen directamente entre sí
✅ **Mantenibilidad**: Cada equipo puede trabajar en su propio servicio
✅ **Tolerancia a fallos**: Si un servicio cae, otros siguen funcionando
✅ **Fácil testing**: Servicios aislados facilitan unit tests y mocking
✅ **Compatibilidad**: El API Gateway mantiene la misma interfaz `/api/*` para el frontend

## Testing del Gateway

```bash
# Verificar que el Gateway está corriendo
curl http://localhost:3000/health

# Verificar Users Service
curl http://localhost:3000/api/users/health

# Crear usuario (a través del Gateway)
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"usuario":"test","email":"test@example.com","password":"Test123!@#","fullname":"Test User"}'
```

## Próximos Pasos

- [ ] Agregar Docker files para cada microservicio
- [ ] Agregar Kubernetes manifests para orquestación
- [ ] Implementar service discovery
- [ ] Agregar logging centralizado
- [ ] Agregar monitoring y alerts
- [ ] Implementar circuit breakers
- [ ] Agregar rate limiting por servicio
