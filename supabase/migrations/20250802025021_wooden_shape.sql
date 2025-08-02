/*
  # Agregar campos faltantes a tabla bookings

  1. Nuevas Columnas
    - `customer_email` (text, email del cliente)
    - `customer_phone` (text, teléfono del cliente)
    - `payment_confirmed_at` (timestamptz, timestamp de confirmación de pago)

  2. Índices
    - Índice en customer_email para búsquedas
    - Índice en payment_confirmed_at para consultas de pagos

  3. Comentarios
    - Documentación de los nuevos campos
*/

-- Agregar campo customer_email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_email text;
  END IF;
END $$;

-- Agregar campo customer_phone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_phone text;
  END IF;
END $$;

-- Agregar campo payment_confirmed_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_confirmed_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_confirmed_at timestamptz;
  END IF;
END $$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_confirmed_at ON bookings(payment_confirmed_at);

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN bookings.customer_email IS 'Email del cliente que realizó la reserva';
COMMENT ON COLUMN bookings.customer_phone IS 'Teléfono de contacto del cliente';
COMMENT ON COLUMN bookings.payment_confirmed_at IS 'Timestamp de cuando se confirmó el pago de la reserva';