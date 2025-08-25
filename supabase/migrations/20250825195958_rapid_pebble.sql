/*
  # Add Unique Constraints for Resources

  1. Database Cleanup
    - Check for and remove any duplicate resources
    - Ensure data integrity before adding constraints

  2. Unique Constraints
    - Add unique constraint for truck identifiers
    - Add unique constraint for equipment identifiers within type
    - Add unique constraint for personnel identifiers within type
    - Add unique constraint for resource names within type

  3. Performance
    - Add indexes for better query performance
    - Optimize for common lookup patterns
*/

-- First, let's check the current state of resources
DO $$
DECLARE
    total_resources INTEGER;
    total_trucks INTEGER;
    duplicate_trucks INTEGER;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO total_resources FROM public.resources;
    
    -- Get truck count
    SELECT COUNT(*) INTO total_trucks FROM public.resources WHERE type = 'truck';
    
    -- Check for duplicate truck identifiers
    SELECT COUNT(*) INTO duplicate_trucks 
    FROM (
        SELECT identifier, COUNT(*) as cnt
        FROM public.resources 
        WHERE type = 'truck' AND identifier IS NOT NULL AND identifier != ''
        GROUP BY identifier
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Database Status:';
    RAISE NOTICE '  Total Resources: %', total_resources;
    RAISE NOTICE '  Total Trucks: %', total_trucks;
    RAISE NOTICE '  Duplicate Truck Identifiers: %', duplicate_trucks;
END $$;

-- Remove any duplicate truck entries (keeping the oldest one)
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY type, identifier 
            ORDER BY created_at ASC
        ) as rn
    FROM public.resources
    WHERE type = 'truck' 
    AND identifier IS NOT NULL 
    AND identifier != ''
),
to_delete AS (
    SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM public.resources 
WHERE id IN (SELECT id FROM to_delete);

-- Remove any duplicate equipment entries (keeping the oldest one)
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY type, identifier 
            ORDER BY created_at ASC
        ) as rn
    FROM public.resources
    WHERE type IN ('skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment')
    AND identifier IS NOT NULL 
    AND identifier != ''
),
to_delete AS (
    SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM public.resources 
WHERE id IN (SELECT id FROM to_delete);

-- Remove any duplicate personnel entries (keeping the oldest one)
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY type, identifier 
            ORDER BY created_at ASC
        ) as rn
    FROM public.resources
    WHERE type IN ('operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver')
    AND identifier IS NOT NULL 
    AND identifier != ''
),
to_delete AS (
    SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM public.resources 
WHERE id IN (SELECT id FROM to_delete);

-- Remove any duplicate name entries within the same type (keeping the oldest one)
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY type, name 
            ORDER BY created_at ASC
        ) as rn
    FROM public.resources
    WHERE name IS NOT NULL 
    AND name != ''
),
to_delete AS (
    SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM public.resources 
WHERE id IN (SELECT id FROM to_delete);

-- Clean up any orphaned assignments after resource cleanup
DELETE FROM public.assignments 
WHERE resource_id NOT IN (SELECT id FROM public.resources);

-- Clean up any orphaned truck driver assignments
DELETE FROM public.truck_driver_assignments 
WHERE truck_id NOT IN (SELECT id FROM public.resources WHERE type = 'truck')
   OR driver_id NOT IN (SELECT id FROM public.resources WHERE type IN ('driver', 'privateDriver'));

-- Now add unique constraints to prevent future duplicates

-- Unique constraint for truck identifiers
DROP INDEX IF EXISTS unique_truck_identifier;
CREATE UNIQUE INDEX unique_truck_identifier 
ON public.resources (identifier) 
WHERE type = 'truck' AND identifier IS NOT NULL AND identifier != '';

-- Unique constraint for equipment identifiers within their type
DROP INDEX IF EXISTS unique_equipment_identifier;
CREATE UNIQUE INDEX unique_equipment_identifier 
ON public.resources (type, identifier) 
WHERE type = ANY (ARRAY['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment']) 
AND identifier IS NOT NULL AND identifier != '';

-- Unique constraint for personnel identifiers within their type
DROP INDEX IF EXISTS unique_personnel_identifier;
CREATE UNIQUE INDEX unique_personnel_identifier 
ON public.resources (type, identifier) 
WHERE type = ANY (ARRAY['operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver']) 
AND identifier IS NOT NULL AND identifier != '';

-- Unique constraint for resource names within each type
DROP INDEX IF EXISTS unique_resource_name_per_type;
CREATE UNIQUE INDEX unique_resource_name_per_type 
ON public.resources (type, name) 
WHERE name IS NOT NULL AND name != '';

-- Add performance indexes
DROP INDEX IF EXISTS idx_resources_type_class;
CREATE INDEX IF NOT EXISTS idx_resources_type_class ON public.resources (type, class_type);

DROP INDEX IF EXISTS idx_resources_identifier;
CREATE INDEX IF NOT EXISTS idx_resources_identifier ON public.resources (identifier) WHERE identifier IS NOT NULL;

-- Display final counts
DO $$
DECLARE
    final_resources INTEGER;
    final_trucks INTEGER;
    final_personnel INTEGER;
    final_equipment INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_resources FROM public.resources;
    SELECT COUNT(*) INTO final_trucks FROM public.resources WHERE type = 'truck';
    SELECT COUNT(*) INTO final_personnel FROM public.resources WHERE type IN ('operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver');
    SELECT COUNT(*) INTO final_equipment FROM public.resources WHERE type IN ('skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 'grader', 'dozer', 'payloader', 'roller', 'equipment');
    
    RAISE NOTICE 'After Cleanup:';
    RAISE NOTICE '  Total Resources: %', final_resources;
    RAISE NOTICE '  Trucks: %', final_trucks;
    RAISE NOTICE '  Personnel: %', final_personnel;
    RAISE NOTICE '  Equipment: %', final_equipment;
    RAISE NOTICE 'Unique constraints added successfully!';
END $$;