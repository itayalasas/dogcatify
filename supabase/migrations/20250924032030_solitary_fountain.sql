/*
  # Agregar columnas de reservas a la tabla orders

  1. Nuevas Columnas
    - `booking_id` (uuid) - ID de la reserva asociada
    - `order_type` (text) - Tipo de orden: 'product_purchase' o 'service_booking'
    - `service_id` (uuid) - ID del servicio (para reservas)
    - `appointment_date` (timestamptz) - Fecha de la cita (para reservas)
    - `appointment_time` (text) - Hora de la cita (para reservas)
    - `pet_id` (uuid) - ID de la mascota (para reservas)
    - `booking_notes` (text) - Notas de la reserva

  2. Índices
    - Índice en booking_id para consultas rápidas
    - Índice en order_type para filtros
    - Índice en service_id para servicios
    - Índice en appointment_date para citas

  3. Restricciones
    - order_type debe ser 'product_purchase' o 'service_booking'
*/

-- Agregar columnas relacionadas con reservas
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'product_purchase' CHECK (order_type IN ('product_purchase', 'service_booking'));

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS service_id uuid;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS appointment_date timestamptz;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS appointment_time text;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pet_id uuid REFERENCES pets(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS booking_notes text;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN orders.booking_id IS 'ID de la reserva asociada (para service_booking)';
COMMENT ON COLUMN orders.order_type IS 'Tipo de orden: product_purchase o service_booking';
COMMENT ON COLUMN orders.service_id IS 'ID del servicio reservado (para service_booking)';
COMMENT ON COLUMN orders.appointment_date IS 'Fecha de la cita (para service_booking)';
COMMENT ON COLUMN orders.appointment_time IS 'Hora de la cita (para service_booking)';
COMMENT ON COLUMN orders.pet_id IS 'ID de la mascota para la cual es la reserva';
COMMENT ON COLUMN orders.booking_notes IS 'Notas adicionales de la reserva';

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_orders_booking_id 
ON orders(booking_id) 
WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_order_type 
ON orders(order_type);

CREATE INDEX IF NOT EXISTS idx_orders_service_id 
ON orders(service_id) 
WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_appointment_date 
ON orders(appointment_date) 
WHERE appointment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_pet_id 
ON orders(pet_id) 
WHERE pet_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_type 
ON orders(customer_id, order_type);

-- Actualizar registros existentes
UPDATE orders 
SET 
  order_type = 'product_purchase'
WHERE 
  order_type IS NULL;