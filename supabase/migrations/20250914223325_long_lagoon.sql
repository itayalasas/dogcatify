/*
  # Agregar columnas faltantes a la tabla promotions

  1. Nuevas Columnas
    - `discount_percentage` (numeric) - Porcentaje de descuento de la promoción
    - `discount_amount` (numeric) - Monto fijo de descuento
    - `original_price` (numeric) - Precio original antes del descuento
    - `discounted_price` (numeric) - Precio con descuento aplicado
    - `max_uses` (integer) - Número máximo de usos de la promoción
    - `current_uses` (integer) - Número actual de usos
    - `promo_code` (text) - Código promocional opcional
    - `minimum_purchase` (numeric) - Compra mínima requerida
    - `applicable_categories` (text[]) - Categorías donde aplica la promoción
    - `applicable_products` (text[]) - Productos específicos donde aplica
    - `priority` (integer) - Prioridad de la promoción (para ordenamiento)
    - `is_featured` (boolean) - Si la promoción es destacada
    - `banner_text` (text) - Texto adicional para el banner
    - `terms_conditions` (text) - Términos y condiciones
    - `updated_at` (timestamptz) - Fecha de última actualización

  2. Índices
    - Índice en discount_percentage para consultas rápidas
    - Índice en promo_code para búsquedas
    - Índice en is_featured para promociones destacadas

  3. Restricciones
    - discount_percentage debe estar entre 0 y 100
    - max_uses debe ser mayor a 0
    - current_uses no puede ser mayor que max_uses
*/

-- Agregar columnas de descuento
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC CHECK (discount_amount >= 0);

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS original_price NUMERIC CHECK (original_price >= 0);

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS discounted_price NUMERIC CHECK (discounted_price >= 0);

-- Agregar columnas de uso y límites
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS max_uses INTEGER CHECK (max_uses > 0);

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0);

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS promo_code TEXT;

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS minimum_purchase NUMERIC CHECK (minimum_purchase >= 0);

-- Agregar columnas de aplicabilidad
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS applicable_categories TEXT[];

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS applicable_products TEXT[];

-- Agregar columnas de configuración
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS banner_text TEXT;

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_promotions_discount_percentage 
ON promotions(discount_percentage) 
WHERE discount_percentage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_promo_code 
ON promotions(promo_code) 
WHERE promo_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_is_featured 
ON promotions(is_featured) 
WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_promotions_priority 
ON promotions(priority DESC);

CREATE INDEX IF NOT EXISTS idx_promotions_dates_active 
ON promotions(start_date, end_date) 
WHERE is_active = TRUE;

-- Agregar restricción para asegurar que current_uses no exceda max_uses
ALTER TABLE promotions 
ADD CONSTRAINT IF NOT EXISTS check_current_uses_within_max 
CHECK (current_uses <= max_uses OR max_uses IS NULL);

-- Agregar trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_promotions_updated_at ON promotions;
CREATE TRIGGER trigger_update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_promotions_updated_at();

-- Comentarios en las columnas para documentación
COMMENT ON COLUMN promotions.discount_percentage IS 'Porcentaje de descuento (0-100)';
COMMENT ON COLUMN promotions.discount_amount IS 'Monto fijo de descuento en la moneda local';
COMMENT ON COLUMN promotions.original_price IS 'Precio original antes del descuento';
COMMENT ON COLUMN promotions.discounted_price IS 'Precio final con descuento aplicado';
COMMENT ON COLUMN promotions.max_uses IS 'Número máximo de veces que se puede usar la promoción';
COMMENT ON COLUMN promotions.current_uses IS 'Número actual de usos de la promoción';
COMMENT ON COLUMN promotions.promo_code IS 'Código promocional para aplicar descuento';
COMMENT ON COLUMN promotions.minimum_purchase IS 'Monto mínimo de compra requerido';
COMMENT ON COLUMN promotions.applicable_categories IS 'Array de categorías donde aplica la promoción';
COMMENT ON COLUMN promotions.applicable_products IS 'Array de IDs de productos específicos';
COMMENT ON COLUMN promotions.priority IS 'Prioridad para ordenamiento (mayor número = mayor prioridad)';
COMMENT ON COLUMN promotions.is_featured IS 'Si la promoción debe mostrarse como destacada';
COMMENT ON COLUMN promotions.banner_text IS 'Texto adicional para mostrar en banners';
COMMENT ON COLUMN promotions.terms_conditions IS 'Términos y condiciones de la promoción';
COMMENT ON COLUMN promotions.updated_at IS 'Fecha y hora de última actualización';