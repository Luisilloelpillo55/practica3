# Configuración Supabase - ERPJir

Este documento describe cómo conectar la aplicación con Supabase y qué estructura de base de datos se necesita.

## 🔗 Conexión a Supabase

### 1. Instalar SDK de Supabase

```bash
npm install @supabase/supabase-js
```

### 2. Crear variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anonKey-from-supabase
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Crea un archivo `.env.local` para desarrollo (no subir a git):

```env
# Idem anterior
```

### 3. Crear servicio de Supabase

Crear archivo `src/app/services/supabase.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  async signUp(email: string, password: string, userData: any) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  getSession() {
    return this.supabase.auth.getSession();
  }
}
```

## 📊 Estructura de Base de Datos Supabase

### Tabla: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `groups`

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `group_members`

```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);
```

### Tabla: `permissions`

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  permiso VARCHAR(100) NOT NULL,
  -- Ejemplos: "tickets:add", "tickets:move", "tickets:delete", "groups:manage", "users:manage"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id, permiso)
);

CREATE INDEX idx_permissions_user_group ON permissions(user_id, group_id);
```

### Tabla: `tickets`

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) NOT NULL DEFAULT 'todo',
  -- Estados: 'todo', 'in-progress', 'done'
  prioridad VARCHAR(50) NOT NULL DEFAULT 'medium',
  -- Prioridades: 'low', 'medium', 'high'
  asignado_a UUID REFERENCES users(id) ON DELETE SET NULL,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_group ON tickets(group_id);
CREATE INDEX idx_tickets_asignado ON tickets(asignado_a);
CREATE INDEX idx_tickets_estado ON tickets(estado);
```

### Tabla: `audit_logs`

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  metodo VARCHAR(10) NOT NULL,
  ip_address INET,
  status_code INT,
  response_time INT, -- en ms
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### Tabla: `metrics`

```sql
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(255) NOT NULL,
  request_count INT DEFAULT 0,
  avg_response_time FLOAT DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_endpoint ON metrics(endpoint);
```

## 🔐 Row Level Security (RLS)

Habilitar RLS en todas las tablas:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
```

Ejemplo de política para `tickets`:

```sql
CREATE POLICY "Users can view tickets in their groups"
  ON tickets
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tickets if they have permission"
  ON tickets
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM permissions 
      WHERE user_id = auth.uid() 
      AND group_id = tickets.group_id 
      AND permiso = 'tickets:add'
    )
  );
```

## 🚀 Próximos pasos

1. **Crear API Gateway** que valide tokens y permisos
2. **Crear funciones serverless** (edge functions) en Supabase para validación
3. **Implementar autenticación JWT** en lugar de contraseñas en plain
4. **Configurar CORS** en Supabase

## 📝 Notas

- Los permisos se almacenan como strings: "tickets:add", "tickets:move", etc.
- Un usuario puede tener permisos diferentes en distintos grupos
- El API Gateway valida que el endpoint requerido tenga permisos específicos
- Los logs se almacenan en `audit_logs` para compliance y debugging
