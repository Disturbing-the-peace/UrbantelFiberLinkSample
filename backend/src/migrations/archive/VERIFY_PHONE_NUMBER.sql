-- Verification Query: Check if contact_number column exists in applications table
-- This query is for verification purposes only - NO MIGRATION NEEDED
-- The contact_number column already exists in the applications table from 001_initial_schema.sql

-- Query to verify the column exists
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'applications' 
    AND column_name = 'contact_number';

-- Expected result:
-- column_name     | data_type        | character_maximum_length | is_nullable
-- contact_number  | character varying| 20                       | NO

-- If you want to see all columns in the applications table:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'applications' 
-- ORDER BY ordinal_position;
