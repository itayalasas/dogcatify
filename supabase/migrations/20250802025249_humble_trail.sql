/*
  # Agregar campo payment_method a tabla bookings

  1. Nueva Columna
    - `payment_method` (text, método de pago utilizado)

  2. Índice
    - Índice en payment_method para consultas de métodos de pago

  3. Comentarios
    - Documentación del nuevo campo
*/

-- Agregar campo payment_method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_method text;
  END IF;
END $$;

-- Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN bookings.payment_method IS 'Método de pago utilizado para la reserva (credit_card, debit_card, etc.)';