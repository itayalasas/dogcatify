/*
  # Agregar columnas de comisión a la tabla bookings

  1. Nuevas Columnas
    - `commission_amount` (numeric) - Monto de comisión para DogCatiFy
    - `partner_amount` (numeric) - Monto que recibe el partner después de comisión
    - `commission_percentage` (numeric) - Porcentaje de comisión aplicado
    - `payment_preference_id` (text) - ID de la preferencia de pago de Mercado Pago
    - `payment_id` (text) - ID del pago en Mercado Pago
    - `payment_status` (text) - Estado del pago
    - `payment_data` (jsonb) - Datos completos del pago de Mercado Pago

  2. Índices
    - Índice en payment_preference_id para consultas rápidas
    - Índice en payment_status para filtros de estado

  3. Restricciones
    - commission_amount debe ser positivo
    - partner_amount debe ser positivo
    - commission_percentage debe estar entre 0 y 100
*/

-- Agregar columnas de comisión y pago
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0 CHECK (commission_amount >= 0);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS partner_amount NUMERIC(10,2) DEFAULT 0 CHECK (partner_amount >= 0);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2) DEFAULT 5.0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100);

-- Agregar columnas de Mercado Pago
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_preference_id TEXT;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_id TEXT;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_data JSONB;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN bookings.commission_amount IS 'Monto de comisión que recibe DogCatiFy';
COMMENT ON COLUMN bookings.partner_amount IS 'Monto que recibe el partner después de descontar comisión';
COMMENT ON COLUMN bookings.commission_percentage IS 'Porcentaje de comisión aplicado (0-100)';
COMMENT ON COLUMN bookings.payment_preference_id IS 'ID de la preferencia de pago en Mercado Pago';
COMMENT ON COLUMN bookings.payment_id IS 'ID del pago procesado en Mercado Pago';
COMMENT ON COLUMN bookings.payment_status IS 'Estado del pago: pending, approved, rejected, cancelled';
COMMENT ON COLUMN bookings.payment_data IS 'Datos completos del pago desde Mercado Pago';

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_bookings_payment_preference_id 
ON bookings(payment_preference_id) 
WHERE payment_preference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status 
ON bookings(payment_status);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_id 
ON bookings(payment_id) 
WHERE payment_id IS NOT NULL;

-- Actualizar registros existentes con valores por defecto
UPDATE bookings 
SET 
  commission_amount = COALESCE(total_amount * 0.05, 0),
  partner_amount = COALESCE(total_amount * 0.95, total_amount),
  commission_percentage = 5.0,
  payment_status = CASE 
    WHEN status = 'completed' THEN 'approved'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END
WHERE 
  commission_amount IS NULL OR 
  partner_amount IS NULL OR 
  commission_percentage IS NULL OR 
  payment_status IS NULL;