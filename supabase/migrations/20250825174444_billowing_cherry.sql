/*
  # Add class_type to resources table

  1. New Enum
    - `resource_class_type` enum with values 'employee' and 'equipment'

  2. Schema Changes
    - Add `class_type` column to `resources` table
    - Set default values based on existing resource types
    - Add index for performance

  3. Data Migration
    - Update existing resources with appropriate class types
    - Personnel types (operator, driver, etc.) → 'employee'
    - Equipment/vehicle types → 'equipment'
*/

-- Create enum for resource class types
CREATE TYPE resource_class_type AS ENUM ('employee', 'equipment');

-- Add class_type column to resources table
ALTER TABLE resources 
ADD COLUMN class_type resource_class_type;

-- Update existing resources based on their type
UPDATE resources 
SET class_type = CASE 
  WHEN type IN ('operator', 'driver', 'striper', 'foreman', 'laborer', 'privateDriver') 
  THEN 'employee'::resource_class_type
  ELSE 'equipment'::resource_class_type
END;

-- Make the column required now that data is populated
ALTER TABLE resources 
ALTER COLUMN class_type SET NOT NULL;

-- Add default value for future inserts
ALTER TABLE resources 
ALTER COLUMN class_type SET DEFAULT 'equipment'::resource_class_type;

-- Add index for performance on class_type queries
CREATE INDEX idx_resources_class_type ON resources(class_type);

-- Add combined index for type and class_type
CREATE INDEX idx_resources_type_class ON resources(type, class_type);