-- ============================================================
-- limpieza_parcial.sql
-- Limpia datos de ventas, producción, pedidos y notificaciones.
--
-- CONSERVA:
--   Usuarios, Empleados, Roles, Permisos, Usuario_x_Rol
--   Insumos, Lote_Insumos, Lote_Compra, Compras, Detalle_Compra
--   Proveedores, Categoria_Insumos, Unidad_Medida, Estados
--
-- EJECUTAR en MySQL Workbench contra la base de datos de producción.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── VENTAS Y PEDIDOS ──────────────────────────────────────
TRUNCATE TABLE Notificaciones;
TRUNCATE TABLE Devolucion_Detalle;
TRUNCATE TABLE Movimiento_Credito;
TRUNCATE TABLE Devoluciones;
TRUNCATE TABLE Descuento_x_Venta;
TRUNCATE TABLE Descuento_x_Usuario;
TRUNCATE TABLE Descuentos;
TRUNCATE TABLE Domicilios;
TRUNCATE TABLE Detalle_Venta;
TRUNCATE TABLE Venta_x_Producto;
TRUNCATE TABLE Ventas;

-- ── PRODUCCIÓN ────────────────────────────────────────────
TRUNCATE TABLE Salidas;
TRUNCATE TABLE Lote_Producto;
TRUNCATE TABLE Orden_Produccion;

-- ── PRODUCTOS Y FICHAS ────────────────────────────────────
TRUNCATE TABLE Ficha_Tecnica_Insumo;
TRUNCATE TABLE Ficha_Tecnica;
TRUNCATE TABLE Producto_Imagenes;
TRUNCATE TABLE Productos;
TRUNCATE TABLE Categoria_Producto;

-- ── TOKENS DE VERIFICACIÓN PENDIENTES ─────────────────────
TRUNCATE TABLE Verificaciones_Email;

SET FOREIGN_KEY_CHECKS = 1;

-- ── RESETEAR CRÉDITOS A 0 (conserva el registro del usuario) ──
UPDATE Credito_Cliente SET Saldo = 0.00, Fecha_Update = NOW();

-- ── VERIFICACIÓN ──────────────────────────────────────────
SELECT 'Empleados'        AS Tabla, COUNT(*) AS Filas FROM Empleados
UNION ALL SELECT 'Usuarios',         COUNT(*) FROM Usuarios
UNION ALL SELECT 'Insumos',          COUNT(*) FROM Insumos
UNION ALL SELECT 'Lote_Insumos',     COUNT(*) FROM Lote_Insumos
UNION ALL SELECT 'Compras',          COUNT(*) FROM Compras
UNION ALL SELECT 'Proveedores',      COUNT(*) FROM Proveedores
UNION ALL SELECT 'Ventas',           COUNT(*) FROM Ventas
UNION ALL SELECT 'Productos',        COUNT(*) FROM Productos
UNION ALL SELECT 'Notificaciones',   COUNT(*) FROM Notificaciones
UNION ALL SELECT 'Credito_Cliente',  COUNT(*) FROM Credito_Cliente;
