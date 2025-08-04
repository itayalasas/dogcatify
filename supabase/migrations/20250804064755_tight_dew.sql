/*
  # Medical Alerts System

  1. Functions
    - `generate_alerts_for_new_pet()` - Generate initial alerts for new pets
    - `generate_medical_alerts()` - Generate alerts from health records
    - `update_alert_status()` - Update alert status when completed

  2. Triggers
    - Trigger on pet_health INSERT to generate alerts
    - Trigger on pets INSERT to generate initial alerts

  3. Security
    - Functions are security definer to bypass RLS
    - Proper error handling and logging
*/

-- Function to calculate age in weeks from pet data
CREATE OR REPLACE FUNCTION calculate_pet_age_weeks(pet_data JSONB)
RETURNS INTEGER AS $$
DECLARE
  age_weeks INTEGER := 52; -- Default to 1 year
  age_value INTEGER;
  age_unit TEXT;
BEGIN
  -- Try to get age from age_display first
  IF pet_data ? 'age_display' AND pet_data->'age_display' ? 'value' AND pet_data->'age_display' ? 'unit' THEN
    age_value := (pet_data->'age_display'->>'value')::INTEGER;
    age_unit := pet_data->'age_display'->>'unit';
    
    CASE age_unit
      WHEN 'days' THEN age_weeks := GREATEST(1, age_value / 7);
      WHEN 'months' THEN age_weeks := GREATEST(1, ROUND(age_value * 4.33));
      WHEN 'years' THEN age_weeks := GREATEST(1, age_value * 52);
      ELSE age_weeks := 52;
    END CASE;
  -- Fallback to age field
  ELSIF pet_data ? 'age' THEN
    age_value := (pet_data->>'age')::INTEGER;
    age_weeks := GREATEST(1, age_value * 52); -- Assume years
  END IF;
  
  RETURN age_weeks;
EXCEPTION
  WHEN OTHERS THEN
    -- Return safe default on any error
    RETURN 52;
END;
$$ LANGUAGE plpgsql;

-- Function to generate alerts for new pets (vaccination schedule)
CREATE OR REPLACE FUNCTION generate_alerts_for_new_pet()
RETURNS TRIGGER AS $$
DECLARE
  pet_age_weeks INTEGER;
  alert_date DATE;
  pet_species TEXT;
  vaccination_schedule RECORD;
BEGIN
  -- Get pet species
  pet_species := NEW.species;
  
  -- Calculate pet age in weeks
  pet_age_weeks := calculate_pet_age_weeks(to_jsonb(NEW));
  
  -- Generate vaccination alerts based on schedule
  FOR vaccination_schedule IN 
    SELECT * FROM vaccination_schedules 
    WHERE species IN (pet_species, 'both') 
    AND age_weeks_min <= pet_age_weeks
    ORDER BY priority ASC
  LOOP
    -- Calculate alert date (7 days before due date)
    alert_date := CURRENT_DATE + INTERVAL '7 days';
    
    -- Only create alert if pet is young enough to need this vaccine
    IF pet_age_weeks <= (vaccination_schedule.age_weeks_max + 4) THEN
      INSERT INTO medical_alerts (
        pet_id,
        user_id,
        alert_type,
        title,
        description,
        due_date,
        priority,
        status,
        metadata
      ) VALUES (
        NEW.id,
        NEW.owner_id,
        'vaccine',
        'Vacuna pendiente: ' || vaccination_schedule.vaccine_name,
        'Es hora de vacunar a ' || NEW.name || ' contra ' || vaccination_schedule.vaccine_name,
        alert_date,
        CASE 
          WHEN vaccination_schedule.is_core THEN 'high'
          ELSE 'medium'
        END,
        'pending',
        jsonb_build_object(
          'vaccine_name', vaccination_schedule.vaccine_name,
          'pet_age_weeks', pet_age_weeks,
          'is_core', vaccination_schedule.is_core
        )
      );
    END IF;
  END LOOP;
  
  -- Generate deworming alerts
  FOR vaccination_schedule IN 
    SELECT * FROM deworming_schedules 
    WHERE species IN (pet_species, 'both')
    AND age_weeks_min <= pet_age_weeks
    ORDER BY priority ASC
    LIMIT 1 -- Get the most appropriate schedule
  LOOP
    -- Calculate next deworming date
    alert_date := CURRENT_DATE + (vaccination_schedule.frequency_weeks || ' weeks')::INTERVAL;
    
    INSERT INTO medical_alerts (
      pet_id,
      user_id,
      alert_type,
      title,
      description,
      due_date,
      priority,
      status,
      metadata
    ) VALUES (
      NEW.id,
      NEW.owner_id,
      'deworming',
      'Desparasitación pendiente',
      'Es hora de desparasitar a ' || NEW.name,
      alert_date,
      CASE 
        WHEN pet_age_weeks < 16 THEN 'high'
        ELSE 'medium'
      END,
      'pending',
      jsonb_build_object(
        'frequency_weeks', vaccination_schedule.frequency_weeks,
        'pet_age_weeks', pet_age_weeks
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the pet creation
    RAISE WARNING 'Error generating alerts for new pet %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate alerts from health records
CREATE OR REPLACE FUNCTION generate_medical_alerts()
RETURNS TRIGGER AS $$
DECLARE
  pet_record RECORD;
  alert_date DATE;
  alert_title TEXT;
  alert_description TEXT;
  alert_priority TEXT := 'medium';
BEGIN
  -- Get pet information
  SELECT * INTO pet_record FROM pets WHERE id = NEW.pet_id;
  
  IF NOT FOUND THEN
    RAISE WARNING 'Pet not found for health record %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Generate alerts based on health record type
  CASE NEW.type
    WHEN 'vaccine' THEN
      -- Generate next vaccination alert if next_due_date is provided
      IF NEW.next_due_date IS NOT NULL AND NEW.next_due_date != '' THEN
        BEGIN
          -- Parse date in dd/mm/yyyy format
          alert_date := to_date(NEW.next_due_date, 'DD/MM/YYYY');
          
          -- Create alert 7 days before due date
          alert_date := alert_date - INTERVAL '7 days';
          
          -- Only create alert if it's in the future
          IF alert_date > CURRENT_DATE THEN
            alert_title := 'Refuerzo de vacuna: ' || COALESCE(NEW.name, 'Vacuna');
            alert_description := 'Es hora del refuerzo de ' || COALESCE(NEW.name, 'vacuna') || ' para ' || pet_record.name;
            
            -- Core vaccines have higher priority
            IF NEW.name ILIKE '%DHPP%' OR NEW.name ILIKE '%rabia%' OR NEW.name ILIKE '%triple%' THEN
              alert_priority := 'high';
            END IF;
            
            INSERT INTO medical_alerts (
              pet_id,
              user_id,
              alert_type,
              title,
              description,
              due_date,
              priority,
              status,
              related_record_id,
              metadata
            ) VALUES (
              NEW.pet_id,
              NEW.user_id,
              'vaccine',
              alert_title,
              alert_description,
              alert_date,
              alert_priority,
              'pending',
              NEW.id,
              jsonb_build_object(
                'vaccine_name', NEW.name,
                'last_application', NEW.application_date,
                'veterinarian', NEW.veterinarian
              )
            );
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Error parsing vaccine date %: %', NEW.next_due_date, SQLERRM;
        END;
      END IF;
      
    WHEN 'deworming' THEN
      -- Generate next deworming alert
      IF NEW.next_due_date IS NOT NULL AND NEW.next_due_date != '' THEN
        BEGIN
          alert_date := to_date(NEW.next_due_date, 'DD/MM/YYYY');
          alert_date := alert_date - INTERVAL '3 days'; -- 3 days before for deworming
          
          IF alert_date > CURRENT_DATE THEN
            alert_title := 'Desparasitación pendiente';
            alert_description := 'Es hora de desparasitar a ' || pet_record.name;
            
            INSERT INTO medical_alerts (
              pet_id,
              user_id,
              alert_type,
              title,
              description,
              due_date,
              priority,
              status,
              related_record_id,
              metadata
            ) VALUES (
              NEW.pet_id,
              NEW.user_id,
              'deworming',
              alert_title,
              alert_description,
              alert_date,
              'medium',
              'pending',
              NEW.id,
              jsonb_build_object(
                'product_name', NEW.product_name,
                'last_application', NEW.application_date
              )
            );
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Error parsing deworming date %: %', NEW.next_due_date, SQLERRM;
        END;
      END IF;
      
    WHEN 'illness' THEN
      -- Generate checkup reminder for chronic conditions
      IF NEW.status = 'active' THEN
        alert_date := CURRENT_DATE + INTERVAL '3 months';
        alert_title := 'Revisión médica: ' || COALESCE(NEW.name, 'Condición');
        alert_description := 'Revisión de seguimiento para ' || COALESCE(NEW.name, 'condición médica') || ' de ' || pet_record.name;
        
        INSERT INTO medical_alerts (
          pet_id,
          user_id,
          alert_type,
          title,
          description,
          due_date,
          priority,
          status,
          related_record_id,
          metadata
        ) VALUES (
          NEW.pet_id,
          NEW.user_id,
          'checkup',
          alert_title,
          alert_description,
          alert_date,
          'medium',
          'pending',
          NEW.id,
          jsonb_build_object(
            'condition_name', NEW.name,
            'diagnosis_date', NEW.diagnosis_date
          )
        );
      END IF;
  END CASE;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the health record creation
    RAISE WARNING 'Error generating medical alerts for health record %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update alert status when health record is completed
CREATE OR REPLACE FUNCTION update_alert_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark related alerts as completed when a new health record is added
  UPDATE medical_alerts 
  SET 
    status = 'completed',
    completed_at = CURRENT_TIMESTAMP
  WHERE 
    pet_id = NEW.pet_id 
    AND alert_type = NEW.type
    AND status = 'pending'
    AND due_date <= CURRENT_DATE + INTERVAL '7 days';
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating alert status: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_generate_alerts_new_pet ON pets;
CREATE TRIGGER trigger_generate_alerts_new_pet
  AFTER INSERT ON pets
  FOR EACH ROW
  EXECUTE FUNCTION generate_alerts_for_new_pet();

DROP TRIGGER IF EXISTS trigger_medical_alerts_on_health_insert ON pet_health;
CREATE TRIGGER trigger_medical_alerts_on_health_insert
  AFTER INSERT ON pet_health
  FOR EACH ROW
  EXECUTE FUNCTION generate_medical_alerts();

DROP TRIGGER IF EXISTS trigger_update_alerts_on_health_insert ON pet_health;
CREATE TRIGGER trigger_update_alerts_on_health_insert
  AFTER INSERT ON pet_health
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_status();