-- Agregar columna contador de tickets a groups (si no existe)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS tickets INT DEFAULT 0;

DELIMITER $$
CREATE PROCEDURE sp_insert_ticket_and_increment(
  IN p_group_id INT,
  IN p_titulo VARCHAR(255),
  IN p_descripcion TEXT,
  IN p_estado VARCHAR(50),
  IN p_created_by INT
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    INSERT INTO tickets (group_id, titulo, descripcion, estado, created_by) 
      VALUES (p_group_id, p_titulo, p_descripcion, p_estado, p_created_by);
    UPDATE groups SET tickets = IFNULL(tickets,0) + 1 WHERE id = p_group_id;
  COMMIT;
END$$
DELIMITER ;

-- Ejemplo de uso:
-- CALL sp_insert_ticket_and_increment(1, 'Titulo', 'Descripcion', 'abierto', 1);
