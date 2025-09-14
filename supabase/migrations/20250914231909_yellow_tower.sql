/*
  # Agregar columna has_discount a la tabla promotions

  1. Nueva Columna
    - `has_discount` (boolean, default false)
      - Indica si la promoción tiene descuento aplicado
      - Se calcula automáticamente basado en discount_percentage y discount_amount

  2. Índice
    - Índice para consultas rápidas de promociones con descuento

  3. Trigger
    - Trigger para actualizar automáticamente has_discount cuando se modifiquen los campos de descuento
*/

-- Agregar la columna has_discount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promotions' AND column_name = 'has_discount'
  ) THEN
    ALTER TABLE promotions ADD COLUMN has_discount boolean DEFAULT false;
  END IF;
END $$;

-- Crear índice para consultas de promociones con descuento
CREATE INDEX IF NOT EXISTS idx_promotions_has_discount 
ON promotions (has_discount, is_active) 
WHERE has_discount = true;

-- Función para actualizar automáticamente has_discount
CREATE OR REPLACE FUNCTION update_has_discount()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular si tiene descuento basado en discount_percentage o discount_amount
  NEW.has_discount := (
    (NEW.discount_percentage IS NOT NULL AND NEW.discount_percentage > 0) OR
    (NEW.discount_amount IS NOT NULL AND NEW.discount_amount > 0)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar has_discount automáticamente
DROP TRIGGER IF EXISTS trigger_update_has_discount ON promotions;
CREATE TRIGGER trigger_update_has_discount
  BEFORE INSERT OR UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_has_discount();

-- Actualizar registros existentes
UPDATE promotions 
SET has_discount = (
  (discount_percentage IS NOT NULL AND discount_percentage > 0) OR
  (discount_amount IS NOT NULL AND discount_amount > 0)
)
WHERE has_discount IS NULL OR has_discount = false;