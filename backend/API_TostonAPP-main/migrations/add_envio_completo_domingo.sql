-- Migración: agregar columna Envio_Completo_Domingo a la tabla Ventas
-- Correr UNA SOLA VEZ en la base de datos de producción (Aiven MySQL).
-- NULL = no respondió todavía | 1 = sí, todo junto el domingo | 0 = no, prefiere recibir antes lo disponible

ALTER TABLE Ventas
  ADD COLUMN Envio_Completo_Domingo TINYINT NULL DEFAULT NULL
  COMMENT '1=quiere todo junto el domingo, 0=prefiere recibir lo disponible antes, NULL=sin respuesta';
