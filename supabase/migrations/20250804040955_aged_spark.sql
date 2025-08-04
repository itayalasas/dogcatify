/*
  # Sistema de nomencladores médicos para mascotas

  1. Nuevas Tablas
    - `medical_conditions` - Enfermedades comunes por especie
    - `medical_treatments` - Tratamientos comunes por condición
    - `veterinary_clinics` - Clínicas veterinarias registradas

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para lectura pública
    - Políticas para administradores

  3. Datos iniciales
    - Enfermedades comunes para perros y gatos
    - Tratamientos asociados
    - Severidades estándar
*/

-- Tabla de condiciones médicas por especie
CREATE TABLE IF NOT EXISTS medical_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'both')),
  category text NOT NULL CHECK (category IN ('infectious', 'parasitic', 'genetic', 'behavioral', 'digestive', 'respiratory', 'skin', 'orthopedic', 'neurological', 'cardiac', 'urinary', 'reproductive', 'endocrine', 'oncological', 'other')),
  description text,
  common_symptoms text[],
  severity_levels text[] DEFAULT ARRAY['Leve', 'Moderada', 'Severa', 'Crítica'],
  is_chronic boolean DEFAULT false,
  is_contagious boolean DEFAULT false,
  prevention_tips text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de tratamientos médicos
CREATE TABLE IF NOT EXISTS medical_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id uuid REFERENCES medical_conditions(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('medication', 'therapy', 'surgery', 'diet', 'lifestyle', 'supplement', 'topical', 'injection', 'other')),
  description text,
  dosage_info text,
  duration_info text,
  side_effects text[],
  contraindications text[],
  cost_range text,
  is_prescription_required boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabla de clínicas veterinarias
CREATE TABLE IF NOT EXISTS veterinary_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  specialties text[],
  emergency_service boolean DEFAULT false,
  rating numeric(2,1) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE veterinary_clinics ENABLE ROW LEVEL SECURITY;

-- Políticas para medical_conditions
CREATE POLICY "Todos pueden ver condiciones médicas activas"
  ON medical_conditions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Solo administradores pueden gestionar condiciones médicas"
  ON medical_conditions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email = 'admin@dogcatify.com'
    )
  );

-- Políticas para medical_treatments
CREATE POLICY "Todos pueden ver tratamientos activos"
  ON medical_treatments
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Solo administradores pueden gestionar tratamientos"
  ON medical_treatments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email = 'admin@dogcatify.com'
    )
  );

-- Políticas para veterinary_clinics
CREATE POLICY "Todos pueden ver clínicas activas"
  ON veterinary_clinics
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Solo administradores pueden gestionar clínicas"
  ON veterinary_clinics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email = 'admin@dogcatify.com'
    )
  );

-- Insertar datos iniciales para PERROS
INSERT INTO medical_conditions (name, species, category, description, common_symptoms, is_chronic, is_contagious, prevention_tips) VALUES
-- Enfermedades infecciosas
('Parvovirus Canino', 'dog', 'infectious', 'Enfermedad viral grave que afecta el sistema digestivo', ARRAY['Vómitos', 'Diarrea sanguinolenta', 'Letargo', 'Pérdida de apetito', 'Fiebre'], false, true, ARRAY['Vacunación completa', 'Evitar contacto con perros no vacunados', 'Higiene adecuada']),
('Moquillo Canino', 'dog', 'infectious', 'Enfermedad viral que afecta múltiples sistemas', ARRAY['Fiebre', 'Secreción nasal', 'Tos', 'Letargo', 'Convulsiones'], false, true, ARRAY['Vacunación', 'Evitar contacto con animales infectados']),
('Tos de las Perreras', 'dog', 'respiratory', 'Infección respiratoria contagiosa', ARRAY['Tos seca persistente', 'Arcadas', 'Secreción nasal'], false, true, ARRAY['Vacunación', 'Evitar lugares con muchos perros']),

-- Enfermedades parasitarias
('Pulgas', 'dog', 'parasitic', 'Infestación de pulgas externas', ARRAY['Picazón intensa', 'Rascado excesivo', 'Pérdida de pelo', 'Irritación de la piel'], false, true, ARRAY['Tratamiento antipulgas regular', 'Limpieza del ambiente', 'Revisión regular']),
('Garrapatas', 'dog', 'parasitic', 'Infestación de garrapatas', ARRAY['Presencia visible de garrapatas', 'Irritación local', 'Letargo'], false, true, ARRAY['Revisión regular', 'Productos antiparasitarios', 'Evitar áreas infestadas']),
('Gusanos Intestinales', 'dog', 'parasitic', 'Parásitos intestinales', ARRAY['Diarrea', 'Vómitos', 'Pérdida de peso', 'Abdomen hinchado'], false, false, ARRAY['Desparasitación regular', 'Higiene adecuada', 'Evitar heces de otros animales']),

-- Enfermedades de la piel
('Dermatitis Atópica', 'dog', 'skin', 'Inflamación crónica de la piel por alergias', ARRAY['Picazón', 'Enrojecimiento', 'Pérdida de pelo', 'Lesiones por rascado'], true, false, ARRAY['Identificar alérgenos', 'Dieta hipoalergénica', 'Ambiente limpio']),
('Otitis Externa', 'dog', 'skin', 'Inflamación del oído externo', ARRAY['Sacudida de cabeza', 'Rascado de orejas', 'Mal olor', 'Secreción'], false, false, ARRAY['Limpieza regular de oídos', 'Mantener orejas secas']),

-- Enfermedades digestivas
('Gastritis', 'dog', 'digestive', 'Inflamación del estómago', ARRAY['Vómitos', 'Pérdida de apetito', 'Letargo', 'Dolor abdominal'], false, false, ARRAY['Dieta adecuada', 'Evitar comida en mal estado', 'Comidas regulares']),
('Diarrea', 'dog', 'digestive', 'Heces líquidas frecuentes', ARRAY['Heces líquidas', 'Frecuencia aumentada', 'Deshidratación'], false, false, ARRAY['Dieta balanceada', 'Agua limpia', 'Evitar cambios bruscos de alimentación']),

-- Enfermedades ortopédicas
('Displasia de Cadera', 'dog', 'orthopedic', 'Malformación de la articulación de la cadera', ARRAY['Cojera', 'Dificultad para levantarse', 'Dolor', 'Rigidez'], true, false, ARRAY['Control de peso', 'Ejercicio moderado', 'Suplementos articulares']),
('Luxación de Rótula', 'dog', 'orthopedic', 'Dislocación de la rótula', ARRAY['Cojera intermitente', 'Salto en tres patas', 'Dolor'], false, false, ARRAY['Control de peso', 'Ejercicio controlado', 'Evitar saltos excesivos']);

-- Insertar datos iniciales para GATOS
INSERT INTO medical_conditions (name, species, category, description, common_symptoms, is_chronic, is_contagious, prevention_tips) VALUES
-- Enfermedades infecciosas
('Rinotraqueítis Felina', 'cat', 'infectious', 'Infección viral respiratoria', ARRAY['Estornudos', 'Secreción nasal', 'Conjuntivitis', 'Fiebre'], false, true, ARRAY['Vacunación', 'Evitar contacto con gatos infectados', 'Ambiente limpio']),
('Calicivirus Felino', 'cat', 'infectious', 'Virus que causa problemas respiratorios y orales', ARRAY['Úlceras bucales', 'Estornudos', 'Fiebre', 'Pérdida de apetito'], false, true, ARRAY['Vacunación', 'Aislamiento de gatos infectados']),
('Panleucopenia Felina', 'cat', 'infectious', 'Enfermedad viral grave similar al parvovirus', ARRAY['Vómitos', 'Diarrea', 'Deshidratación', 'Letargo'], false, true, ARRAY['Vacunación temprana', 'Higiene estricta']),

-- Enfermedades parasitarias
('Pulgas Felinas', 'cat', 'parasitic', 'Infestación de pulgas específicas de gatos', ARRAY['Rascado excesivo', 'Pérdida de pelo', 'Irritación de la piel', 'Anemia'], false, true, ARRAY['Tratamiento antipulgas', 'Limpieza del ambiente', 'Revisión regular']),
('Ácaros del Oído', 'cat', 'parasitic', 'Parásitos en el canal auditivo', ARRAY['Rascado intenso de orejas', 'Secreción oscura', 'Mal olor', 'Sacudida de cabeza'], false, true, ARRAY['Limpieza regular de oídos', 'Tratamiento preventivo']),

-- Enfermedades urinarias
('Cistitis Idiopática Felina', 'cat', 'urinary', 'Inflamación de la vejiga sin causa aparente', ARRAY['Dificultad para orinar', 'Sangre en orina', 'Orinar fuera de la caja', 'Dolor'], true, false, ARRAY['Reducir estrés', 'Dieta húmeda', 'Múltiples cajas de arena']),
('Cálculos Urinarios', 'cat', 'urinary', 'Formación de cristales en el tracto urinario', ARRAY['Dificultad para orinar', 'Sangre en orina', 'Vocalización al orinar'], false, false, ARRAY['Dieta específica', 'Hidratación adecuada', 'Control veterinario regular']),

-- Enfermedades de la piel
('Dermatitis por Alergia Alimentaria', 'cat', 'skin', 'Reacción alérgica a componentes de la dieta', ARRAY['Picazón', 'Pérdida de pelo', 'Lesiones por rascado', 'Problemas digestivos'], true, false, ARRAY['Dieta hipoalergénica', 'Identificar alérgenos', 'Evitar cambios bruscos de comida']),
('Acné Felino', 'cat', 'skin', 'Inflamación de los folículos pilosos en el mentón', ARRAY['Puntos negros en mentón', 'Inflamación', 'Costras'], false, false, ARRAY['Limpieza regular del mentón', 'Platos de acero inoxidable o cerámica']),

-- Enfermedades respiratorias
('Asma Felino', 'cat', 'respiratory', 'Enfermedad respiratoria crónica', ARRAY['Tos', 'Dificultad respiratoria', 'Respiración con boca abierta', 'Letargo'], true, false, ARRAY['Evitar irritantes ambientales', 'Control del polvo', 'Ambiente libre de humo']);

-- Insertar tratamientos para enfermedades de PERROS
INSERT INTO medical_treatments (condition_id, name, type, description, dosage_info, duration_info, is_prescription_required) VALUES
-- Tratamientos para Parvovirus
((SELECT id FROM medical_conditions WHERE name = 'Parvovirus Canino'), 'Fluidoterapia IV', 'therapy', 'Rehidratación intravenosa', 'Según peso y deshidratación', '3-7 días', true),
((SELECT id FROM medical_conditions WHERE name = 'Parvovirus Canino'), 'Antieméticos', 'medication', 'Medicamentos contra vómitos', 'Según prescripción veterinaria', 'Hasta control de síntomas', true),
((SELECT id FROM medical_conditions WHERE name = 'Parvovirus Canino'), 'Antibióticos', 'medication', 'Prevención de infecciones secundarias', 'Según peso y condición', '7-14 días', true),

-- Tratamientos para Moquillo
((SELECT id FROM medical_conditions WHERE name = 'Moquillo Canino'), 'Cuidados de soporte', 'therapy', 'Fluidoterapia y cuidados intensivos', 'Según condición del paciente', 'Hasta recuperación', true),
((SELECT id FROM medical_conditions WHERE name = 'Moquillo Canino'), 'Anticonvulsivantes', 'medication', 'Control de convulsiones neurológicas', 'Según prescripción', 'Según evolución', true),

-- Tratamientos para Pulgas
((SELECT id FROM medical_conditions WHERE name = 'Pulgas'), 'Pipetas Antipulgas', 'topical', 'Tratamiento tópico mensual', 'Una pipeta según peso', 'Mensual', false),
((SELECT id FROM medical_conditions WHERE name = 'Pulgas'), 'Collar Antipulgas', 'topical', 'Protección continua', 'Un collar cada 6-8 meses', '6-8 meses', false),
((SELECT id FROM medical_conditions WHERE name = 'Pulgas'), 'Champú Antipulgas', 'topical', 'Tratamiento inmediato', 'Según instrucciones', 'Según necesidad', false),

-- Tratamientos para Dermatitis Atópica
((SELECT id FROM medical_conditions WHERE name = 'Dermatitis Atópica'), 'Antihistamínicos', 'medication', 'Control de la reacción alérgica', 'Según peso', 'Según síntomas', true),
((SELECT id FROM medical_conditions WHERE name = 'Dermatitis Atópica'), 'Dieta Hipoalergénica', 'diet', 'Alimentación especial sin alérgenos', 'Exclusiva', 'Permanente', false),
((SELECT id FROM medical_conditions WHERE name = 'Dermatitis Atópica'), 'Champús Medicados', 'topical', 'Limpieza especializada de la piel', '2-3 veces por semana', 'Según evolución', false);

-- Insertar tratamientos para enfermedades de GATOS
INSERT INTO medical_treatments (condition_id, name, type, description, dosage_info, duration_info, is_prescription_required) VALUES
-- Tratamientos para Rinotraqueítis Felina
((SELECT id FROM medical_conditions WHERE name = 'Rinotraqueítis Felina'), 'Antivirales Felinos', 'medication', 'Medicamentos específicos para virus felinos', 'Según peso', '7-14 días', true),
((SELECT id FROM medical_conditions WHERE name = 'Rinotraqueítis Felina'), 'Gotas Oftálmicas', 'topical', 'Tratamiento para conjuntivitis', '2-3 veces al día', '7-10 días', true),
((SELECT id FROM medical_conditions WHERE name = 'Rinotraqueítis Felina'), 'Humidificación Ambiental', 'therapy', 'Ambiente húmedo para facilitar respiración', 'Continuo', 'Durante síntomas', false),

-- Tratamientos para Cistitis Felina
((SELECT id FROM medical_conditions WHERE name = 'Cistitis Idiopática Felina'), 'Dieta Urinaria', 'diet', 'Alimento especializado para tracto urinario', 'Exclusiva', 'Permanente', false),
((SELECT id FROM medical_conditions WHERE name = 'Cistitis Idiopática Felina'), 'Analgésicos Felinos', 'medication', 'Control del dolor urinario', 'Según prescripción', '5-7 días', true),
((SELECT id FROM medical_conditions WHERE name = 'Cistitis Idiopática Felina'), 'Reducción de Estrés', 'therapy', 'Ambiente tranquilo y enriquecimiento', 'Continuo', 'Permanente', false),

-- Tratamientos para Pulgas Felinas
((SELECT id FROM medical_conditions WHERE name = 'Pulgas Felinas'), 'Pipetas para Gatos', 'topical', 'Tratamiento específico para gatos', 'Una pipeta según peso', 'Mensual', false),
((SELECT id FROM medical_conditions WHERE name = 'Pulgas Felinas'), 'Spray Antipulgas Felino', 'topical', 'Tratamiento inmediato seguro para gatos', 'Según instrucciones', 'Según necesidad', false),

-- Tratamientos para Asma Felino
((SELECT id FROM medical_conditions WHERE name = 'Asma Felino'), 'Broncodilatadores', 'medication', 'Medicamentos para abrir vías respiratorias', 'Según prescripción', 'Según crisis', true),
((SELECT id FROM medical_conditions WHERE name = 'Asma Felino'), 'Corticosteroides', 'medication', 'Control de la inflamación', 'Según prescripción', 'Según evolución', true),
((SELECT id FROM medical_conditions WHERE name = 'Asma Felino'), 'Purificadores de Aire', 'therapy', 'Mejora de la calidad del aire', 'Continuo', 'Permanente', false);

-- Insertar clínicas veterinarias de ejemplo
INSERT INTO veterinary_clinics (name, address, phone, email, specialties, emergency_service, rating) VALUES
('Clínica Veterinaria Central', 'Av. Principal 123, Montevideo', '+598 2123 4567', 'info@vetcentral.com', ARRAY['Medicina General', 'Cirugía', 'Emergencias'], true, 4.5),
('Hospital Veterinario San Martín', 'Calle San Martín 456, Montevideo', '+598 2234 5678', 'contacto@sanmartin.vet', ARRAY['Medicina Interna', 'Cardiología', 'Oncología'], true, 4.8),
('Veterinaria Especializada Felina', 'Av. Gatos 789, Montevideo', '+598 2345 6789', 'gatos@especializada.com', ARRAY['Medicina Felina', 'Comportamiento', 'Dermatología'], false, 4.7),
('Clínica de Emergencias 24h', 'Ruta 1 Km 15, Canelones', '+598 2456 7890', 'emergencias@24h.vet', ARRAY['Emergencias', 'Cuidados Intensivos', 'Cirugía de Urgencia'], true, 4.3);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_medical_conditions_species ON medical_conditions(species, is_active);
CREATE INDEX IF NOT EXISTS idx_medical_conditions_category ON medical_conditions(category, species);
CREATE INDEX IF NOT EXISTS idx_medical_treatments_condition ON medical_treatments(condition_id, is_active);
CREATE INDEX IF NOT EXISTS idx_veterinary_clinics_active ON veterinary_clinics(is_active);