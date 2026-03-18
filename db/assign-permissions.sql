-- Script para asignar permisos por defecto a usuarios existentes sin permisos

-- Primero asegúrate de que existan los permisos en la tabla permissions
INSERT IGNORE INTO permissions (nombre, descripcion) VALUES
  ('group_view', 'Ver grupos'),
  ('group_create', 'Crear grupos'),
  ('group_edit', 'Editar grupos'),
  ('group_delete', 'Eliminar grupos'),
  ('ticket_view', 'Ver tickets'),
  ('ticket_create', 'Crear tickets'),
  ('ticket_edit', 'Editar tickets'),
  ('ticket_delete', 'Eliminar tickets'),
  ('user_view', 'Ver usuarios'),
  ('user_edit', 'Editar información de usuarios'),
  ('user_delete', 'Eliminar usuarios');

-- Asignar permisos por defecto a todos los usuarios que no tengan permisos
-- Permisos por defecto: group_view, group_create, ticket_view, ticket_create, user_view, user_edit
INSERT IGNORE INTO user_permissions (user_id, permission_id)
SELECT u.id, p.id FROM users u, permissions p
WHERE u.id NOT IN (SELECT DISTINCT user_id FROM user_permissions)
AND p.nombre IN ('group_view', 'group_create', 'ticket_view', 'ticket_create', 'user_view', 'user_edit');
