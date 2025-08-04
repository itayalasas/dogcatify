/*
  # Catálogo de Alergias para Mascotas

  1. Nueva Tabla
    - `allergies_catalog`
      - `id` (uuid, primary key)
      - `name` (text, nombre del alérgeno)
      - `species` (text, especie: dog/cat/both)
      - `category` (text, categoría: food/environmental/contact/medication/flea/other)
      - `description` (text, descripción)
      - `is_common` (boolean, si es común)
      - `common_symptoms` (text[], síntomas comunes)
      - `common_triggers` (text[], desencadenantes)
      - `avoidance_tips` (text[], consejos de prevención)
      - `is_active` (boolean, activa)
      - `created_at` (timestamp)

  2. Seguridad
    - Enable RLS en `allergies_catalog`
    - Política de lectura para usuarios autenticados
    - Política de gestión solo para administradores
*/

-- Crear tabla de catálogo de alergias
CREATE TABLE IF NOT EXISTS allergies_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'both')),
  category text NOT NULL CHECK (category IN ('food', 'environmental', 'contact', 'medication', 'flea', 'other')),
  description text,
  is_common boolean DEFAULT false,
  common_symptoms text[] DEFAULT '{}',
  common_triggers text[] DEFAULT '{}',
  avoidance_tips text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE allergies_catalog ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Todos pueden ver alergias activas"
  ON allergies_catalog
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Solo administradores pueden gestionar alergias"
  ON allergies_catalog
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

-- Insertar alergias alimentarias comunes
INSERT INTO allergies_catalog (name, species, category, description, is_common, common_symptoms, common_triggers, avoidance_tips) VALUES

-- Alergias alimentarias para ambas especies
('Pollo', 'both', 'food', 'Alergia a proteínas de pollo, una de las más comunes en mascotas', true,
 ARRAY['Picazón intensa', 'Enrojecimiento de piel', 'Vómitos', 'Diarrea', 'Lamido excesivo'],
 ARRAY['Alimento con pollo', 'Premios con pollo', 'Comida casera con pollo'],
 ARRAY['Dieta de eliminación', 'Alimentos hipoalergénicos', 'Leer etiquetas cuidadosamente']),

('Res/Ternera', 'both', 'food', 'Alergia a proteínas de res, común en perros y gatos', true,
 ARRAY['Dermatitis', 'Picazón', 'Problemas digestivos', 'Infecciones de oído'],
 ARRAY['Carne de res', 'Alimentos con res', 'Premios de res'],
 ARRAY['Evitar todos los productos de res', 'Usar proteínas alternativas']),

('Pescado', 'cat', 'food', 'Alergia a proteínas de pescado, especialmente común en gatos', true,
 ARRAY['Picazón facial', 'Vómitos', 'Diarrea', 'Pérdida de pelo'],
 ARRAY['Atún', 'Salmón', 'Alimentos con pescado', 'Aceite de pescado'],
 ARRAY['Dieta sin pescado', 'Revisar suplementos', 'Evitar premios de pescado']),

('Lácteos', 'both', 'food', 'Intolerancia a lactosa y proteínas lácteas', true,
 ARRAY['Diarrea', 'Vómitos', 'Gases', 'Malestar abdominal'],
 ARRAY['Leche', 'Queso', 'Yogurt', 'Helado'],
 ARRAY['Eliminar todos los lácteos', 'Leer ingredientes', 'Usar alternativas sin lactosa']),

('Huevos', 'both', 'food', 'Alergia a proteínas del huevo', false,
 ARRAY['Picazón', 'Urticaria', 'Vómitos', 'Diarrea'],
 ARRAY['Huevos enteros', 'Alimentos con huevo', 'Premios con huevo'],
 ARRAY['Evitar huevos completamente', 'Revisar ingredientes de alimentos']),

('Trigo/Gluten', 'both', 'food', 'Alergia al gluten y proteínas del trigo', false,
 ARRAY['Problemas digestivos', 'Picazón', 'Pérdida de peso', 'Diarrea crónica'],
 ARRAY['Pan', 'Cereales con trigo', 'Alimentos con gluten'],
 ARRAY['Dieta libre de gluten', 'Alimentos grain-free', 'Leer etiquetas']),

('Soja', 'both', 'food', 'Alergia a proteínas de soja', false,
 ARRAY['Picazón', 'Problemas digestivos', 'Hinchazón'],
 ARRAY['Alimentos con soja', 'Aceite de soja', 'Lecitina de soja'],
 ARRAY['Evitar productos con soja', 'Revisar ingredientes']),

('Maíz', 'both', 'food', 'Alergia al maíz y sus derivados', false,
 ARRAY['Picazón', 'Problemas de piel', 'Diarrea'],
 ARRAY['Harina de maíz', 'Jarabe de maíz', 'Alimentos con maíz'],
 ARRAY['Dieta sin maíz', 'Alimentos naturales']);

-- Insertar alergias ambientales
INSERT INTO allergies_catalog (name, species, category, description, is_common, common_symptoms, common_triggers, avoidance_tips) VALUES

('Polen', 'both', 'environmental', 'Alergia estacional al polen de plantas', true,
 ARRAY['Estornudos', 'Ojos llorosos', 'Picazón', 'Lamido de patas'],
 ARRAY['Primavera', 'Paseos en parques', 'Ventanas abiertas'],
 ARRAY['Limpiar patas después de paseos', 'Usar purificadores de aire', 'Bañar más frecuentemente']),

('Ácaros del polvo', 'both', 'environmental', 'Alergia a ácaros microscópicos en el hogar', true,
 ARRAY['Picazón constante', 'Estornudos', 'Ojos irritados', 'Tos'],
 ARRAY['Camas', 'Alfombras', 'Cortinas', 'Peluches'],
 ARRAY['Aspirar frecuentemente', 'Lavar ropa de cama en agua caliente', 'Usar fundas antialérgicas']),

('Moho', 'both', 'environmental', 'Alergia a esporas de hongos y moho', false,
 ARRAY['Problemas respiratorios', 'Picazón', 'Estornudos'],
 ARRAY['Humedad alta', 'Sótanos', 'Baños húmedos'],
 ARRAY['Controlar humedad', 'Ventilar espacios', 'Limpiar moho visible']),

('Hierba', 'dog', 'environmental', 'Alergia al contacto con ciertos tipos de hierba', true,
 ARRAY['Picazón en patas', 'Enrojecimiento entre dedos', 'Lamido excesivo'],
 ARRAY['Césped recién cortado', 'Hierba húmeda', 'Ciertos tipos de pasto'],
 ARRAY['Limpiar patas después de paseos', 'Evitar césped recién cortado', 'Usar botitas protectoras']),

('Perfumes y fragancias', 'both', 'environmental', 'Sensibilidad a fragancias artificiales', false,
 ARRAY['Estornudos', 'Irritación respiratoria', 'Picazón'],
 ARRAY['Perfumes', 'Ambientadores', 'Productos de limpieza perfumados'],
 ARRAY['Usar productos sin fragancia', 'Ventilar después de limpiar']);

-- Insertar alergias de contacto
INSERT INTO allergies_catalog (name, species, category, description, is_common, common_symptoms, common_triggers, avoidance_tips) VALUES

('Pulgas', 'both', 'flea', 'Dermatitis alérgica por picadura de pulgas', true,
 ARRAY['Picazón intensa', 'Enrojecimiento', 'Pérdida de pelo', 'Costras'],
 ARRAY['Picaduras de pulgas', 'Saliva de pulgas', 'Infestación'],
 ARRAY['Control de pulgas regular', 'Aspirar frecuentemente', 'Tratar todos los animales']),

('Champús y productos de baño', 'both', 'contact', 'Reacción a químicos en productos de higiene', false,
 ARRAY['Irritación de piel', 'Enrojecimiento', 'Picazón después del baño'],
 ARRAY['Champús con químicos', 'Acondicionadores', 'Productos perfumados'],
 ARRAY['Usar champús hipoalergénicos', 'Enjuagar completamente', 'Probar productos naturales']),

('Collares y correas', 'both', 'contact', 'Alergia a materiales de collares o correas', false,
 ARRAY['Irritación en cuello', 'Pérdida de pelo en collar', 'Enrojecimiento'],
 ARRAY['Collares de cuero', 'Materiales sintéticos', 'Tintes en collares'],
 ARRAY['Usar collares hipoalergénicos', 'Cambiar material', 'Limpiar collares regularmente']),

('Plantas domésticas', 'both', 'contact', 'Reacción al contacto con ciertas plantas', false,
 ARRAY['Irritación de piel', 'Hinchazón', 'Picazón localizada'],
 ARRAY['Hiedra', 'Filodendro', 'Lirios', 'Azaleas'],
 ARRAY['Identificar plantas tóxicas', 'Mantener plantas fuera del alcance', 'Supervisar contacto']);

-- Insertar alergias a medicamentos
INSERT INTO allergies_catalog (name, species, category, description, is_common, common_symptoms, common_triggers, avoidance_tips) VALUES

('Penicilina', 'both', 'medication', 'Alergia a antibióticos del grupo penicilina', false,
 ARRAY['Urticaria', 'Hinchazón facial', 'Dificultad respiratoria', 'Vómitos'],
 ARRAY['Amoxicilina', 'Ampicilina', 'Penicilina G'],
 ARRAY['Informar al veterinario', 'Usar antibióticos alternativos', 'Llevar historial médico']),

('Vacunas', 'both', 'medication', 'Reacción alérgica a componentes de vacunas', false,
 ARRAY['Hinchazón facial', 'Urticaria', 'Letargo severo', 'Vómitos'],
 ARRAY['Conservantes en vacunas', 'Proteínas de huevo en vacunas'],
 ARRAY['Pre-medicación antes de vacunas', 'Observación post-vacunal', 'Vacunas individuales']),

('Anestésicos', 'both', 'medication', 'Reacción a medicamentos anestésicos', false,
 ARRAY['Reacciones durante cirugía', 'Recuperación prolongada', 'Vómitos post-anestesia'],
 ARRAY['Isoflurano', 'Propofol', 'Ketamina'],
 ARRAY['Informar historial anestésico', 'Pre-evaluación completa', 'Monitoreo intensivo']);