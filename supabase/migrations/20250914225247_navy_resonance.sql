/*
  # Agregar columnas faltantes a la tabla promotions

  1. Nuevas Columnas
    - `discount_percentage` (smallint) - Porcentaje de descuento (0-100)
    - `discount_amount` (numeric) - Monto fijo de descuento
    - `original_price` (numeric) - Precio original del producto/servicio
    - `discounted_price` (numeric) - Precio con descuento aplicado
    - `max_uses` (integer) - Máximo número de usos de la promoción
    - `current_uses` (integer) - Número actual de usos
    - `promo_code` (text) - Código promocional único
    - `minimum_purchase` (numeric) - Monto mínimo de compra requerido
    - `applicable_categories` (text[]) - Categorías donde aplica la promoción
    - `applicable_products` (text[]) - IDs de productos específicos
    - `priority` (integer) - Prioridad de la promoción (1-10)
    - `is_featured` (boolean) - Si es promoción destacada
    - `banner_text` (text) - Texto del banner promocional
    - `terms_conditions` (text) - Términos y condiciones
    - `updated_at` (timestamptz) - Fecha de última actualización

  2. Índices
    - Índice para consultas por fechas activas
    - Índice para promociones destacadas
    - Índice para códigos promocionales
    - Índice para prioridad

  3. Restricciones
    - discount_percentage entre 0 y 100
    - priority entre 1 y 10
    - max_uses mayor que 0
    - current_uses no mayor que max_uses

  4. Trigger
    - Trigger automático para actualizar updated_at
*/

-- Agregar nuevas columnas a la tabla promotions
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS discount_percentage smallint DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS original_price numeric(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discounted_price numeric(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_uses integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS minimum_purchase numeric(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS applicable_categories text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS applicable_products text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS banner_text text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS terms_conditions text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Agregar comentarios a las nuevas columnas
COMMENT ON COLUMN promotions.discount_percentage IS 'Porcentaje de descuento (0-100)';
COMMENT ON COLUMN promotions.discount_amount IS 'Monto fijo de descuento en moneda local';
COMMENT ON COLUMN promotions.original_price IS 'Precio original del producto/servicio';
COMMENT ON COLUMN promotions.discounted_price IS 'Precio final con descuento aplicado';
COMMENT ON COLUMN promotions.max_uses IS 'Máximo número de veces que se puede usar la promoción';
COMMENT ON COLUMN promotions.current_uses IS 'Número actual de usos de la promoción';
COMMENT ON COLUMN promotions.promo_code IS 'Código promocional único para aplicar descuento';
COMMENT ON COLUMN promotions.minimum_purchase IS 'Monto mínimo de compra requerido para aplicar la promoción';
COMMENT ON COLUMN promotions.applicable_categories IS 'Array de categorías donde aplica la promoción';
COMMENT ON COLUMN promotions.applicable_products IS 'Array de IDs de productos específicos donde aplica';
COMMENT ON COLUMN promotions.priority IS 'Prioridad de la promoción (1=baja, 10=alta)';
COMMENT ON COLUMN promotions.is_featured IS 'Indica si la promoción debe mostrarse como destacada';
COMMENT ON COLUMN promotions.banner_text IS 'Texto especial para mostrar en banners';
COMMENT ON COLUMN promotions.terms_conditions IS 'Términos y condiciones de la promoción';
COMMENT ON COLUMN promotions.updated_at IS 'Fecha y hora de la última actualización';

-- Agregar restricciones de validación
DO $$
BEGIN
  -- Restricción para discount_percentage (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'promotions_discount_percentage_check' 
    AND table_name = 'promotions'
  ) THEN
    ALTER TABLE promotions 
    ADD CONSTRAINT promotions_discount_percentage_check 
    CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100));
  END IF;

  -- Restricción para priority (1-10)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'promotions_priority_check' 
    AND table_name = 'promotions'
  ) THEN
    ALTER TABLE promotions 
    ADD CONSTRAINT promotions_priority_check 
    CHECK (priority >= 1 AND priority <= 10);
  END IF;

  -- Restricción para max_uses (mayor que 0)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'promotions_max_uses_check' 
    AND table_name = 'promotions'
  ) THEN
    ALTER TABLE promotions 
    ADD CONSTRAINT promotions_max_uses_check 
    CHECK (max_uses IS NULL OR max_uses > 0);
  END IF;

  -- Restricción para current_uses (no mayor que max_uses)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'promotions_current_uses_check' 
    AND table_name = 'promotions'
  ) THEN
    ALTER TABLE promotions 
    ADD CONSTRAINT promotions_current_uses_check 
    CHECK (current_uses >= 0 AND (max_uses IS NULL OR current_uses <= max_uses));
  END IF;

  -- Restricción para montos (no negativos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'promotions_amounts_positive_check' 
    AND table_name = 'promotions'
  ) THEN
    ALTER TABLE promotions 
    ADD CONSTRAINT promotions_amounts_positive_check 
    CHECK (
      (discount_amount IS NULL OR discount_amount >= 0) AND
      (original_price IS NULL OR original_price >= 0) AND
      (discounted_price IS NULL OR discounted_price >= 0) AND
      (minimum_purchase IS NULL OR minimum_purchase >= 0)
    );
  END IF;
END $$;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates 
ON promotions (is_active, start_date, end_date) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_promotions_featured 
ON promotions (is_featured, priority DESC) 
WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_promotions_promo_code 
ON promotions (promo_code) 
WHERE promo_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_priority 
ON promotions (priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotions_partner_active 
ON promotions (partner_id, is_active, start_date, end_date) 
WHERE partner_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_promotions_categories 
ON promotions USING GIN (applicable_categories) 
WHERE applicable_categories IS NOT NULL AND array_length(applicable_categories, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_promotions_products 
ON promotions USING GIN (applicable_products) 
WHERE applicable_products IS NOT NULL AND array_length(applicable_products, 1) > 0;

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trigger_update_promotions_updated_at ON promotions;
CREATE TRIGGER trigger_update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();

-- Actualizar registros existentes con valores por defecto
UPDATE promotions 
SET 
  current_uses = 0,
  priority = 5,
  is_featured = false,
  applicable_categories = '{}',
  applicable_products = '{}',
  updated_at = now()
WHERE 
  current_uses IS NULL OR 
  priority IS NULL OR 
  is_featured IS NULL OR 
  applicable_categories IS NULL OR 
  applicable_products IS NULL OR 
  updated_at IS NULL;