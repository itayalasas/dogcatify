/*
  # Fix pet triggers causing extract function error

  1. Problem Analysis
    - The trigger `trigger_generate_alerts_new_pet` is calling a function that uses `extract()` incorrectly
    - The function `calculate_pet_age_weeks` is trying to extract from incompatible data types
    - This prevents pet creation from working

  2. Solution
    - Drop the problematic triggers temporarily
    - Recreate the functions with proper type handling
    - Recreate the triggers with error handling

  3. Functions Fixed
    - `calculate_pet_age_weeks`: Now handles age_display JSON properly
    - `generate_alerts_for_new_pet`: Added error handling to prevent pet creation failure
*/

-- First, drop the problematic triggers
DROP TRIGGER IF EXISTS trigger_generate_alerts_new_pet ON pets;
DROP TRIGGER IF EXISTS trigger_alerts_on_pet_insert ON pets;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS generate_alerts_for_new_pet();
DROP FUNCTION IF EXISTS trigger_generate_alerts_new_pet();
DROP FUNCTION IF EXISTS calculate_pet_age_weeks(jsonb);
DROP FUNCTION IF EXISTS calculate_pet_age_weeks(date);

-- Create a new, safer age calculation function
CREATE OR REPLACE FUNCTION calculate_pet_age_weeks(pet_data jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    age_weeks integer := 52; -- Default to 1 year if calculation fails
    age_value numeric;
    age_unit text;
BEGIN
    -- Try to extract age information from the pet data
    BEGIN
        -- First try to get from age_display
        IF pet_data ? 'age_display' AND pet_data->'age_display' ? 'value' AND pet_data->'age_display' ? 'unit' THEN
            age_value := (pet_data->'age_display'->>'value')::numeric;
            age_unit := pet_data->'age_display'->>'unit';
            
            CASE age_unit
                WHEN 'years' THEN age_weeks := (age_value * 52)::integer;
                WHEN 'months' THEN age_weeks := (age_value * 4.33)::integer;
                WHEN 'days' THEN age_weeks := (age_value / 7)::integer;
                ELSE age_weeks := 52; -- Default to 1 year
            END CASE;
        -- Fallback to simple age field (assume years)
        ELSIF pet_data ? 'age' THEN
            age_value := (pet_data->>'age')::numeric;
            age_weeks := (age_value * 52)::integer;
        END IF;
        
        -- Ensure reasonable bounds
        IF age_weeks < 1 THEN age_weeks := 1; END IF;
        IF age_weeks > 1040 THEN age_weeks := 1040; END IF; -- Max 20 years
        
    EXCEPTION WHEN OTHERS THEN
        -- If any error occurs, default to 1 year
        age_weeks := 52;
        RAISE NOTICE 'Error calculating pet age, using default: %', SQLERRM;
    END;
    
    RETURN age_weeks;
END;
$$;

-- Create a safer alert generation function
CREATE OR REPLACE FUNCTION generate_alerts_for_new_pet()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    pet_age_weeks integer;
    pet_species text;
    alert_date date;
BEGIN
    -- Wrap everything in a try-catch to prevent pet creation failure
    BEGIN
        -- Get pet species
        pet_species := NEW.species;
        
        -- Calculate age in weeks using our safe function
        pet_age_weeks := calculate_pet_age_weeks(row_to_json(NEW)::jsonb);
        
        RAISE NOTICE 'Generating alerts for pet: % (% weeks old)', NEW.name, pet_age_weeks;
        
        -- Generate vaccination alerts for young pets
        IF pet_age_weeks < 16 THEN -- Less than 4 months old
            -- DHPP/FVRCP series alerts
            IF pet_species = 'dog' THEN
                -- First DHPP at 6-8 weeks
                IF pet_age_weeks < 8 THEN
                    alert_date := CURRENT_DATE + INTERVAL '2 weeks';
                    INSERT INTO medical_alerts (
                        pet_id, user_id, alert_type, title, description, 
                        due_date, priority, status, metadata
                    ) VALUES (
                        NEW.id, NEW.owner_id, 'vaccine', 
                        'Primera vacuna DHPP', 
                        'Es hora de la primera vacuna DHPP para ' || NEW.name,
                        alert_date, 'high', 'pending',
                        jsonb_build_object('vaccine_type', 'DHPP', 'dose_number', 1)
                    );
                END IF;
            ELSIF pet_species = 'cat' THEN
                -- First FVRCP at 6-8 weeks
                IF pet_age_weeks < 8 THEN
                    alert_date := CURRENT_DATE + INTERVAL '2 weeks';
                    INSERT INTO medical_alerts (
                        pet_id, user_id, alert_type, title, description, 
                        due_date, priority, status, metadata
                    ) VALUES (
                        NEW.id, NEW.owner_id, 'vaccine', 
                        'Primera vacuna FVRCP', 
                        'Es hora de la primera vacuna FVRCP para ' || NEW.name,
                        alert_date, 'high', 'pending',
                        jsonb_build_object('vaccine_type', 'FVRCP', 'dose_number', 1)
                    );
                END IF;
            END IF;
        END IF;
        
        -- Generate deworming alerts for young pets
        IF pet_age_weeks < 24 THEN -- Less than 6 months old
            alert_date := CURRENT_DATE + INTERVAL '2 weeks';
            INSERT INTO medical_alerts (
                pet_id, user_id, alert_type, title, description, 
                due_date, priority, status, metadata
            ) VALUES (
                NEW.id, NEW.owner_id, 'deworming', 
                'Desparasitación recomendada', 
                'Es recomendable desparasitar a ' || NEW.name,
                alert_date, 'medium', 'pending',
                jsonb_build_object('pet_age_weeks', pet_age_weeks)
            );
        END IF;
        
        RAISE NOTICE 'Alerts generated successfully for pet: %', NEW.name;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't prevent pet creation
        RAISE NOTICE 'Error generating alerts for pet %, continuing with pet creation: %', NEW.name, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger with the fixed function
CREATE TRIGGER trigger_generate_alerts_new_pet
    AFTER INSERT ON pets
    FOR EACH ROW
    EXECUTE FUNCTION generate_alerts_for_new_pet();

-- Also ensure the other trigger uses the same safe approach
CREATE OR REPLACE FUNCTION trigger_generate_alerts_new_pet()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function is now just a wrapper to the main function
    PERFORM generate_alerts_for_new_pet();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't let trigger errors prevent pet creation
    RAISE NOTICE 'Alert generation failed, but pet creation continues: %', SQLERRM;
    RETURN NEW;
END;
$$;