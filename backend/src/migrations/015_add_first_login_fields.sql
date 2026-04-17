-- Migration: Add first login and onboarding fields
-- Description: Adds fields to track first login and onboarding tour completion

-- Add columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Set existing users to have completed first login (they're already using the system)
UPDATE users 
SET is_first_login = false, 
    onboarding_completed = true,
    password_changed_at = created_at
WHERE is_first_login IS NULL OR is_first_login = true;

-- Create index for first login queries
CREATE INDEX IF NOT EXISTS idx_users_first_login ON users(is_first_login) WHERE is_first_login = true;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'First login and onboarding fields added successfully';
END $$;
