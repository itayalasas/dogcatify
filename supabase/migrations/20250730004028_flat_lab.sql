/*
  # Agregar soporte completo para autenticación biométrica

  1. Nuevas Columnas
    - `biometric_enabled` (boolean) - Si la autenticación biométrica está habilitada
    - `biometric_enabled_at` (timestamptz) - Cuándo se habilitó la autenticación biométrica
    - `push_token` (text) - Token para notificaciones push

  2. Seguridad
    - Los usuarios solo pueden actualizar sus propias configuraciones biométricas
    - Políticas RLS apropiadas

  3. Índices
    - Índices para mejorar el rendimiento
*/

-- Agregar columnas biométricas si no existen
DO $$ 
BEGIN
  -- Agregar biometric_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'biometric_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN biometric_enabled boolean DEFAULT false;
    RAISE NOTICE 'Added biometric_enabled column to profiles table';
  ELSE
    RAISE NOTICE 'biometric_enabled column already exists';
  END IF;

  -- Agregar biometric_enabled_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'biometric_enabled_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN biometric_enabled_at timestamptz;
    RAISE NOTICE 'Added biometric_enabled_at column to profiles table';
  ELSE
    RAISE NOTICE 'biometric_enabled_at column already exists';
  END IF;

  -- Agregar push_token para notificaciones
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'push_token'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN push_token text;
    RAISE NOTICE 'Added push_token column to profiles table';
  ELSE
    RAISE NOTICE 'push_token column already exists';
  END IF;
END $$;

-- Crear política para actualización de configuraciones biométricas
DO $$
BEGIN
  -- Verificar si la política ya existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'profiles' 
    AND policyname = 'Users can update own biometric settings'
  ) THEN
    CREATE POLICY "Users can update own biometric settings"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
    RAISE NOTICE 'Created biometric settings policy';
  ELSE
    RAISE NOTICE 'Biometric settings policy already exists';
  END IF;
END $$;

-- Crear índices para mejorar rendimiento
DO $$
BEGIN
  -- Índice para biometric_enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public'
    AND tablename = 'profiles' 
    AND indexname = 'idx_profiles_biometric_enabled'
  ) THEN
    CREATE INDEX idx_profiles_biometric_enabled 
    ON public.profiles(biometric_enabled) 
    WHERE biometric_enabled = true;
    RAISE NOTICE 'Created biometric_enabled index';
  ELSE
    RAISE NOTICE 'Biometric_enabled index already exists';
  END IF;

  -- Índice para push_token
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public'
    AND tablename = 'profiles' 
    AND indexname = 'idx_profiles_push_token'
  ) THEN
    CREATE INDEX idx_profiles_push_token 
    ON public.profiles(push_token) 
    WHERE push_token IS NOT NULL;
    RAISE NOTICE 'Created push_token index';
  ELSE
    RAISE NOTICE 'Push_token index already exists';
  END IF;
END $$;

-- Verificar que las columnas se crearon correctamente
DO $$
DECLARE
  biometric_exists boolean;
  biometric_at_exists boolean;
  push_token_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'biometric_enabled'
  ) INTO biometric_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'biometric_enabled_at'
  ) INTO biometric_at_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'push_token'
  ) INTO push_token_exists;

  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE 'biometric_enabled exists: %', biometric_exists;
  RAISE NOTICE 'biometric_enabled_at exists: %', biometric_at_exists;
  RAISE NOTICE 'push_token exists: %', push_token_exists;
END $$;