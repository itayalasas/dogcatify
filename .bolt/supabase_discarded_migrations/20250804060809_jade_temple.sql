/*
  # Sistema de Alertas Médicas para Mascotas

  1. Nuevas Tablas
    - `medical_alerts` - Alertas médicas pendientes y completadas
    - `vaccination_schedules` - Calendarios de vacunación por especie y edad
    - `deworming_schedules` - Calendarios de desparasitación por especie y edad

  2. Funciones
    - Función para calcular próximas fechas automáticamente
    - Función para generar alertas basadas en edad y historial
    - Función para enviar notificaciones programadas

  3. Triggers
    - Auto-generar alertas al agregar vacunas/desparasitaciones
    - Actualizar alertas cuando se completan tratamientos
*/

-- Tabla de alertas médicas
CREATE TABLE IF NOT EXISTS medical_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('vaccine', 'deworming', 'checkup', 'medication')),
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'dismissed')),
  related_record_id uuid, -- ID del registro de salud relacionado
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}' -- Información adicional (vacuna específica, producto, etc.)
);

-- Calendarios de vacunación por especie y edad
CREATE TABLE IF NOT EXISTS vaccination_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'both')),
  vaccine_name text NOT NULL,
  age_weeks_min integer NOT NULL, -- Edad mínima en semanas
  age_weeks_max integer, -- Edad máxima en semanas (para rango)
  doses_required integer DEFAULT 1,
  interval_weeks integer, -- Intervalo entre dosis en semanas
  booster_interval_months integer, -- Intervalo para refuerzo en meses
  is_core boolean DEFAULT true, -- Vacuna esencial
  priority integer DEFAULT 1, -- Prioridad (1 = más importante)
  description text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Calendarios de desparasitación por especie y edad
CREATE TABLE IF NOT EXISTS deworming_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'both')),
  age_weeks_min integer NOT NULL,
  age_weeks_max integer,
  frequency_weeks integer NOT NULL, -- Frecuencia en semanas
  parasite_types text[] DEFAULT '{}',
  recommended_products text[] DEFAULT '{}',
  priority integer DEFAULT 1,
  description text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_medical_alerts_pet_status ON medical_alerts(pet_id, status);
CREATE INDEX IF NOT EXISTS idx_medical_alerts_due_date ON medical_alerts(due_date, status);
CREATE INDEX IF NOT EXISTS idx_medical_alerts_user_pending ON medical_alerts(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vaccination_schedules_species ON vaccination_schedules(species, age_weeks_min);
CREATE INDEX IF NOT EXISTS idx_deworming_schedules_species ON deworming_schedules(species, age_weeks_min);

-- RLS Policies
ALTER TABLE medical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE deworming_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para medical_alerts
CREATE POLICY "Users can view their own pet alerts"
  ON medical_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert alerts for their pets"
  ON medical_alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pet alerts"
  ON medical_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pet alerts"
  ON medical_alerts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Políticas para vaccination_schedules (solo lectura para usuarios, admin puede gestionar)
CREATE POLICY "Anyone can view vaccination schedules"
  ON vaccination_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage vaccination schedules"
  ON vaccination_schedules FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'admin@dogcatify.com'
  ));

-- Políticas para deworming_schedules (solo lectura para usuarios, admin puede gestionar)
CREATE POLICY "Anyone can view deworming schedules"
  ON deworming_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage deworming schedules"
  ON deworming_schedules FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'admin@dogcatify.com'
  ));

-- Insertar calendarios de vacunación para perros
INSERT INTO vaccination_schedules (species, vaccine_name, age_weeks_min, age_weeks_max, doses_required, interval_weeks, booster_interval_months, is_core, priority, description) VALUES
-- Vacunas esenciales para cachorros
('dog', 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)', 6, 8, 3, 3, 12, true, 1, 'Serie inicial de 3 dosis cada 3-4 semanas, refuerzo anual'),
('dog', 'Parvovirus', 6, 8, 3, 3, 12, true, 1, 'Crítica para cachorros, alta mortalidad sin vacunación'),
('dog', 'Rabia', 12, 16, 1, 0, 12, true, 1, 'Obligatoria por ley, refuerzo anual'),

-- Vacunas recomendadas
('dog', 'Bordetella (Tos de las perreras)', 8, 12, 1, 0, 6, false, 2, 'Recomendada para perros sociales, refuerzo cada 6 meses'),
('dog', 'Leptospirosis', 12, 16, 2, 3, 12, false, 2, 'Importante en áreas endémicas, 2 dosis iniciales'),
('dog', 'Enfermedad de Lyme', 12, 16, 2, 3, 12, false, 3, 'Solo en áreas con garrapatas infectadas'),

-- Refuerzos para adultos
('dog', 'DHPP Refuerzo Adulto', 52, null, 1, 0, 12, true, 1, 'Refuerzo anual para perros adultos'),
('dog', 'Rabia Refuerzo Adulto', 52, null, 1, 0, 12, true, 1, 'Refuerzo anual obligatorio');

-- Insertar calendarios de vacunación para gatos
INSERT INTO vaccination_schedules (species, vaccine_name, age_weeks_min, age_weeks_max, doses_required, interval_weeks, booster_interval_months, is_core, priority, description) VALUES
-- Vacunas esenciales para gatitos
('cat', 'FVRCP (Rinotraqueitis, Calicivirus, Panleucopenia)', 6, 8, 3, 3, 12, true, 1, 'Serie inicial de 3 dosis cada 3-4 semanas'),
('cat', 'Rabia Felina', 12, 16, 1, 0, 12, true, 1, 'Obligatoria, especialmente para gatos que salen'),

-- Vacunas recomendadas
('cat', 'Leucemia Felina (FeLV)', 8, 12, 2, 3, 12, false, 2, 'Importante para gatos que salen o viven con otros gatos'),
('cat', 'Clamidiosis Felina', 9, 12, 2, 3, 12, false, 3, 'Para gatos en ambientes multi-gato'),

-- Refuerzos para adultos
('cat', 'FVRCP Refuerzo Adulto', 52, null, 1, 0, 12, true, 1, 'Refuerzo anual para gatos adultos'),
('cat', 'Rabia Felina Refuerzo Adulto', 52, null, 1, 0, 12, true, 1, 'Refuerzo anual obligatorio');

-- Insertar calendarios de desparasitación
INSERT INTO deworming_schedules (species, age_weeks_min, age_weeks_max, frequency_weeks, parasite_types, recommended_products, priority, description) VALUES
-- Cachorros y gatitos (0-6 meses)
('both', 2, 8, 2, ARRAY['lombrices intestinales', 'ascaris', 'ancylostoma'], ARRAY['Drontal Puppy', 'Panacur'], 1, 'Desparasitación cada 2 semanas hasta los 2 meses'),
('both', 8, 16, 4, ARRAY['lombrices intestinales', 'tenias', 'giardia'], ARRAY['Drontal Plus', 'Milbemax'], 1, 'Desparasitación mensual de 2-4 meses'),
('both', 16, 24, 6, ARRAY['lombrices intestinales', 'tenias', 'giardia'], ARRAY['Drontal Plus', 'Milbemax'], 1, 'Desparasitación cada 6 semanas de 4-6 meses'),

-- Adultos (6+ meses)
('both', 24, null, 12, ARRAY['lombrices intestinales', 'tenias', 'giardia'], ARRAY['Drontal Plus', 'Milbemax'], 2, 'Desparasitación cada 3 meses para adultos'),

-- Específico para perros (parásitos del corazón)
('dog', 8, null, 4, ARRAY['dirofilaria', 'lombrices del corazón'], ARRAY['Heartgard Plus', 'Revolution'], 1, 'Prevención mensual del parásito del corazón'),

-- Específico para gatos de exterior
('cat', 12, null, 8, ARRAY['lombrices intestinales', 'tenias', 'pulgas'], ARRAY['Profender', 'Revolution'], 2, 'Desparasitación cada 2 meses para gatos que salen');

-- Función para calcular la edad en semanas de una mascota
CREATE OR REPLACE FUNCTION calculate_pet_age_weeks(pet_birth_date date)
RETURNS integer AS $$
BEGIN
  RETURN EXTRACT(days FROM (CURRENT_DATE - pet_birth_date)) / 7;
END;
$$ LANGUAGE plpgsql;

-- Función para generar alertas médicas automáticas
CREATE OR REPLACE FUNCTION generate_medical_alerts(pet_id_param uuid)
RETURNS void AS $$
DECLARE
  pet_record RECORD;
  pet_age_weeks integer;
  vaccine_schedule RECORD;
  deworming_schedule RECORD;
  last_vaccine RECORD;
  last_deworming RECORD;
  next_due_date date;
BEGIN
  -- Obtener información de la mascota
  SELECT * INTO pet_record FROM pets WHERE id = pet_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcular edad en semanas (estimada si no tenemos fecha exacta de nacimiento)
  pet_age_weeks := EXTRACT(days FROM (CURRENT_DATE - pet_record.created_at::date)) / 7 + (pet_record.age * 52);
  
  -- Generar alertas de vacunación
  FOR vaccine_schedule IN 
    SELECT * FROM vaccination_schedules 
    WHERE species IN (pet_record.species, 'both')
    AND (age_weeks_max IS NULL OR pet_age_weeks <= age_weeks_max)
    AND pet_age_weeks >= age_weeks_min
    ORDER BY priority, age_weeks_min
  LOOP
    -- Verificar si ya tiene esta vacuna
    SELECT * INTO last_vaccine 
    FROM pet_health 
    WHERE pet_id = pet_id_param 
    AND type = 'vaccine' 
    AND name ILIKE '%' || vaccine_schedule.vaccine_name || '%'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
      -- No tiene esta vacuna, crear alerta
      next_due_date := CURRENT_DATE + INTERVAL '1 week';
      
      INSERT INTO medical_alerts (
        pet_id, user_id, alert_type, title, description, due_date, priority, metadata
      ) VALUES (
        pet_id_param,
        pet_record.owner_id,
        'vaccine',
        'Vacuna ' || vaccine_schedule.vaccine_name || ' pendiente',
        'Tu mascota necesita la vacuna ' || vaccine_schedule.vaccine_name || '. ' || COALESCE(vaccine_schedule.description, ''),
        next_due_date,
        CASE 
          WHEN vaccine_schedule.is_core THEN 'high'
          ELSE 'medium'
        END,
        jsonb_build_object(
          'vaccine_name', vaccine_schedule.vaccine_name,
          'is_core', vaccine_schedule.is_core,
          'pet_age_weeks', pet_age_weeks,
          'doses_required', vaccine_schedule.doses_required
        )
      ) ON CONFLICT DO NOTHING;
    ELSE
      -- Verificar si necesita refuerzo
      IF vaccine_schedule.booster_interval_months IS NOT NULL THEN
        next_due_date := (last_vaccine.application_date::date + INTERVAL '1 month' * vaccine_schedule.booster_interval_months);
        
        IF next_due_date <= CURRENT_DATE + INTERVAL '1 week' AND next_due_date > CURRENT_DATE THEN
          INSERT INTO medical_alerts (
            pet_id, user_id, alert_type, title, description, due_date, priority, related_record_id, metadata
          ) VALUES (
            pet_id_param,
            pet_record.owner_id,
            'vaccine',
            'Refuerzo de ' || vaccine_schedule.vaccine_name,
            'Es hora del refuerzo de ' || vaccine_schedule.vaccine_name || ' para ' || pet_record.name,
            next_due_date,
            CASE 
              WHEN vaccine_schedule.is_core THEN 'high'
              ELSE 'medium'
            END,
            last_vaccine.id,
            jsonb_build_object(
              'vaccine_name', vaccine_schedule.vaccine_name,
              'is_booster', true,
              'last_vaccine_date', last_vaccine.application_date
            )
          ) ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Generar alertas de desparasitación
  FOR deworming_schedule IN 
    SELECT * FROM deworming_schedules 
    WHERE species IN (pet_record.species, 'both')
    AND (age_weeks_max IS NULL OR pet_age_weeks <= age_weeks_max)
    AND pet_age_weeks >= age_weeks_min
    ORDER BY priority, age_weeks_min
  LOOP
    -- Verificar última desparasitación
    SELECT * INTO last_deworming 
    FROM pet_health 
    WHERE pet_id = pet_id_param 
    AND type = 'deworming'
    ORDER BY application_date::date DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
      -- No tiene desparasitación, crear alerta
      next_due_date := CURRENT_DATE + INTERVAL '3 days';
      
      INSERT INTO medical_alerts (
        pet_id, user_id, alert_type, title, description, due_date, priority, metadata
      ) VALUES (
        pet_id_param,
        pet_record.owner_id,
        'deworming',
        'Desparasitación pendiente',
        'Tu mascota necesita desparasitación. ' || COALESCE(deworming_schedule.description, ''),
        next_due_date,
        'medium',
        jsonb_build_object(
          'frequency_weeks', deworming_schedule.frequency_weeks,
          'parasite_types', deworming_schedule.parasite_types,
          'pet_age_weeks', pet_age_weeks
        )
      ) ON CONFLICT DO NOTHING;
    ELSE
      -- Verificar si necesita nueva desparasitación
      next_due_date := (last_deworming.application_date::date + INTERVAL '1 week' * deworming_schedule.frequency_weeks);
      
      IF next_due_date <= CURRENT_DATE + INTERVAL '1 week' AND next_due_date > CURRENT_DATE THEN
        INSERT INTO medical_alerts (
          pet_id, user_id, alert_type, title, description, due_date, priority, related_record_id, metadata
        ) VALUES (
          pet_id_param,
          pet_record.owner_id,
          'deworming',
          'Desparasitación de ' || pet_record.name,
          'Es hora de la próxima desparasitación para ' || pet_record.name,
          next_due_date,
          'medium',
          last_deworming.id,
          jsonb_build_object(
            'frequency_weeks', deworming_schedule.frequency_weeks,
            'last_deworming_date', last_deworming.application_date,
            'parasite_types', deworming_schedule.parasite_types
          )
        ) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función para enviar notificaciones de alertas médicas
CREATE OR REPLACE FUNCTION send_medical_notifications()
RETURNS void AS $$
DECLARE
  alert_record RECORD;
  user_profile RECORD;
BEGIN
  -- Buscar alertas que necesitan notificación (7 días antes)
  FOR alert_record IN 
    SELECT ma.*, p.name as pet_name, p.species
    FROM medical_alerts ma
    JOIN pets p ON p.id = ma.pet_id
    WHERE ma.status = 'pending'
    AND ma.due_date <= CURRENT_DATE + INTERVAL '7 days'
    AND ma.due_date > CURRENT_DATE
    AND ma.notification_sent = false
  LOOP
    -- Obtener perfil del usuario para verificar preferencias de notificación
    SELECT * INTO user_profile 
    FROM profiles 
    WHERE id = alert_record.user_id;
    
    IF FOUND AND user_profile.notification_preferences->>'push' = 'true' AND user_profile.push_token IS NOT NULL THEN
      -- Aquí se enviaría la notificación push
      -- Por ahora solo marcamos como enviada
      UPDATE medical_alerts 
      SET notification_sent = true, notification_sent_at = now()
      WHERE id = alert_record.id;
      
      -- Log para debugging
      RAISE NOTICE 'Notification sent for alert: % to user: %', alert_record.title, user_profile.display_name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar alertas automáticamente al agregar registros médicos
CREATE OR REPLACE FUNCTION trigger_generate_medical_alerts()
RETURNS trigger AS $$
BEGIN
  -- Generar alertas para la mascota cuando se agrega un nuevo registro médico
  PERFORM generate_medical_alerts(NEW.pet_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en pet_health
DROP TRIGGER IF EXISTS trigger_medical_alerts_on_health_insert ON pet_health;
CREATE TRIGGER trigger_medical_alerts_on_health_insert
  AFTER INSERT ON pet_health
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_medical_alerts();

-- Trigger para generar alertas al crear una nueva mascota
CREATE OR REPLACE FUNCTION trigger_generate_alerts_new_pet()
RETURNS trigger AS $$
BEGIN
  -- Generar alertas iniciales para la nueva mascota
  PERFORM generate_medical_alerts(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_alerts_on_pet_insert ON pets;
CREATE TRIGGER trigger_alerts_on_pet_insert
  AFTER INSERT ON pets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_alerts_new_pet();