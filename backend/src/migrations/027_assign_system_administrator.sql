-- Migration: 027_assign_system_administrator
-- Description: Assign system_administrator role to specific user
-- Date: 2026-04-30

-- ============================================================================
-- Assign system_administrator role to eealforte0924@proton.me
-- ============================================================================

-- Update the user's role to system_administrator
UPDATE users 
SET 
  role = 'system_administrator',
  updated_at = NOW()
WHERE email = 'eealforte0924@proton.me';

-- Verify the update
DO $$
DECLARE
  v_user_count INTEGER;
  v_user_id UUID;
  v_user_name VARCHAR(255);
BEGIN
  -- Check if user exists and was updated
  SELECT COUNT(*) 
  INTO v_user_count
  FROM users 
  WHERE email = 'eealforte0924@proton.me' 
  AND role = 'system_administrator';
  
  IF v_user_count = 0 THEN
    RAISE NOTICE 'WARNING: User eealforte0924@proton.me not found or role not updated';
    RAISE NOTICE 'Please ensure the user account exists before running this migration';
  ELSE
    -- Get user details separately
    SELECT id, full_name
    INTO v_user_id, v_user_name
    FROM users
    WHERE email = 'eealforte0924@proton.me'
    AND role = 'system_administrator'
    LIMIT 1;
    
    RAISE NOTICE 'SUCCESS: User % (%) has been assigned system_administrator role', v_user_name, v_user_id;
    RAISE NOTICE 'This user now has full access to all branches without branch membership';
  END IF;
END $$;

-- ============================================================================
-- Optional: Remove branch associations for system administrator
-- ============================================================================
-- System administrators don't need branch associations since they have access to all branches
-- Uncomment the following if you want to clean up any existing branch associations:

-- DELETE FROM user_branches 
-- WHERE user_id = (SELECT id FROM users WHERE email = 'eealforte0924@proton.me');

-- RAISE NOTICE 'Removed branch associations for system administrator (not needed)';

COMMIT;
