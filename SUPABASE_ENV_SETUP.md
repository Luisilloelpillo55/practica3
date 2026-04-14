# Configurar Variables de Entorno para Supabase PostgreSQL (Backend)

El backend necesita conectarse directamente a PostgreSQL de Supabase. Aquí está cómo obtener las credenciales:

## Paso 1: Obtener credenciales de PostgreSQL desde Supabase

1. Ve a tu **Supabase Dashboard** 
2. Selecciona tu proyecto
3. **Settings** (ícono de engranaje) → **Database**
4. Busca la sección **Connection string** o **Connection info**
5. Debería verse algo como:

```
Host: cehhyegczbdoiuztsxpk.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [Tu contraseña PostgreSQL]
```

## Paso 2: Actualizar `.env.local`

Abre `c:\Users\Luis\Desktop\Practica1\mi-practica\.env.local` y agrega estas líneas:

```env
# Frontend (ya debe estar)
VITE_SUPABASE_URL=https://cehhyegczbdoiuztsxpk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaGh5ZWdjemJkb2l1enRzeHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDQyMjMsImV4cCI6MjA4OTk4MDIyM30.do5Le7etN0lfUV8jLJ9MRPh5mMZ2Az_K7CpEk0xYYBI
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaGh5ZWdjemJkb2l1enRzeHBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwNDIyMywiZXhwIjoyMDg5OTgwMjIzfQ.adCC55ff5PFID0dB4tBxS7e08QV-QHQc5gdt4ttAVIU

# Backend (PostgreSQL)
SUPABASE_HOST=cehhyegczbdoiuztsxpk.supabase.co
SUPABASE_PORT=5432
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=TU_CONTRASEÑA_AQUI
SUPABASE_DB_NAME=postgres
```

**IMPORTANTE**: Reemplaza `TU_CONTRASEÑA_AQUI` con la contraseña PostgreSQL real que ves en Supabase.

## Paso 3: Reinicia el servidor

Detén el servidor (`Ctrl+C`) y vuelve a ejecutar:

```bash
npm start
```

## Paso 4: Prueba registrarte de nuevo

Ahora el backend debería poder conectarse a Supabase PostgreSQL. Intenta registrarte.

---

## Si no ves las credenciales de PostgreSQL en Supabase

Si no encuentras "Connection string" en Settings → Database:

1. Ve a **SQL Editor**
2. Copia cualquier query y ejecuta
3. En la esquina superior derecha verás un botón **"Connection info"** o similar
4. Ahí estarán las credenciales

Alternativamente, tu contraseña PostgreSQL es la misma que creaste cuando hiciste el proyecto en Supabase.
