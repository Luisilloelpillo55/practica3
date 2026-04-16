-- Add 'user_edit' permission to permissions table and assign to user 'lol'
-- PostgreSQL compatible

-- 1) Ensure permission exists
  INSERT INTO permissions (nombre, descripcion)
  VALUES ('user_edit', 'Editar información de usuarios')
  ON CONFLICT (nombre) DO NOTHING;

  -- 2) Add permission to user 'lol' permisos array if not already present
  UPDATE users
  SET permisos = CASE
    WHEN permisos IS NULL THEN ARRAY['user_edit']
    WHEN 'user_edit' = ANY(permisos) THEN permisos
    ELSE permisos || ARRAY['user_edit']
  END
  WHERE usuario = 'lol';

-- 3) For legacy user_permissions table (MySQL/Postgres), attempt to insert mapping if table exists
-- MySQL (run in MySQL client):
-- INSERT IGNORE INTO user_permissions (user_id, permission_id)
-- SELECT u.id, p.id FROM users u, permissions p WHERE u.usuario = 'lol' AND p.nombre = 'user_edit';

-- PostgreSQL alternative (if using user_permissions table):
-- INSERT INTO user_permissions (user_id, permission_id)
-- SELECT u.id, p.id FROM users u, permissions p WHERE u.usuario = 'lol' AND p.nombre = 'user_edit'
-- ON CONFLICT DO NOTHING;

-- 4) Verify
SELECT usuario, permisos FROM users WHERE usuario = 'lol' LIMIT 1;