/*
  # Agregar columnas de confirmación de email a profiles

  1. Nuevas Columnas
    - `email_confirmed` (boolean) - Indica si el email está confirmado
    - `email_confirmed_at` (timestamp) - Fecha y hora de confirmación

  2. Valores por Defecto
    - `email_confirmed` por defecto `false`
    - `email_confirmed_at` por defecto `null`

  3. Índices
    - Índice en `email_confirmed` para consultas rápidas
*/

-- Agregar columna email_confirmed si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_confirmed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_confirmed boolean DEFAULT false;
    COMMENT ON COLUMN profiles.email_confirmed IS 'Indica si el email del usuario ha sido confirmado';
  END IF;
END $$;

-- Agregar columna email_confirmed_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_confirmed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_confirmed_at timestamptz DEFAULT null;
    COMMENT ON COLUMN profiles.email_confirmed_at IS 'Fecha y hora cuando se confirmó el email';
  END IF;
END $$;

-- Crear índice en email_confirmed para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed 
ON profiles(email_confirmed) 
WHERE email_confirmed = true;

-- Actualizar usuarios existentes que ya tienen confirmaciones en email_confirmations
UPDATE profiles 
SET 
  email_confirmed = true,
  email_confirmed_at = ec.confirmed_at
FROM email_confirmations ec
WHERE profiles.id = ec.user_id 
  AND ec.type = 'signup' 
  AND ec.is_confirmed = true
  AND profiles.email_confirmed = false;