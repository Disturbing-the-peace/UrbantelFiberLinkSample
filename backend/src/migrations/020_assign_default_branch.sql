-- Migration: 020_assign_default_branch
-- Description: Assign all existing records to "Davao Del Sur" as the default branch

-- ============================================================================
-- GET DAVAO DEL SUR BRANCH ID
-- ============================================================================
DO $$
DECLARE
  default_branch_id UUID;
BEGIN
  -- Get the ID of "Davao Del Sur" branch
  SELECT id INTO default_branch_id FROM branches WHERE name = 'Davao Del Sur';
  
  IF default_branch_id IS NULL THEN
    RAISE EXCEPTION 'Default branch "Davao Del Sur" not found';
  END IF;

  -- ============================================================================
  -- UPDATE USERS TABLE
  -- ============================================================================
  UPDATE users 
  SET branch_id = default_branch_id 
  WHERE branch_id IS NULL;
  
  RAISE NOTICE 'Updated % users with default branch', (SELECT COUNT(*) FROM users WHERE branch_id = default_branch_id);

  -- ============================================================================
  -- UPDATE AGENTS TABLE
  -- ============================================================================
  UPDATE agents 
  SET branch_id = default_branch_id 
  WHERE branch_id IS NULL;
  
  RAISE NOTICE 'Updated % agents with default branch', (SELECT COUNT(*) FROM agents WHERE branch_id = default_branch_id);

  -- ============================================================================
  -- UPDATE APPLICATIONS TABLE
  -- ============================================================================
  UPDATE applications 
  SET branch_id = default_branch_id 
  WHERE branch_id IS NULL;
  
  RAISE NOTICE 'Updated % applications with default branch', (SELECT COUNT(*) FROM applications WHERE branch_id = default_branch_id);

  -- ============================================================================
  -- UPDATE COMMISSIONS TABLE
  -- ============================================================================
  UPDATE commissions 
  SET branch_id = default_branch_id 
  WHERE branch_id IS NULL;
  
  RAISE NOTICE 'Updated % commissions with default branch', (SELECT COUNT(*) FROM commissions WHERE branch_id = default_branch_id);

  -- ============================================================================
  -- UPDATE PLANS TABLE
  -- ============================================================================
  UPDATE plans 
  SET branch_id = default_branch_id 
  WHERE branch_id IS NULL;
  
  RAISE NOTICE 'Updated % plans with default branch', (SELECT COUNT(*) FROM plans WHERE branch_id = default_branch_id);

  -- ============================================================================
  -- UPDATE EVENTS TABLE (if exists and has records)
  -- ============================================================================
  UPDATE events 
  SET branch_id = default_branch_id 
  WHERE branch_id IS NULL;
  
  RAISE NOTICE 'Updated % events with default branch', (SELECT COUNT(*) FROM events WHERE branch_id = default_branch_id);

END $$;

-- ============================================================================
-- MAKE BRANCH_ID NOT NULL (after assigning default values)
-- ============================================================================
ALTER TABLE users ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE agents ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE applications ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE commissions ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE plans ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE events ALTER COLUMN branch_id SET NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Uncomment to verify the migration
-- SELECT 'users' as table_name, COUNT(*) as total, COUNT(branch_id) as with_branch FROM users
-- UNION ALL
-- SELECT 'agents', COUNT(*), COUNT(branch_id) FROM agents
-- UNION ALL
-- SELECT 'applications', COUNT(*), COUNT(branch_id) FROM applications
-- UNION ALL
-- SELECT 'commissions', COUNT(*), COUNT(branch_id) FROM commissions
-- UNION ALL
-- SELECT 'plans', COUNT(*), COUNT(branch_id) FROM plans
-- UNION ALL
-- SELECT 'events', COUNT(*), COUNT(branch_id) FROM events;
