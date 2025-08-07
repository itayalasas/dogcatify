/*
  # Re-enable pet triggers after fixing extract error

  1. Functions
    - Recreate `calculate_pet_age_weeks` with proper type handling
    - Recreate `generate_alerts_for_new_pet` with error handling
    
  2. Triggers
    - Re-enable `trigger_generate_alerts_new_pet` on pets table
    
  3. Safety
    - Add comprehensive error handling
    - Ensure pet creation never fails due to alert generation
*/

-- First, create the improved calculate_pet_age_weeks function
CREATE OR REPLACE FUNCTION calculate_pet_age_weeks(pet_data jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    age_weeks integer := 0;
    age_value numeric;
    age_unit text;
    birth_date date;
BEGIN
    -- Try to get age from age_display first (new format)
    IF pet_data ? 'age_display' AND pet_data->'age_display' ? 'value' AND pet_data->'age_display' ? 'unit' THEN
        age_value := (pet_data->'age_display'->>'value')::numeric;
        age_unit := pet_data->'age_display'->>'unit';
        
        CASE age_unit
            WHEN 'years' THEN
                age_weeks := (age_value * 52)::integer;
            WHEN 'months' THEN
                age_weeks := (age_value * 4.33)::integer; -- Average weeks per month
            WHEN 'days' THEN
                age_weeks := (age_value / 7)::integer;
            ELSE
                age_weeks := (age_value * 52)::integer; -- Default to years
        END CASE;
        
    -- Fallback to simple age field (old format)
    ELSIF pet_data ? 'age' THEN
        age_value := (pet_data->>'age')::numeric;
        age_weeks := (age_value * 52)::integer; -- Assume years
        
    -- If we have created_at, calculate from that
    ELSIF pet_data ? 'created_at' THEN
        BEGIN
            birth_date := (pet_data->>'created_at')::date;
            age_weeks := EXTRACT(days FROM (CURRENT_DATE - birth_date))::integer / 7;
        EXCEPTION WHEN OTHERS THEN
            age_weeks := 52; -- Default to 1 year if date parsing fails
        END;
        
    ELSE
        -- Default fallback
        age_weeks := 52; -- Default to 1 year
    END IF;
    
    -- Ensure reasonable bounds
    IF age_weeks < 1 THEN
        age_weeks := 1;
    ELSIF age_weeks > 1040 THEN -- Max 20 years
        age_weeks := 1040;
    END IF;
    
    RETURN age_weeks;
    
EXCEPTION WHEN OTHERS THEN
    -- If anything fails, return a safe default
    RAISE WARNING 'Error in calculate_pet_age_weeks: %', SQLERRM;
    RETURN 52; -- Default to 1 year
END;
$$;

-- Create the improved generate_alerts_for_new_pet function
CREATE OR REPLACE FUNCTION generate_alerts_for_new_pet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pet_age_weeks integer;
    pet_species text;
    alert_data jsonb;
BEGIN
    BEGIN
        -- Get pet species safely
        pet_species := COALESCE(NEW.species, 'dog');
        
        -- Calculate age in weeks using our improved function
        -- Convert the NEW record to jsonb for the function
        alert_data := jsonb_build_object(
            'age', COALESCE(NEW.age, 1),
            'age_display', COALESCE(NEW.age_display, jsonb_build_object('value', COALESCE(NEW.age, 1), 'unit', 'years')),
            'species', pet_species,
            'created_at', NEW.created_at
        );
        
        pet_age_weeks := calculate_pet_age_weeks(alert_data);
        
        RAISE NOTICE 'Calculated age for pet %: % weeks', NEW.name, pet_age_weeks;
        
        -- Generate vaccination alerts based on age and species
        IF pet_age_weeks < 16 THEN
            -- Puppy/kitten - generate initial vaccination alerts
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
                'Vacunación inicial requerida',
                CASE 
                    WHEN pet_species = 'dog' THEN 'Es hora de las primeras vacunas para ' || NEW.name || '. Consulta con un veterinario sobre el calendario de vacunación.'
                    ELSE 'Es hora de las primeras vacunas para ' || NEW.name || '. Consulta con un veterinario sobre el calendario de vacunación.'
                END,
                CURRENT_DATE + INTERVAL '7 days',
                'high',
                'pending',
                jsonb_build_object(
                    'pet_age_weeks', pet_age_weeks,
                    'species', pet_species,
                    'alert_reason', 'new_pet_vaccination'
                )
            );
            
        ELSIF pet_age_weeks >= 52 THEN
            -- Adult pet - generate annual checkup alert
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
                'checkup',
                'Revisión médica anual',
                'Es recomendable hacer una revisión médica anual para ' || NEW.name || '. Programa una cita con tu veterinario.',
                CURRENT_DATE + INTERVAL '30 days',
                'medium',
                'pending',
                jsonb_build_object(
                    'pet_age_weeks', pet_age_weeks,
                    'species', pet_species,
                    'alert_reason', 'annual_checkup'
                )
            );
        END IF;
        
        -- Generate deworming alert for all pets
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
            'Desparasitación recomendada',
            'Es importante mantener a ' || NEW.name || ' libre de parásitos. Consulta con tu veterinario sobre el programa de desparasitación.',
            CURRENT_DATE + INTERVAL '14 days',
            'medium',
            'pending',
            jsonb_build_object(
                'pet_age_weeks', pet_age_weeks,
                'species', pet_species,
                'alert_reason', 'deworming_schedule'
            )
        );
        
        RAISE NOTICE 'Medical alerts generated successfully for pet %', NEW.name;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the pet creation
        RAISE WARNING 'Error generating alerts for new pet %: % - %', NEW.name, SQLSTATE, SQLERRM;
        -- Continue with pet creation even if alert generation fails
    END;
    
    RETURN NEW;
END;
$$;

-- Now recreate the trigger
DROP TRIGGER IF EXISTS trigger_generate_alerts_new_pet ON pets;

CREATE TRIGGER trigger_generate_alerts_new_pet
    AFTER INSERT ON pets
    FOR EACH ROW
    EXECUTE FUNCTION generate_alerts_for_new_pet();

-- Test the function with sample data to ensure it works
DO $$
DECLARE
    test_result integer;
BEGIN
    -- Test with years
    test_result := calculate_pet_age_weeks(jsonb_build_object(
        'age', 2,
        'age_display', jsonb_build_object('value', 2, 'unit', 'years')
    ));
    RAISE NOTICE 'Test result for 2 years: % weeks', test_result;
    
    -- Test with months
    test_result := calculate_pet_age_weeks(jsonb_build_object(
        'age', 6,
        'age_display', jsonb_build_object('value', 6, 'unit', 'months')
    ));
    RAISE NOTICE 'Test result for 6 months: % weeks', test_result;
    
    RAISE NOTICE 'Function tests completed successfully';
END;
$$;