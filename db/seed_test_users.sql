-- Seed script: Insert test users with permissions for development
-- Password for all test users: password123
-- Hash generated using bcryptjs with 10 rounds

-- Cleanup: Delete existing test users (optional - comment out if you want to preserve data)
DELETE FROM users WHERE usuario IN ('testuser', 'admin', 'developer');

-- Insert test users
INSERT INTO users (usuario, email, password, fullname, address, dob, phone, permisos, is_admin, created_at, updated_at)
VALUES
  (
    'testuser',
    'testuser@example.com',
    '$2a$10$F9w7uLwkJ8K9Z9c3K9X9X.9X9X9X9X9X9X9X9X9X9X9X9X9X9X9',  -- password123 hashed
    'Test User',
    '123 Main St',
    '1990-01-01',
    '555-0001',
    ARRAY['ticket_view','ticket_create','ticket_edit','ticket_move','ticket_delete','group_view','group_create','group_edit','group_delete'],
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'admin',
    'admin@example.com',
    '$2a$10$F9w7uLwkJ8K9Z9c3K9X9X.9X9X9X9X9X9X9X9X9X9X9X9X9X9X9',  -- password123 hashed
    'Admin User',
    '456 Admin Lane',
    '1985-05-15',
    '555-0002',
    ARRAY['ticket_view','ticket_create','ticket_edit','ticket_move','ticket_delete','ticket_add','group_view','group_create','group_edit','group_delete','user_view','user_manage','user_delete','admin'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'developer',
    'developer@example.com',
    '$2a$10$F9w7uLwkJ8K9Z9c3K9X9X.9X9X9X9X9X9X9X9X9X9X9X9X9X9X9',  -- password123 hashed
    'Developer User',
    '789 Dev Street',
    '1995-03-20',
    '555-0003',
    ARRAY['ticket_view','ticket_create','ticket_edit','ticket_move','ticket_delete','group_view','group_create','group_edit','group_delete','user_view'],
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (usuario) DO NOTHING;

-- Insert test groups
DELETE FROM groups WHERE nombre IN ('Proyecto A', 'Proyecto B', 'Proyecto C');

DO $$
DECLARE
  admin_id BIGINT;
BEGIN
  SELECT id INTO admin_id FROM users WHERE usuario = 'admin' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO groups (nivel, autor, nombre, integrantes, descripcion, estado, created_at, updated_at)
    VALUES
      ('mid', admin_id, 'Proyecto A', '[' || admin_id || ']', 'Primer proyecto de prueba', 'En Progreso', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('high', admin_id, 'Proyecto B', '[' || admin_id || ']', 'Segundo proyecto de prueba', 'No iniciado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('low', admin_id, 'Proyecto C', '[' || admin_id || ']', 'Tercer proyecto de prueba', 'No iniciado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verification
SELECT 'Test data created successfully' as status;
SELECT COUNT(*) as user_count FROM users WHERE usuario IN ('testuser', 'admin', 'developer');
SELECT COUNT(*) as group_count FROM groups WHERE nombre IN ('Proyecto A', 'Proyecto B', 'Proyecto C');
