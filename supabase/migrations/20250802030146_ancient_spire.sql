/*
  # Agregar campos customer_name y end_time a tabla bookings

  1. Nuevas Columnas
    - `customer_name` (text, nombre del cliente)
    - `end_time` (text, hora de finalización del servicio)

  2. Índices
    - Índice en customer_name para búsquedas
    - Índice en end_time para consultas de horarios

  3. Comentarios
    - Documentación de los nuevos campos
*/

-- Agregar campo customer_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_name text;
  END IF;
END $$;

-- Agregar campo end_time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN end_time text;
  END IF;
END $$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_bookings_customer_name ON bookings(customer_name);
CREATE INDEX IF NOT EXISTS idx_bookings_end_time ON bookings(end_time);

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN bookings.customer_name IS 'Nombre completo del cliente que realizó la reserva';
COMMENT ON COLUMN bookings.end_time IS 'Hora de finalización estimada del servicio';