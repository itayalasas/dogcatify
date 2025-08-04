/*
  # Catálogo de Vacunas para Mascotas

  1. Nueva Tabla
    - `vaccines_catalog`
      - `id` (uuid, primary key)
      - `name` (text, nombre de la vacuna)
      - `species` (text, especie: dog/cat/both)
      - `type` (text, tipo: core/non_core/lifestyle)
      - `description` (text, descripción)
      - `is_required` (boolean, si es obligatoria)
      - `frequency` (text, frecuencia de aplicación)
      - `age_recommendation` (text, edad recomendada)
      - `common_brands` (text[], marcas comunes)
      - `side_effects` (text[], efectos secundarios)
      - `contraindications` (text[], contraindicaciones)
      - `is_active` (boolean, activa)
      - `created_at` (timestamp)

  2. Seguridad
    - Enable RLS en `vaccines_catalog`
    - Política de lectura para usuarios autenticados
    - Política de gestión solo para administradores
*/

-- Crear tabla de catálogo de vacunas
CREATE TABLE IF NOT EXISTS vaccines_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'both')),
  type text NOT NULL CHECK (type IN ('core', 'non_core', 'lifestyle')),
  description text,
  is_required boolean DEFAULT false,
  frequency text,
  age_recommendation text,
  common_brands text[] DEFAULT '{}',
  side_effects text[] DEFAULT '{}',
  contraindications text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE vaccines_catalog ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Todos pueden ver vacunas activas"
  ON vaccines_catalog
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Solo administradores pueden gestionar vacunas"
  ON vaccines_catalog
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

-- Insertar vacunas para perros
INSERT INTO vaccines_catalog (name, species, type, description, is_required, frequency, age_recommendation, common_brands, side_effects, contraindications) VALUES

-- Vacunas esenciales para perros
('Rabia', 'dog', 'core', 'Vacuna contra el virus de la rabia, obligatoria por ley en la mayoría de países', true, 'Anual', '12-16 semanas, refuerzo anual', 
 ARRAY['Nobivac', 'Vanguard', 'Duramune'], 
 ARRAY['Dolor en el sitio de inyección', 'Letargo leve', 'Fiebre baja'], 
 ARRAY['Enfermedad febril aguda', 'Inmunodeficiencia']),

('DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)', 'dog', 'core', 'Vacuna combinada contra las principales enfermedades virales caninas', true, 'Anual', '6-8 semanas, refuerzos cada 3-4 semanas hasta las 16 semanas', 
 ARRAY['Nobivac DHPPi', 'Vanguard Plus', 'Duramune Max'], 
 ARRAY['Hinchazón en el sitio', 'Letargo', 'Pérdida de apetito temporal'], 
 ARRAY['Cachorros menores de 6 semanas', 'Enfermedad aguda']),

('Parvovirus', 'dog', 'core', 'Protección específica contra el parvovirus canino', true, 'Anual', '6-8 semanas con refuerzos', 
 ARRAY['Nobivac Parvo-C', 'Vanguard CPV'], 
 ARRAY['Vómitos leves', 'Diarrea temporal', 'Letargo'], 
 ARRAY['Cachorros muy jóvenes', 'Perros enfermos']),

-- Vacunas no esenciales pero recomendadas para perros
('Bordetella (Tos de las perreras)', 'dog', 'non_core', 'Protección contra la traqueobronquitis infecciosa canina', false, 'Anual', '8 semanas en adelante', 
 ARRAY['Nobivac KC', 'Bronchi-Shield'], 
 ARRAY['Tos leve', 'Estornudos', 'Secreción nasal'], 
 ARRAY['Enfermedad respiratoria activa']),

('Lyme', 'dog', 'lifestyle', 'Protección contra la enfermedad de Lyme transmitida por garrapatas', false, 'Anual', '12 semanas, zonas endémicas', 
 ARRAY['Nobivac Lyme', 'Vanguard crLyme'], 
 ARRAY['Cojera temporal', 'Fiebre', 'Pérdida de apetito'], 
 ARRAY['Perros sin exposición a garrapatas']),

('Leptospirosis', 'dog', 'non_core', 'Protección contra infección bacteriana que afecta riñones e hígado', false, 'Anual', '12 semanas en adelante', 
 ARRAY['Nobivac Lepto', 'Vanguard Lepto'], 
 ARRAY['Reacciones alérgicas', 'Vómitos', 'Diarrea'], 
 ARRAY['Cachorros menores de 12 semanas', 'Razas pequeñas sensibles']),

('Coronavirus Canino', 'dog', 'non_core', 'Protección contra coronavirus que causa diarrea', false, 'Anual', '6-8 semanas', 
 ARRAY['Nobivac Corona', 'Duramune CvK'], 
 ARRAY['Diarrea leve', 'Vómitos ocasionales'], 
 ARRAY['Perros con diarrea activa']),

('Giardia', 'dog', 'lifestyle', 'Protección contra parásito intestinal Giardia', false, 'Anual', '8 semanas en adelante', 
 ARRAY['GiardiaVax'], 
 ARRAY['Diarrea temporal', 'Malestar abdominal'], 
 ARRAY['Infección activa por Giardia']);

-- Insertar vacunas para gatos
INSERT INTO vaccines_catalog (name, species, type, description, is_required, frequency, age_recommendation, common_brands, side_effects, contraindications) VALUES

-- Vacunas esenciales para gatos
('Rabia Felina', 'cat', 'core', 'Vacuna contra el virus de la rabia, obligatoria por ley', true, 'Anual o trienal', '12-16 semanas, refuerzo anual', 
 ARRAY['Nobivac Rabies', 'Purevax Rabies'], 
 ARRAY['Dolor en el sitio', 'Letargo', 'Fiebre leve'], 
 ARRAY['Enfermedad febril', 'Gatos inmunodeprimidos']),

('FVRCP (Rinotraqueítis, Calicivirus, Panleucopenia)', 'cat', 'core', 'Vacuna combinada contra las principales enfermedades virales felinas', true, 'Anual', '6-8 semanas, refuerzos cada 3-4 semanas hasta las 16 semanas', 
 ARRAY['Nobivac Tricat', 'Purevax FVRCP', 'Fel-O-Vax'], 
 ARRAY['Hinchazón local', 'Letargo', 'Pérdida de apetito'], 
 ARRAY['Gatitos menores de 6 semanas', 'Enfermedad aguda']),

('Panleucopenia Felina', 'cat', 'core', 'Protección específica contra parvovirus felino', true, 'Anual', '6-8 semanas con refuerzos', 
 ARRAY['Nobivac Forcat', 'Purevax FPV'], 
 ARRAY['Vómitos leves', 'Diarrea', 'Letargo'], 
 ARRAY['Gatitos muy jóvenes', 'Gatos enfermos']),

-- Vacunas no esenciales para gatos
('Leucemia Felina (FeLV)', 'cat', 'non_core', 'Protección contra el virus de leucemia felina', false, 'Anual', '8-12 semanas, gatos con acceso al exterior', 
 ARRAY['Nobivac FeLV', 'Purevax FeLV'], 
 ARRAY['Letargo', 'Pérdida de apetito', 'Fiebre'], 
 ARRAY['Gatos FeLV positivos', 'Gatos de interior sin contacto']),

('Clamidiosis Felina', 'cat', 'non_core', 'Protección contra Chlamydia felis que causa conjuntivitis', false, 'Anual', '9 semanas en adelante', 
 ARRAY['Nobivac Bb', 'Fel-O-Vax PCT'], 
 ARRAY['Conjuntivitis leve', 'Estornudos'], 
 ARRAY['Infección ocular activa']),

('Peritonitis Infecciosa Felina (FIP)', 'cat', 'non_core', 'Protección contra coronavirus felino', false, 'Anual', '16 semanas en adelante', 
 ARRAY['Primucell FIP'], 
 ARRAY['Fiebre', 'Letargo', 'Pérdida de peso'], 
 ARRAY['Gatos menores de 16 semanas', 'Exposición previa al coronavirus']);

-- Insertar vacunas para ambas especies
INSERT INTO vaccines_catalog (name, species, type, description, is_required, frequency, age_recommendation, common_brands, side_effects, contraindications) VALUES

('Microchip + Vacuna', 'both', 'lifestyle', 'Colocación de microchip junto con vacunación', false, 'Una vez', 'Cualquier edad', 
 ARRAY['HomeAgain', 'AVID'], 
 ARRAY['Dolor leve en inserción'], 
 ARRAY['Infección en el sitio de inserción']);