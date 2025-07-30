/*
  # Agregar soporte para autenticación biométrica

  1. Nuevas Columnas
    - `biometric_enabled` (boolean) - Si la autenticación biométrica está habilitada
    - `biometric_enabled_at` (timestamptz) - Cuándo se habilitó la autenticación biométrica

  2. Seguridad
    - Los usuarios solo pueden actualizar sus propias configuraciones biométricas
*/

-- Agregar columna biometric_enabled a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS biometric_enabled boolean DEFAULT false;

-- Agregar columna biometric_enabled_at para rastrear cuándo se habilitó
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS biometric_enabled_at timestamptz;

-- Crear política para que los usuarios puedan actualizar sus propias configuraciones biométricas
CREATE POLICY IF NOT EXISTS "Users can update own biometric settings"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Crear índice para mejorar el rendimiento de consultas biométricas
CREATE INDEX IF NOT EXISTS idx_profiles_biometric_enabled 
ON profiles(biometric_enabled) 
WHERE biometric_enabled = true;