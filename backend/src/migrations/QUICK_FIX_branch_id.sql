-- Quick fix: Make branch_id nullable for system applications
-- Run this in Supabase SQL Editor

ALTER TABLE applications 
  ALTER COLUMN branch_id DROP NOT NULL;

COMMENT ON COLUMN applications.branch_id IS 'Branch handling the application. NULL for system applications until assigned by admin';

-- Verify the change
SELECT 
  column_name, 
  is_nullable, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'applications' 
  AND column_name IN ('agent_id', 'branch_id');
