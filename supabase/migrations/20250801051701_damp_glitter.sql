/*
  # Agregar campos de ubicación a la tabla partners

  1. Nuevas Columnas
    - `country_id` (uuid, foreign key to countries)
    - `department_id` (uuid, foreign key to departments)
    - `calle` (text, nombre de la calle)
    - `numero` (text, número de la dirección)
    - `barrio` (text, nombre del barrio)
    - `codigo_postal` (text, código postal)
    - `latitud` (text, coordenada GPS latitud)
    - `longitud` (text, coordenada GPS longitud)

  2. Índices
    - Índice en country_id para consultas por país
    - Índice en department_id para consultas por departamento
    - Índice compuesto en latitud/longitud para búsquedas geográficas

  3. Restricciones
    - Foreign keys a las tablas countries y departments
*/

-- Agregar nuevos campos de ubicación a la tabla partners
DO $$
BEGIN
  -- country_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'country_id'
  ) THEN
    ALTER TABLE partners ADD COLUMN country_id uuid REFERENCES countries(id);
  END IF;

  -- department_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE partners ADD COLUMN department_id uuid REFERENCES departments(id);
  END IF;

  -- calle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'calle'
  ) THEN
    ALTER TABLE partners ADD COLUMN calle text;
  END IF;

  -- numero
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'numero'
  ) THEN
    ALTER TABLE partners ADD COLUMN numero text;
  END IF;

  -- barrio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'barrio'
  ) THEN
    ALTER TABLE partners ADD COLUMN barrio text;
  END IF;

  -- codigo_postal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'codigo_postal'
  ) THEN
    ALTER TABLE partners ADD COLUMN codigo_postal text;
  END IF;

  -- latitud
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'latitud'
  ) THEN
    ALTER TABLE partners ADD COLUMN latitud text;
  END IF;

  -- longitud
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'longitud'
  ) THEN
    ALTER TABLE partners ADD COLUMN longitud text;
  END IF;
END $$;

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_partners_country_id ON partners(country_id);
CREATE INDEX IF NOT EXISTS idx_partners_department_id ON partners(department_id);
CREATE INDEX IF NOT EXISTS idx_partners_location ON partners(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN partners.country_id IS 'Referencia al país donde se ubica el negocio';
COMMENT ON COLUMN partners.department_id IS 'Referencia al departamento/estado donde se ubica el negocio';
COMMENT ON COLUMN partners.calle IS 'Nombre de la calle donde se ubica el negocio';
COMMENT ON COLUMN partners.numero IS 'Número de la dirección del negocio';
COMMENT ON COLUMN partners.barrio IS 'Nombre del barrio donde se ubica el negocio';
COMMENT ON COLUMN partners.codigo_postal IS 'Código postal del negocio';
COMMENT ON COLUMN partners.latitud IS 'Coordenada GPS latitud del negocio';
COMMENT ON COLUMN partners.longitud IS 'Coordenada GPS longitud del negocio';