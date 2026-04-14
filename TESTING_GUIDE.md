# 🚀 Guía para Probar la Aplicación

## Problema Identificado

La aplicación está funcionando correctamente, pero **no hay usuarios en la base de datos**. Todos los servicios están corriendo:
- ✅ Users Service: `http://localhost:3001`
- ✅ Groups Service: `http://localhost:3002`
- ✅ Tickets Service: `http://localhost:3003`
- ✅ API Gateway: `http://localhost:3000`
- ✅ Frontend: `http://localhost:4200`

El frontend recibe errores 401 porque intenta acceder a datos protegidos sin estar autenticado.

## Solución: 3 Pasos

### Paso 1: Crear Usuarios de Prueba (Una sola vez)

Ejecuta el script SQL de seed para crear usuarios de prueba:

```bash
# Conecta a Supabase PostgreSQL y ejecuta el script
psql -h aws-0-us-west-2.pooler.supabase.com -U postgres.cehhyegczbdoiuztsxpk -d postgres -f db/seed_test_users.sql
```

**Credenciales creadas:**
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `password123` | Administrador |
| `testuser` | `password123` | Usuario Normal |
| `developer` | `password123` | Usuario Normal |

### Paso 2: Navegar a Login

1. Abre http://localhost:4200/login
2. Verás el formulario de login

### Paso 3: Hacer Login

1. Ingresa uno de los usuarios de prueba:
   - **Usuario:** `admin`
   - **Contraseña:** `password123`

2. Haz clic en "Login"

3. ✅ Si todo funciona bien:
   - Recibirás un token JWT
   - Serás redirigido a `/home`
   - Podrás ver los grupos del proyecto
   - Podrás crear y editar tickets

## Flujo de Autenticación (Técnico)

```
1. Frontend hace POST /api/users/login con credenciales
   ↓
2. Gateway (puerto 3000) permite POST
   ↓
3. Gateway redirige a Users Service (puerto 3001)
   ↓
4. Users Service valida credenciales contra BD PostgreSQL
   ↓
5. Service retorna:
   {
     id, usuario, email, fullname,
     token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     permissions: ['ticket_view', 'group_create', ...],
     is_admin: true
   }
   ↓
6. Frontend guarda token en localStorage
   ↓
7. Frontend envía peticiones con header:
   Authorization: Bearer (token anterior)
   ↓
8. Gateway valida token y obtiene userId
   ↓
9. Gateway redirige a servicio correspondiente
   ↓
10. Servicio procesa petición autenticada
```

## Token JWT

El token contiene:
```json
{
  "userId": 1,
  "usuario": "admin",
  "email": "admin@example.com",
  "permissions": ["ticket_view", "ticket_create", ...],
  "is_admin": true,
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Verificación

Después de hacer login, abre **Herramientas del Navegador** (F12) → **Aplicación** → **Local Storage** y verifica:
- La clave `auth_user` contiene tu usuario y token
- El token comienza con `eyJhbGci...`

## Funcionalidades Disponibles

Una vez autenticado puedes:
- ✅ Ver grupos
- ✅ Crear grupos
- ✅ Ver tickets
- ✅ Crear tickets  
- ✅ Mover tickets entre columnas (Kanban)
- ✅ Gestionar permisos (solo si eres admin)

## Troubleshooting

### Error 401 en /api/groups
**Causa:** No hay usuario autenticado
**Solución:** Haz login primero

### Error 503 API Gateway unavailable
**Causa:** El servicio no está corriendo O el gateway no puede conectarse
**Solución:** Verifica que todos 5 servicios estén corriendo:
```powershell
# Terminal 1: Users Service
npm run start:users

# Terminal 2: Groups Service  
npm run start:groups

# Terminal 3: Tickets Service
npm run start:tickets

# Terminal 4: Gateway
npm run start:gateway

# Terminal 5: Frontend
ng serve -o
```

### Error en Supabase connection
**Causa:** Variables de ambiente no están configuradas correctamente
**Solución:** Verifica `.env.local`:
```
VITE_SUPABASE_URL=https://cehhyegczbdoiuztsxpk.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_HOST=aws-0-us-west-2.pooler.supabase.com
SUPABASE_PORT=5432
SUPABASE_DB_USER=postgres.cehhyegczbdoiuztsxpk
SUPABASE_DB_PASSWORD=...
SUPABASE_DB_NAME=postgres
```

## Logs Importantes

Revisa estos logs en las consolas:

**Gateway:**
```
[GATEWAY] POST /api/users/login → 200
[GATEWAY] GET /api/groups → 200 (con token)
```

**Frontend:**
```
✓ Direct login successful: admin
✓ User saved to storage: admin Token length: 542
```

---

**¿Todo funciona? 🎉 ¡Felicidades!**

La arquitectura de microservicios con JWT está lista.
