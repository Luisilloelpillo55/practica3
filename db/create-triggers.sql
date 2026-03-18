-- Trigger para incrementar automáticamente el contador de tickets en la tabla groups
-- Ejecutar este script después de crear las tablas

-- Primero, agregar la columna tickets a la tabla groups si no existe
ALTER TABLE groups ADD COLUMN IF NOT EXISTS tickets INT DEFAULT 0;

-- Crear trigger que incremente tickets al insertar un nuevo ticket
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS tr_increment_group_tickets
AFTER INSERT ON tickets
FOR EACH ROW
BEGIN
  UPDATE groups
  SET tickets = tickets + 1
  WHERE id = NEW.group_id;
END$$

-- Crear trigger que decremente tickets al eliminar un ticket
CREATE TRIGGER IF NOT EXISTS tr_decrement_group_tickets
AFTER DELETE ON tickets
FOR EACH ROW
BEGIN
  UPDATE groups
  SET tickets = tickets - 1
  WHERE id = OLD.group_id;
END$$

DELIMITER ;
