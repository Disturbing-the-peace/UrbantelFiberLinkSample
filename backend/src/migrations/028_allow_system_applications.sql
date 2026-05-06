-- Migration: 028_allow_system_applications
-- Description: Allow applications without agent referral (system/direct applications)
-- This enables QR codes on marketing materials that don't require agent referral

-- Make agent_id nullable to allow system applications
ALTER TABLE applications 
  ALTER COLUMN agent_id DROP NOT NULL;

-- Make branch_id nullable (will be assigned by admin later)
ALTER TABLE applications 
  ALTER COLUMN branch_id DROP NOT NULL;

-- Add comments explaining the changes
COMMENT ON COLUMN applications.agent_id IS 'Agent who referred the customer. NULL for system/direct applications (e.g., from marketing QR codes)';
COMMENT ON COLUMN applications.branch_id IS 'Branch handling the application. NULL for system applications until assigned by admin';

-- Update existing indexes (no changes needed, just documenting)
-- idx_applications_agent_id already exists and will work with NULL values
-- idx_applications_branch_id already exists and will work with NULL values
