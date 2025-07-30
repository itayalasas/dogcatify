/*
  # Agregar soporte para autenticación biométrica

  1. Nuevas Columnas
    - `biometric_enabled` (boolean) - Si la autenticación biométrica está habilitada
    - `biometric_enabled_at` (timestamptz) - Cuándo se habilitó la autenticación biométrica

  2. Seguridad
    - Los usuarios solo pueden actualizar sus propias configuraciones biométricas
*/

-- Agregar columna biometric_enabled a la tabla profiles si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'biometric_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN biometric_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Agregar columna biometric_enabled_at si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'biometric_enabled_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN biometric_enabled_at timestamptz;
  END IF;
END $$;

-- Crear política para que los usuarios puedan actualizar sus propias configuraciones biométricas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own biometric settings'
  ) THEN
    CREATE POLICY "Users can update own biometric settings"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Crear índice para mejorar el rendimiento de consultas biométricas si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_biometric_enabled'
  ) THEN
    CREATE INDEX idx_profiles_biometric_enabled 
    ON profiles(biometric_enabled) 
    WHERE biometric_enabled = true;
  END IF;
END $$;