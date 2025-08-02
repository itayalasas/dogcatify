/*
  # Agregar campo payment_status a tabla bookings

  1. Nueva Columna
    - `payment_status` (text, estado del pago)

  2. Índice
    - Índice en payment_status para consultas de estado de pago

  3. Comentarios
    - Documentación del nuevo campo
*/

-- Agregar campo payment_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text;
  END IF;
END $$;

-- Agregar campo payment_transaction_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_transaction_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_transaction_id text;
  END IF;
END $$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_transaction_id ON bookings(payment_transaction_id);

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN bookings.payment_status IS 'Estado del pago de la reserva (paid, pending, failed, etc.)';
COMMENT ON COLUMN bookings.payment_transaction_id IS 'ID de transacción del pago para seguimiento';