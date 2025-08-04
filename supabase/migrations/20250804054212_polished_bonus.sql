/*
  # Create medical nomenclators for vaccines, allergies and dewormers

  1. New Tables
    - `vaccines_catalog` - Catálogo de vacunas por especie
    - `allergies_catalog` - Catálogo de alérgenos comunes
    - `dewormers_catalog` - Catálogo de productos desparasitantes

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
    - Add policies for admin management

  3. Sample Data
    - Common vaccines for dogs and cats
    - Common allergens
    - Common deworming products
*/

-- Create vaccines catalog table
CREATE TABLE IF NOT EXISTS vaccines_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  species text NOT NULL CHECK (species = ANY (ARRAY['dog'::text, 'cat'::text, 'both'::text])),
  type text NOT NULL CHECK (type = ANY (ARRAY['core'::text, 'non_core'::text, 'lifestyle'::text])),
  description text,
  frequency text, -- "Annual", "Every 3 years", "Puppy series", etc.
  age_recommendation text, -- "6-8 weeks", "Adult", "Senior", etc.
  common_brands text[], -- Array of common brand names
  side_effects text[], -- Array of possible side effects
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create allergies catalog table
CREATE TABLE IF NOT EXISTS allergies_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['food'::text, 'environmental'::text, 'contact'::text, 'medication'::text, 'flea'::text, 'other'::text])),
  species text NOT NULL CHECK (species = ANY (ARRAY['dog'::text, 'cat'::text, 'both'::text])),
  description text,
  common_symptoms text[], -- Array of typical symptoms
  severity_levels text[] DEFAULT ARRAY['Leve'::text, 'Moderada'::text, 'Severa'::text],
  common_triggers text[], -- Array of common triggers
  avoidance_tips text[], -- Array of avoidance recommendations
  is_common boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dewormers catalog table
CREATE TABLE IF NOT EXISTS dewormers_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  active_ingredient text,
  species text NOT NULL CHECK (species = ANY (ARRAY['dog'::text, 'cat'::text, 'both'::text])),
  parasite_types text[], -- Array of parasites it treats
  administration_method text CHECK (administration_method = ANY (ARRAY['oral'::text, 'topical'::text, 'injection'::text, 'chewable'::text])),
  frequency text, -- "Monthly", "Every 3 months", "As needed", etc.
  age_recommendation text, -- "Puppies 6+ weeks", "Adult", etc.
  weight_based_dosing boolean DEFAULT true,
  prescription_required boolean DEFAULT true,
  common_side_effects text[],
  contraindications text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vaccines_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE dewormers_catalog ENABLE ROW LEVEL SECURITY;

-- Create policies for vaccines_catalog
CREATE POLICY "Anyone can view active vaccines"
  ON vaccines_catalog
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only admins can manage vaccines"
  ON vaccines_catalog
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = uid() AND profiles.email = 'admin@dogcatify.com'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = uid() AND profiles.email = 'admin@dogcatify.com'
  ));

-- Create policies for allergies_catalog
CREATE POLICY "Anyone can view active allergies"
  ON allergies_catalog
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only admins can manage allergies"
  ON allergies_catalog
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = uid() AND profiles.email = 'admin@dogcatify.com'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = uid() AND profiles.email = 'admin@dogcatify.com'
  ));

-- Create policies for dewormers_catalog
CREATE POLICY "Anyone can view active dewormers"
  ON dewormers_catalog
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only admins can manage dewormers"
  ON dewormers_catalog
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = uid() AND profiles.email = 'admin@dogcatify.com'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = uid() AND profiles.email = 'admin@dogcatify.com'
  ));

-- Insert sample vaccines data
INSERT INTO vaccines_catalog (name, species, type, description, frequency, age_recommendation, common_brands, is_required) VALUES
-- Core vaccines for dogs
('Rabia', 'dog', 'core', 'Vacuna contra la rabia, obligatoria por ley', 'Anual', '12-16 semanas', ARRAY['Nobivac', 'Vanguard', 'Duramune'], true),
('DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)', 'dog', 'core', 'Vacuna combinada contra enfermedades principales', 'Anual', '6-8 semanas (serie)', ARRAY['Nobivac', 'Vanguard', 'Duramune'], true),
('Parvovirus', 'dog', 'core', 'Vacuna contra parvovirus canino', 'Anual', '6-8 semanas', ARRAY['Nobivac', 'Vanguard'], true),
('Distemper', 'dog', 'core', 'Vacuna contra moquillo canino', 'Anual', '6-8 semanas', ARRAY['Nobivac', 'Vanguard'], true),

-- Non-core vaccines for dogs
('Bordetella (Tos de las perreras)', 'dog', 'non_core', 'Vacuna contra tos de las perreras', 'Anual', '6-8 semanas', ARRAY['Nobivac', 'Bronchi-Shield'], false),
('Lyme', 'dog', 'lifestyle', 'Vacuna contra enfermedad de Lyme', 'Anual', '12 semanas', ARRAY['Nobivac', 'Vanguard'], false),
('Leptospirosis', 'dog', 'non_core', 'Vacuna contra leptospirosis', 'Anual', '12 semanas', ARRAY['Nobivac', 'Vanguard'], false),

-- Core vaccines for cats
('Rabia', 'cat', 'core', 'Vacuna contra la rabia, obligatoria por ley', 'Anual', '12-16 semanas', ARRAY['Nobivac', 'Purevax'], true),
('FVRCP (Rinotraqueitis, Calicivirus, Panleucopenia)', 'cat', 'core', 'Vacuna triple felina', 'Anual', '6-8 semanas (serie)', ARRAY['Nobivac', 'Purevax'], true),
('Panleucopenia Felina', 'cat', 'core', 'Vacuna contra panleucopenia', 'Anual', '6-8 semanas', ARRAY['Nobivac', 'Purevax'], true),

-- Non-core vaccines for cats
('Leucemia Felina (FeLV)', 'cat', 'non_core', 'Vacuna contra leucemia felina', 'Anual', '8-12 semanas', ARRAY['Nobivac', 'Purevax'], false),
('Peritonitis Infecciosa Felina (FIP)', 'cat', 'non_core', 'Vacuna contra FIP', 'Anual', '16 semanas', ARRAY['Primucell'], false);

-- Insert sample allergies data
INSERT INTO allergies_catalog (name, category, species, description, common_symptoms, common_triggers, is_common) VALUES
-- Food allergies
('Pollo', 'food', 'both', 'Alergia a proteínas de pollo', ARRAY['Picazón', 'Vómitos', 'Diarrea', 'Enrojecimiento'], ARRAY['Alimento con pollo', 'Premios con pollo'], true),
('Res/Ternera', 'food', 'both', 'Alergia a proteínas de res', ARRAY['Picazón', 'Problemas digestivos', 'Inflamación'], ARRAY['Alimento con res', 'Huesos de res'], true),
('Pescado', 'food', 'both', 'Alergia a proteínas de pescado', ARRAY['Picazón', 'Vómitos', 'Urticaria'], ARRAY['Alimento con pescado', 'Premios de atún'], true),
('Lácteos', 'food', 'both', 'Intolerancia a lactosa', ARRAY['Diarrea', 'Vómitos', 'Gases'], ARRAY['Leche', 'Queso', 'Yogurt'], true),
('Trigo/Gluten', 'food', 'both', 'Alergia al gluten', ARRAY['Problemas digestivos', 'Picazón', 'Pérdida de peso'], ARRAY['Alimentos con trigo', 'Pan'], false),

-- Environmental allergies
('Polen', 'environmental', 'both', 'Alergia estacional al polen', ARRAY['Estornudos', 'Ojos llorosos', 'Picazón'], ARRAY['Primavera', 'Plantas con flor'], true),
('Ácaros del polvo', 'environmental', 'both', 'Alergia a ácaros domésticos', ARRAY['Picazón', 'Estornudos', 'Irritación'], ARRAY['Polvo', 'Alfombras', 'Camas'], true),
('Moho', 'environmental', 'both', 'Alergia a esporas de moho', ARRAY['Problemas respiratorios', 'Picazón'], ARRAY['Humedad', 'Lugares húmedos'], false),
('Hierba', 'environmental', 'both', 'Alergia a pastos', ARRAY['Picazón en patas', 'Enrojecimiento'], ARRAY['Caminar en pasto', 'Jardines'], true),

-- Contact allergies
('Pulgas', 'contact', 'both', 'Dermatitis alérgica por pulgas', ARRAY['Picazón intensa', 'Enrojecimiento', 'Pérdida de pelo'], ARRAY['Picaduras de pulgas'], true),
('Champús', 'contact', 'both', 'Alergia a productos de higiene', ARRAY['Irritación de piel', 'Enrojecimiento'], ARRAY['Champús', 'Jabones'], false),
('Materiales sintéticos', 'contact', 'both', 'Alergia a tejidos sintéticos', ARRAY['Dermatitis de contacto', 'Picazón'], ARRAY['Camas sintéticas', 'Juguetes de plástico'], false),

-- Medication allergies
('Penicilina', 'medication', 'both', 'Alergia a antibióticos penicilina', ARRAY['Urticaria', 'Dificultad respiratoria', 'Hinchazón'], ARRAY['Antibióticos'], false),
('Vacunas', 'medication', 'both', 'Reacción alérgica a vacunas', ARRAY['Hinchazón', 'Letargo', 'Fiebre'], ARRAY['Aplicación de vacunas'], false);

-- Insert sample dewormers data
INSERT INTO dewormers_catalog (name, brand, active_ingredient, species, parasite_types, administration_method, frequency, age_recommendation, prescription_required) VALUES
-- Oral dewormers
('Drontal Plus', 'Bayer', 'Praziquantel + Pyrantel + Febantel', 'dog', ARRAY['Lombrices', 'Tenias', 'Anquilostomas'], 'oral', 'Cada 3 meses', 'Cachorros 2+ semanas', true),
('Milbemax', 'Novartis', 'Milbemicina + Praziquantel', 'both', ARRAY['Lombrices', 'Tenias', 'Gusanos del corazón'], 'oral', 'Mensual', 'Cachorros 2+ semanas', true),
('Panacur', 'MSD', 'Fenbendazol', 'both', ARRAY['Lombrices', 'Giardia', 'Anquilostomas'], 'oral', 'Según necesidad', 'Cachorros 2+ semanas', true),
('Drontal Gato', 'Bayer', 'Praziquantel + Pyrantel', 'cat', ARRAY['Lombrices', 'Tenias'], 'oral', 'Cada 3 meses', 'Gatitos 6+ semanas', true),

-- Topical dewormers
('Revolution', 'Pfizer', 'Selamectina', 'both', ARRAY['Pulgas', 'Gusanos del corazón', 'Ácaros'], 'topical', 'Mensual', 'Cachorros 6+ semanas', true),
('Advantage Multi', 'Bayer', 'Imidacloprid + Moxidectina', 'both', ARRAY['Pulgas', 'Gusanos del corazón', 'Lombrices'], 'topical', 'Mensual', 'Cachorros 7+ semanas', true),
('Frontline Plus', 'Merial', 'Fipronil + Methoprene', 'both', ARRAY['Pulgas', 'Garrapatas'], 'topical', 'Mensual', 'Cachorros 8+ semanas', true),

-- Chewable dewormers
('Heartgard Plus', 'Merial', 'Ivermectina + Pyrantel', 'dog', ARRAY['Gusanos del corazón', 'Lombrices'], 'chewable', 'Mensual', 'Cachorros 6+ semanas', true),
('Nexgard', 'Merial', 'Afoxolaner', 'dog', ARRAY['Pulgas', 'Garrapatas'], 'chewable', 'Mensual', 'Cachorros 8+ semanas', true),
('Simparica', 'Zoetis', 'Sarolaner', 'dog', ARRAY['Pulgas', 'Garrapatas'], 'chewable', 'Mensual', 'Cachorros 6+ meses', true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vaccines_catalog_species ON vaccines_catalog(species, is_active);
CREATE INDEX IF NOT EXISTS idx_vaccines_catalog_type ON vaccines_catalog(type, species);
CREATE INDEX IF NOT EXISTS idx_allergies_catalog_species ON allergies_catalog(species, is_active);
CREATE INDEX IF NOT EXISTS idx_allergies_catalog_category ON allergies_catalog(category, species);
CREATE INDEX IF NOT EXISTS idx_dewormers_catalog_species ON dewormers_catalog(species, is_active);
CREATE INDEX IF NOT EXISTS idx_dewormers_catalog_method ON dewormers_catalog(administration_method, species);