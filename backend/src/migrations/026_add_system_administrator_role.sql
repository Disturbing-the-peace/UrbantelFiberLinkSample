-- Migration: 026_add_system_administrator_role
-- Description: Add system_administrator role with full access across all branches
-- Date: 2026-04-30

-- ============================================================================
-- STEP 1: Add system_administrator to role enum
-- ============================================================================

-- First, check if the role column uses an enum type or just a CHECK constraint
-- The users table uses: role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin'))
-- We need to update the CHECK constraint

-- Drop the existing CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new CHECK constraint with system_administrator
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('superadmin', 'admin', 'system_administrator'));

-- ============================================================================
-- STEP 2: Update RLS Policies to allow system_administrator full access
-- ============================================================================

-- BRANCHES TABLE
-- System administrators can manage all branches
CREATE POLICY "System administrators can manage branches"
  ON branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- AGENTS TABLE
-- System administrators can manage all agents across all branches
CREATE POLICY "System administrators can manage all agents"
  ON agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- APPLICATIONS TABLE
-- System administrators can view all applications
CREATE POLICY "System administrators can view all applications"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- System administrators can update all applications
CREATE POLICY "System administrators can update all applications"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- System administrators can insert applications
CREATE POLICY "System administrators can insert applications"
  ON applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- System administrators can delete applications
CREATE POLICY "System administrators can delete applications"
  ON applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- COMMISSIONS TABLE
-- System administrators can view all commissions
CREATE POLICY "System administrators can view all commissions"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- System administrators can update all commissions
CREATE POLICY "System administrators can update all commissions"
  ON commissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- System administrators can insert commissions
CREATE POLICY "System administrators can insert commissions"
  ON commissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- System administrators can delete commissions
CREATE POLICY "System administrators can delete commissions"
  ON commissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- PLANS TABLE
-- System administrators can manage all plans
CREATE POLICY "System administrators can manage all plans"
  ON plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- EVENTS TABLE
-- System administrators can manage all events
CREATE POLICY "System administrators can manage all events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'system_administrator'
      AND u.is_active = true
    )
  );

-- USERS TABLE (if RLS is enabled)
-- System administrators can view all users
DROP POLICY IF EXISTS "System administrators can view all users" ON users;
CREATE POLICY "System administrators can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

-- System administrators can manage users
DROP POLICY IF EXISTS "System administrators can manage users" ON users;
CREATE POLICY "System administrators can manage users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

-- ============================================================================
-- STEP 3: Add comments for documentation
-- ============================================================================
COMMENT ON CONSTRAINT users_role_check ON users IS 
  'Valid roles: superadmin (full system access), admin (branch-specific access), system_administrator (full access across all branches without branch membership)';

-- ============================================================================
-- NOTES
-- ============================================================================
-- System Administrator Role:
-- - Has full access to all branches without being a member of any branch
-- - Can view, create, update, and delete all resources across all branches
-- - Does not need to be assigned to specific branches via user_branches table
-- - Bypasses all branch-based access controls
-- - Intended for technical administrators who need system-wide access
--
-- Difference from Superadmin:
-- - Superadmin: Business/organizational administrator with full control
-- - System Administrator: Technical administrator with full access for maintenance
-- - Both have equivalent database-level permissions
-- - Frontend may differentiate their UI/UX based on role

COMMIT;
