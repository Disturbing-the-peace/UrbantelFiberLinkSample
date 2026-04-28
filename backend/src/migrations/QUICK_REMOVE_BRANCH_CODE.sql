-- ============================================================================
-- QUICK MIGRATION: Remove Branch Code Column
-- ============================================================================
-- Run this directly in Supabase Dashboard SQL Editor
-- This removes the redundant code field from branches table

-- Step 1: Drop the index
DROP INDEX IF EXISTS idx_branches_code;

-- Step 2: Remove the code column
ALTER TABLE branches DROP COLUMN IF EXISTS code;

-- Step 3: Verify (optional - check the output)
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'branches'
ORDER BY ordinal_position;

-- You should see these columns:
-- id, name, address, contact_number, email, is_active, created_at, updated_at
-- (code should NOT be in the list)

SELECT '✓ Migration complete! Branch code column removed.' as status;
