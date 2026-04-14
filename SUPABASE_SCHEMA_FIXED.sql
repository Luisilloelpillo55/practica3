-- ============================================
-- SUPABASE SCHEMA - ERपJIR
-- ============================================

-- 1. DROP existing tables (if you want to reset everything)
-- Uncomment these lines if you want to delete all data and start fresh:
/*
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
*/

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  usuario VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  fullname VARCHAR(255),
  address VARCHAR(500),
  dob DATE,
  phone VARCHAR(20),
  permiso INTEGER DEFAULT 0,
  permissions TEXT DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO permissions (nombre, descripcion) VALUES
('group_view', 'Ver grupos'),
('group_create', 'Crear grupos'),
('group_edit', 'Editar grupos'),
('group_delete', 'Eliminar grupos'),
('ticket_view', 'Ver tickets'),
('ticket_create', 'Crear tickets'),
('ticket_edit', 'Editar tickets'),
('ticket_move', 'Mover tickets'),
('ticket_delete', 'Eliminar tickets'),
('user_view', 'Ver usuarios'),
('user_edit', 'Editar usuarios'),
('user_delete', 'Eliminar usuarios'),
('admin', 'Administrador')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  nivel INTEGER,
  autor VARCHAR(255),
  nombre VARCHAR(255) NOT NULL,
  integrantes TEXT DEFAULT '[]',
  tickets INTEGER DEFAULT 0,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'abierto',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER_PERMISSIONS TABLE (for legacy support)
-- ============================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for groups table
CREATE POLICY "Authenticated users can view groups"
  ON groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for tickets table
CREATE POLICY "Authenticated users can view tickets"
  ON tickets FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for permissions table
CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies for user_permissions table
CREATE POLICY "Authenticated users can view user permissions"
  ON user_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_usuario ON users(usuario);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_group_id ON tickets(group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
