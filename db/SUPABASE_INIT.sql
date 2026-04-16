-- PostgreSQL Schema for Supabase mi-practica application
-- Uses BIGINT (not UUID) for compatibility with Node.js services

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  usuario VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fullname VARCHAR(255),
  address TEXT,
  dob DATE,
  phone VARCHAR(50),
  permiso INT DEFAULT 1,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id BIGSERIAL PRIMARY KEY,
  nivel VARCHAR(50),
  autor BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  integrantes TEXT,
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'No iniciado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'No iniciado',
  priority VARCHAR(50) DEFAULT 'moderada',
  created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket history table
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  previous_estado VARCHAR(50),
  new_estado VARCHAR(50),
  changed_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rol VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(100),
  entity_id BIGINT,
  action VARCHAR(50),
  old_data JSONB,
  new_data JSONB,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metrics table
CREATE TABLE IF NOT EXISTS public.metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_name VARCHAR(100),
  metric_value NUMERIC,
  group_id BIGINT REFERENCES public.groups(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_usuario ON public.users(usuario);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_groups_autor ON public.groups(autor);
CREATE INDEX IF NOT EXISTS idx_groups_estado ON public.groups(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_group ON public.tickets(group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON public.tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

-- Insert default permissions
INSERT INTO public.permissions (nombre, descripcion) VALUES
  ('read', 'Puede leer datos'),
  ('create', 'Puede crear recursos'),
  ('update', 'Puede actualizar recursos'),
  ('delete', 'Puede eliminar recursos'),
  ('admin', 'Acceso administrativo completo')
ON CONFLICT (nombre) DO NOTHING;
