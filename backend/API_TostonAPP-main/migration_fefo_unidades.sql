-- ============================================================
-- Migración: FEFO + soporte de cantidades fraccionadas
-- Ejecutar UNA sola vez en la base de datos de Aiven
-- ============================================================

-- 1. Stock_Actual del insumo pasa a DECIMAL para soportar 0.5 L, 250.5 g, etc.
ALTER TABLE Insumos
  MODIFY COLUMN Stock_Actual DECIMAL(10,4) NOT NULL DEFAULT 0;

-- 2. Cantidad_Inicial del lote pasa a DECIMAL (consistencia con Stock_Actual)
ALTER TABLE Lote_Compra
  MODIFY COLUMN Cantidad_Inicial DECIMAL(10,4) NOT NULL DEFAULT 0;

-- 3. Agregar Cantidad_Actual para rastreo FEFO por lote
ALTER TABLE Lote_Compra
  ADD COLUMN IF NOT EXISTS Cantidad_Actual DECIMAL(10,4) NULL;

-- 4. Inicializar Cantidad_Actual = Cantidad_Inicial para todos los lotes existentes
UPDATE Lote_Compra
SET Cantidad_Actual = Cantidad_Inicial
WHERE Cantidad_Actual IS NULL;
