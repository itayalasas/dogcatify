/*
  # Catálogo de Desparasitantes para Mascotas

  1. Nueva Tabla
    - `dewormers_catalog`
      - `id` (uuid, primary key)
      - `name` (text, nombre del producto)
      - `species` (text, especie: dog/cat/both)
      - `brand` (text, marca comercial)
      - `active_ingredient` (text, principio activo)
      - `administration_method` (text, método: oral/topical/injection/chewable)
      - `parasite_types` (text[], tipos de parásitos que trata)
      - `frequency` (text, frecuencia de aplicación)
      - `age_recommendation` (text, edad recomendada)
      - `prescription_required` (boolean, requiere receta)
      - `common_side_effects` (text[], efectos secundarios)
      - `contraindications` (text[], contraindicaciones)
      - `is_active` (boolean, activo)
      - `created_at` (timestamp)

  2. Seguridad
    - Enable RLS en `dewormers_catalog`
    - Política de lectura para usuarios autenticados
    - Política de gestión solo para administradores
*/

-- Crear tabla de catálogo de desparasitantes
CREATE TABLE IF NOT EXISTS dewormers_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'both')),
  brand text,
  active_ingredient text,
  administration_method text NOT NULL CHECK (administration_method IN ('oral', 'topical', 'injection', 'chewable')),
  parasite_types text[] DEFAULT '{}',
  frequency text,
  age_recommendation text,
  prescription_required boolean DEFAULT false,
  common_side_effects text[] DEFAULT '{}',
  contraindications text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE dewormers_catalog ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Todos pueden ver desparasitantes activos"
  ON dewormers_catalog
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Solo administradores pueden gestionar desparasitantes"
  ON dewormers_catalog
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'admin@dogcatify.com'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'admin@dogcatify.com'
  ));

-- Insertar desparasitantes para perros
INSERT INTO dewormers_catalog (name, species, brand, active_ingredient, administration_method, parasite_types, frequency, age_recommendation, prescription_required, common_side_effects, contraindications) VALUES

-- Desparasitantes orales para perros
('Drontal Plus', 'dog', 'Bayer', 'Praziquantel + Pirantel + Febantel', 'oral',
 ARRAY['Lombrices intestinales', 'Tenias', 'Anquilostomas', 'Trichuris'],
 'Cada 3 meses', '2 semanas en adelante', false,
 ARRAY['Vómitos leves', 'Diarrea temporal', 'Pérdida de apetito'],
 ARRAY['Cachorros menores de 2 semanas', 'Perros enfermos']),

('Milbemax', 'dog', 'Novartis', 'Milbemicina + Praziquantel', 'oral',
 ARRAY['Lombrices', 'Tenias', 'Gusano del corazón (prevención)'],
 'Mensual para prevención, cada 3 meses para tratamiento', '2 semanas en adelante', true,
 ARRAY['Vómitos ocasionales', 'Diarrea leve', 'Letargo'],
 ARRAY['Razas sensibles a ivermectina', 'Cachorros muy jóvenes']),

('Heartgard Plus', 'dog', 'Merial', 'Ivermectina + Pirantel', 'chewable',
 ARRAY['Gusano del corazón', 'Lombrices intestinales'],
 'Mensual', '6 semanas en adelante', true,
 ARRAY['Vómitos', 'Diarrea', 'Letargo', 'Pérdida de coordinación'],
 ARRAY['Razas Collie', 'Pastor Alemán', 'Perros con mutación MDR1']),

('Panacur', 'dog', 'MSD', 'Fenbendazol', 'oral',
 ARRAY['Giardia', 'Lombrices', 'Anquilostomas', 'Trichuris'],
 '3-5 días consecutivos, repetir según necesidad', '2 semanas en adelante', false,
 ARRAY['Vómitos leves', 'Diarrea', 'Letargo'],
 ARRAY['Hembras gestantes (primer tercio)', 'Cachorros muy débiles']),

-- Desparasitantes tópicos para perros
('Revolution', 'dog', 'Pfizer', 'Selamectina', 'topical',
 ARRAY['Pulgas', 'Garrapatas', 'Gusano del corazón', 'Ácaros del oído'],
 'Mensual', '6 semanas en adelante', true,
 ARRAY['Irritación en sitio de aplicación', 'Pérdida temporal de pelo'],
 ARRAY['Piel irritada', 'Heridas abiertas']),

('Frontline Plus', 'dog', 'Merial', 'Fipronil + Metopreno', 'topical',
 ARRAY['Pulgas', 'Garrapatas', 'Piojos'],
 'Mensual', '8 semanas en adelante', false,
 ARRAY['Irritación local', 'Letargo temporal'],
 ARRAY['Cachorros menores de 8 semanas', 'Animales enfermos']),

('Bravecto', 'dog', 'MSD', 'Fluralaner', 'chewable',
 ARRAY['Pulgas', 'Garrapatas'],
 'Cada 3 meses', '6 meses en adelante', true,
 ARRAY['Vómitos', 'Diarrea', 'Letargo', 'Pérdida de apetito'],
 ARRAY['Cachorros menores de 6 meses', 'Perros con historial de convulsiones']);

-- Insertar desparasitantes para gatos
INSERT INTO dewormers_catalog (name, species, brand, active_ingredient, administration_method, parasite_types, frequency, age_recommendation, prescription_required, common_side_effects, contraindications) VALUES

-- Desparasitantes orales para gatos
('Drontal Gatos', 'cat', 'Bayer', 'Praziquantel + Pirantel', 'oral',
 ARRAY['Lombrices intestinales', 'Tenias'],
 'Cada 3 meses', '6 semanas en adelante', false,
 ARRAY['Vómitos leves', 'Diarrea temporal', 'Salivación'],
 ARRAY['Gatitos menores de 6 semanas', 'Gatos enfermos']),

('Milbemax Gatos', 'cat', 'Novartis', 'Milbemicina + Praziquantel', 'oral',
 ARRAY['Lombrices', 'Tenias', 'Gusano del corazón (prevención)'],
 'Cada 3 meses', '6 semanas en adelante', true,
 ARRAY['Vómitos', 'Diarrea', 'Letargo'],
 ARRAY['Gatitos muy jóvenes', 'Gatos con problemas hepáticos']),

('Profender', 'cat', 'Bayer', 'Emodepsida + Praziquantel', 'topical',
 ARRAY['Lombrices', 'Tenias', 'Anquilostomas'],
 'Cada 3 meses', '8 semanas en adelante', true,
 ARRAY['Irritación en sitio de aplicación', 'Lamido excesivo'],
 ARRAY['Piel dañada', 'Gatitos menores de 8 semanas']),

-- Desparasitantes tópicos para gatos
('Revolution Gatos', 'cat', 'Pfizer', 'Selamectina', 'topical',
 ARRAY['Pulgas', 'Gusano del corazón', 'Ácaros del oído', 'Lombrices'],
 'Mensual', '8 semanas en adelante', true,
 ARRAY['Irritación local', 'Pérdida temporal de pelo en aplicación'],
 ARRAY['Piel irritada', 'Heridas']),

('Frontline Gatos', 'cat', 'Merial', 'Fipronil', 'topical',
 ARRAY['Pulgas', 'Garrapatas'],
 'Mensual', '8 semanas en adelante', false,
 ARRAY['Irritación en sitio', 'Salivación si se lame'],
 ARRAY['Gatitos menores de 8 semanas']),

('Advantage II Gatos', 'cat', 'Bayer', 'Imidacloprid + Piriproxifeno', 'topical',
 ARRAY['Pulgas', 'Larvas de pulgas'],
 'Mensual', '8 semanas en adelante', false,
 ARRAY['Irritación local leve'],
 ARRAY['Piel sensible', 'Gatitos muy jóvenes']);

-- Insertar desparasitantes para ambas especies
INSERT INTO dewormers_catalog (name, species, brand, active_ingredient, administration_method, parasite_types, frequency, age_recommendation, prescription_required, common_side_effects, contraindications) VALUES

('Stronghold', 'both', 'Pfizer', 'Selamectina', 'topical',
 ARRAY['Pulgas', 'Ácaros', 'Gusano del corazón', 'Lombrices'],
 'Mensual', '6 semanas en adelante', true,
 ARRAY['Irritación temporal', 'Pérdida de pelo localizada'],
 ARRAY['Animales menores de 6 semanas', 'Piel dañada']),

('Advocate', 'both', 'Bayer', 'Imidacloprid + Moxidectina', 'topical',
 ARRAY['Pulgas', 'Lombrices', 'Gusano del corazón', 'Ácaros'],
 'Mensual', '7 semanas en adelante', true,
 ARRAY['Irritación en aplicación', 'Lamido excesivo'],
 ARRAY['Animales menores de 7 semanas', 'Heridas en piel']),

('Nexgard Spectra', 'both', 'Merial', 'Afoxolaner + Milbemicina', 'chewable',
 ARRAY['Pulgas', 'Garrapatas', 'Lombrices', 'Gusano del corazón'],
 'Mensual', '8 semanas en adelante', true,
 ARRAY['Vómitos', 'Diarrea', 'Letargo', 'Pérdida de apetito'],
 ARRAY['Animales menores de 8 semanas', 'Peso menor a 2kg']);