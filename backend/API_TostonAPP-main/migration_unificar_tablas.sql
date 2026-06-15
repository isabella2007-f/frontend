-- ============================================================
-- MIGRACIÓN: Unificar Empleados en la tabla Usuarios
-- Ejecutar en Aiven MySQL ANTES de desplegar el nuevo código
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Agregar columna ID_Rol a Usuarios
ALTER TABLE Usuarios ADD COLUMN ID_Rol INT NULL;

-- 2. Llenar ID_Rol desde la tabla junction Usuario_x_Rol (clientes)
UPDATE Usuarios u
INNER JOIN Usuario_x_Rol uxr ON u.ID_Usuario = uxr.ID_Usuario
SET u.ID_Rol = uxr.ID_Rol;

-- Asegurar que ningún cliente quede sin rol (defaultea a 3 = Cliente)
UPDATE Usuarios
SET ID_Rol = 3
WHERE ID_Rol IS NULL;

-- 3. Insertar todos los Empleados en la tabla Usuarios
INSERT INTO Usuarios
  (Cedula, Tipo_Documento, ID_Rol, Nombre, Apellidos, Correo,
   Direccion, Municipio, Departamento, Telefono, Foto_perfil,
   Fecha_creacion, Contrasena, Estado)
SELECT
  Cedula, Tipo_Documento, ID_Rol, Nombre, Apellidos, Correo,
  Direccion, Municipio, Departamento, Telefono, Foto_perfil,
  Fecha_creacion, Contrasena, Estado
FROM Empleados;

-- 4. Actualizar Domicilios.ID_Empleado → nuevo ID_Usuario del repartidor
--    (los empleados recién insertados tienen el mismo Correo)
UPDATE Domicilios d
INNER JOIN Empleados e   ON d.ID_Empleado = e.ID_Empleado
INNER JOIN Usuarios  u   ON u.Correo = e.Correo AND u.ID_Rol = e.ID_Rol
SET d.ID_Empleado = u.ID_Usuario;

-- 5. Actualizar Salidas.ID_Empleado → nuevo ID_Usuario del empleado
UPDATE Salidas s
INNER JOIN Empleados e   ON s.ID_Empleado = e.ID_Empleado
INNER JOIN Usuarios  u   ON u.Correo = e.Correo AND u.ID_Rol = e.ID_Rol
SET s.ID_Empleado = u.ID_Usuario;

-- 6. Eliminar tabla Empleados (ya no se necesita)
DROP TABLE IF EXISTS Empleados;

-- 7. Agregar FK Usuarios.ID_Rol → Roles
ALTER TABLE Usuarios
  ADD CONSTRAINT fk_usuarios_rol
  FOREIGN KEY (ID_Rol) REFERENCES Roles(ID_Rol);

-- 8. Actualizar FK de Domicilios: apuntar a Usuarios en vez de Empleados
--    (el nombre de columna ID_Empleado se mantiene intencionalmente)
ALTER TABLE Domicilios
  ADD CONSTRAINT fk_domicilios_usuario
  FOREIGN KEY (ID_Empleado) REFERENCES Usuarios(ID_Usuario);

-- 9. Actualizar FK de Salidas: apuntar a Usuarios en vez de Empleados
ALTER TABLE Salidas
  ADD CONSTRAINT fk_salidas_usuario
  FOREIGN KEY (ID_Empleado) REFERENCES Usuarios(ID_Usuario);

SET FOREIGN_KEY_CHECKS = 1;

-- Verificación rápida (ejecutar por separado para confirmar)
-- SELECT ID_Rol, COUNT(*) as total FROM Usuarios GROUP BY ID_Rol;
-- SELECT COUNT(*) FROM Domicilios WHERE ID_Empleado NOT IN (SELECT ID_Usuario FROM Usuarios);
-- SELECT COUNT(*) FROM Salidas WHERE ID_Empleado IS NOT NULL AND ID_Empleado NOT IN (SELECT ID_Usuario FROM Usuarios);
