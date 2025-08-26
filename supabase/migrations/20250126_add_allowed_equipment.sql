-- Add allowed_equipment column to employees table for tracking which equipment an operator can use
ALTER TABLE employees 
ADD COLUMN allowed_equipment text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN employees.allowed_equipment IS 'Array of equipment types this operator is allowed to operate';

-- Update RLS policies to allow users to read allowed_equipment
-- The existing policies should already cover this since they allow reading all columns