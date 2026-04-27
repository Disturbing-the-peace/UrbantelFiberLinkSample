-- Migration: Fix RLS infinite recursion on users table
-- Description: Updates RLS policies to avoid infinite recursion when querying users table

-- ============================================================================
-- DROP EXISTING USERS TABLE POLICIES THAT CAUSE RECURSION
-- ============================================================================
DROP POLICY IF EXISTS "Superadmins can view all users" ON users;
DROP POLICY IF EXISTS "Superadmins can insert users" ON users;
DROP POLICY IF EXISTS "Superadmins can update users" ON users;
DROP POLICY IF EXISTS "Superadmins can delete users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- ============================================================================
-- CREATE HELPER FUNCTION TO GET USER ROLE (SECURITY DEFINER)
-- ============================================================================
-- This function bypasses RLS to get the user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE id = user_id AND is_active = true;
$$;

-- ============================================================================
-- CREATE NEW USERS TABLE POLICIES WITHOUT RECURSION
-- ============================================================================

-- Superadmins can view all users
CREATE POLICY "Superadmins can view all users"
  ON users FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'superadmin'
  );

-- Superadmins can insert users
CREATE POLICY "Superadmins can insert users"
  ON users FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) = 'superadmin'
  );

-- Superadmins can update users
CREATE POLICY "Superadmins can update users"
  ON users FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'superadmin'
  );

-- Superadmins can delete users
CREATE POLICY "Superadmins can delete users"
  ON users FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'superadmin'
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent users from changing their own role or branch
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    branch_id = (SELECT branch_id FROM users WHERE id = auth.uid())
  );

-- ============================================================================
-- UPDATE OTHER TABLE POLICIES TO USE THE HELPER FUNCTION
-- ============================================================================

-- Update branches table policies
DROP POLICY IF EXISTS "Authenticated users can view branches" ON branches;
DROP POLICY IF EXISTS "Superadmins can manage branches" ON branches;

CREATE POLICY "Authenticated users can view branches"
  ON branches FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    get_user_role(auth.uid()) IN ('admin', 'superadmin')
  );

CREATE POLICY "Superadmins can manage branches"
  ON branches FOR ALL
  USING (
    get_user_role(auth.uid()) = 'superadmin'
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON FUNCTION get_user_role(uuid) IS 'Security definer function to get user role without triggering RLS recursion';
COMMENT ON POLICY "Superadmins can view all users" ON users IS 'Superadmins have full read access using security definer function';
COMMENT ON POLICY "Users can view own profile" ON users IS 'Users can always view their own profile data';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated to fix infinite recursion issue';
END $$;
