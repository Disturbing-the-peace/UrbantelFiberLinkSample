-- ============================================================================
-- CLEANUP SCRIPT - Remove All Seed/Sample Data
-- ============================================================================
-- Purpose: Clean all test/sample data before pilot testing
-- WARNING: This will delete ALL data except:
--   - Plans (keep for production use)
--   - Admin users (keep for system access)
--   - Database structure (tables, functions, policies remain intact)
-- ============================================================================

DO $$
BEGIN
  -- ============================================================================
  -- 1. DELETE TRANSACTIONAL DATA (in correct order due to foreign keys)
  -- ============================================================================

  -- Delete audit logs (no dependencies)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    DELETE FROM audit_log;
    RAISE NOTICE 'Deleted all audit logs';
  ELSE
    RAISE NOTICE 'Table audit_log does not exist, skipping';
  END IF;

  -- Delete purge logs (no dependencies)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purge_logs') THEN
    DELETE FROM purge_logs;
    RAISE NOTICE 'Deleted all purge logs';
  ELSE
    RAISE NOTICE 'Table purge_logs does not exist, skipping';
  END IF;

  -- Delete commissions (depends on subscribers and agents)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'commissions') THEN
    DELETE FROM commissions;
    RAISE NOTICE 'Deleted all commissions';
  ELSE
    RAISE NOTICE 'Table commissions does not exist, skipping';
  END IF;

  -- Delete subscribers (depends on applications)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscribers') THEN
    DELETE FROM subscribers;
    RAISE NOTICE 'Deleted all subscribers';
  ELSE
    RAISE NOTICE 'Table subscribers does not exist, skipping';
  END IF;

  -- Delete applications (depends on agents and plans)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'applications') THEN
    DELETE FROM applications;
    RAISE NOTICE 'Deleted all applications';
  ELSE
    RAISE NOTICE 'Table applications does not exist, skipping';
  END IF;

  -- Delete agents (has dependencies from applications, commissions)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    DELETE FROM agents;
    RAISE NOTICE 'Deleted all agents';
  ELSE
    RAISE NOTICE 'Table agents does not exist, skipping';
  END IF;

  -- ============================================================================
  -- 2. KEEP PLANS (Production data - do not delete)
  -- ============================================================================
  -- Plans are kept as they represent your actual service offerings
  RAISE NOTICE 'Plans retained (production data)';

  -- ============================================================================
  -- 3. KEEP ADMIN USERS (System access - do not delete)
  -- ============================================================================
  -- Users table is kept to maintain admin access
  -- Only delete test users if you want (uncomment below)
  -- DELETE FROM users WHERE email LIKE '%@example.com' OR email LIKE '%test%';
  RAISE NOTICE 'Admin users retained (system access)';

  -- ============================================================================
  -- 4. RESET SEQUENCES (Optional - for clean IDs)
  -- ============================================================================
  -- Uncomment if you want to reset auto-increment IDs to start from 1

  -- ALTER SEQUENCE agents_id_seq RESTART WITH 1;
  -- ALTER SEQUENCE applications_id_seq RESTART WITH 1;
  -- ALTER SEQUENCE subscribers_id_seq RESTART WITH 1;
  -- ALTER SEQUENCE commissions_id_seq RESTART WITH 1;
  -- ALTER SEQUENCE audit_log_id_seq RESTART WITH 1;
  -- ALTER SEQUENCE purge_logs_id_seq RESTART WITH 1;

  -- RAISE NOTICE 'Sequences reset to start from 1';

END $$;

-- ============================================================================
-- 5. VERIFICATION - Show remaining data counts
-- ============================================================================

DO $$
DECLARE
  plans_count INT := 0;
  agents_count INT := 0;
  applications_count INT := 0;
  subscribers_count INT := 0;
  commissions_count INT := 0;
  users_count INT := 0;
  audit_count INT := 0;
  purge_count INT := 0;
BEGIN
  -- Count only if tables exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plans') THEN
    SELECT COUNT(*) INTO plans_count FROM plans;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    SELECT COUNT(*) INTO agents_count FROM agents;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'applications') THEN
    SELECT COUNT(*) INTO applications_count FROM applications;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscribers') THEN
    SELECT COUNT(*) INTO subscribers_count FROM subscribers;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'commissions') THEN
    SELECT COUNT(*) INTO commissions_count FROM commissions;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    SELECT COUNT(*) INTO users_count FROM users;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    SELECT COUNT(*) INTO audit_count FROM audit_log;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purge_logs') THEN
    SELECT COUNT(*) INTO purge_count FROM purge_logs;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP COMPLETE - Data Summary:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Plans:         % (KEPT)', plans_count;
  RAISE NOTICE 'Users:         % (KEPT)', users_count;
  RAISE NOTICE 'Agents:        % (DELETED)', agents_count;
  RAISE NOTICE 'Applications:  % (DELETED)', applications_count;
  RAISE NOTICE 'Subscribers:   % (DELETED)', subscribers_count;
  RAISE NOTICE 'Commissions:   % (DELETED)', commissions_count;
  RAISE NOTICE 'Audit Logs:    % (DELETED)', audit_count;
  RAISE NOTICE 'Purge Logs:    % (DELETED)', purge_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This script is SAFE to run multiple times
-- 2. All deletions are wrapped in DO blocks (atomic operations)
-- 3. Plans are preserved as they are production data
-- 4. Admin users are preserved for system access
-- 5. Database structure (tables, RLS policies, functions) remains intact
-- 6. Handles missing tables gracefully (won't error if table doesn't exist)
-- 7. To run: Execute this file in Supabase SQL Editor or via psql
-- ============================================================================
