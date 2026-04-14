-- SQL schema for mi-practica with JWT permissions and full logging
-- Compatible con Supabase PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  usuario VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fullname VARCHAR(255),
  address TEXT,
  dob DATE,
  phone VARCHAR(50),
  permisos TEXT[] DEFAULT ARRAY['ticket_view','ticket_create','ticket_edit','ticket_move','ticket_delete','group_view','group_create','group_edit','group_delete'],
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  nivel VARCHAR(50),
  autor BIGINT REFERENCES users(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  integrantes TEXT,
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'No iniciado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'No iniciado',
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_history (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  rol VARCHAR(50) DEFAULT 'miembro',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id)
);

-- Permissions stored directly in users.permisos array (DELETED TABLE - moved to user array field)
-- Previously: CREATE TABLE IF NOT EXISTS user_permissions (...)

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50),
  entity_id BIGINT,
  action VARCHAR(50),
  old_data JSONB,
  new_data JSONB,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  method VARCHAR(10),
  path VARCHAR(255),
  status_code INT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  response_time INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_name VARCHAR(100),
  metric_value NUMERIC,
  group_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
  method VARCHAR(10),
  endpoint VARCHAR(255),
  status_code INT,
  response_time INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions (14 total)
INSERT INTO permissions (nombre, descripcion) VALUES
  ('ticket_view', 'Ver tickets de grupos'),
  ('ticket_create', 'Crear tickets'),
  ('ticket_edit', 'Editar tickets'),
  ('ticket_move', 'Mover tickets entre columnas'),
  ('ticket_delete', 'Eliminar tickets'),
  ('ticket_add', 'Agregar tickets'),
  ('group_view', 'Ver grupos'),
  ('group_create', 'Crear grupos'),
  ('group_edit', 'Editar grupos'),
  ('group_delete', 'Eliminar grupos'),
  ('user_view', 'Ver información de usuarios'),
  ('user_manage', 'Gestionar permisos de usuarios'),
  ('user_delete', 'Eliminar usuarios'),
  ('admin', 'Acceso administrativo total')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_usuario ON users(usuario);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_groups_autor ON groups(autor);
CREATE INDEX IF NOT EXISTS idx_tickets_group_id ON tickets(group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics(recorded_at);
