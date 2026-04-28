-- Migration: 024_add_multi_branch_support
-- Description: Add support for users (admins) to manage multiple branches

-- ============================================================================
-- CREATE USER_BRANCHES JUNCTION TABLE
-- ============================================================================
CREATE TABLE user_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique user-branch combinations
  UNIQUE(user_id, branch_id)
);

-- Indexes for faster lookups
CREATE INDEX idx_user_branches_user_id ON user_branches(user_id);
CREATE INDEX idx_user_branches_branch_id ON user_branches(branch_id);

-- ============================================================================
-- MIGRATE EXISTING SINGLE BRANCH DATA TO JUNCTION TABLE
-- ============================================================================
-- Copy existing branch assignments from users table to user_branches
INSERT INTO user_branches (user_id, branch_id)
SELECT id, branch_id 
FROM users 
WHERE branch_id IS NOT NULL;

-- ============================================================================
-- ADD PRIMARY_BRANCH_ID TO USERS TABLE
-- ============================================================================
-- Keep branch_id as primary_branch_id for backward compatibility and default selection
ALTER TABLE users RENAME COLUMN branch_id TO primary_branch_id;

-- Update comments
COMMENT ON COLUMN users.primary_branch_id IS 'Primary/default branch for user - used as default selection in UI';

-- ============================================================================
-- CREATE HELPER FUNCTION TO GET USER BRANCH IDS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_branch_ids(p_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  branch_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(branch_id) INTO branch_ids
  FROM user_branches
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(branch_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_branch_ids IS 'Returns array of branch IDs that a user has access to';

-- ============================================================================
-- CREATE HELPER FUNCTION TO CHECK USER BRANCH ACCESS
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_branch_access(p_user_id UUID, p_branch_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_branches
    WHERE user_id = p_user_id AND branch_id = p_branch_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION user_has_branch_access IS 'Checks if a user has access to a specific branch';

-- ============================================================================
-- UPDATE RLS POLICIES FOR MULTI-BRANCH ACCESS
-- ============================================================================

-- USER_BRANCHES TABLE POLICIES
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;

-- Users can view their own branch assignments
CREATE POLICY "Users can view their own branch assignments"
  ON user_branches FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Only superadmins can manage branch assignments
CREATE POLICY "Superadmins can manage branch assignments"
  ON user_branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- ============================================================================
-- UPDATE AGENTS TABLE POLICIES FOR MULTI-BRANCH ACCESS
-- ============================================================================

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can view agents in their branch" ON agents;

-- Admins can view agents in ANY of their assigned branches
CREATE POLICY "Admins can view agents in their branches"
  ON agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND user_has_branch_access(u.id, agents.branch_id)
    )
  );

-- Update create policy
DROP POLICY IF EXISTS "Admins can create agents in their branch" ON agents;

CREATE POLICY "Admins can create agents in their branches"
  ON agents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
      AND (u.role = 'superadmin' OR user_has_branch_access(u.id, agents.branch_id))
    )
  );

-- Update update policy
DROP POLICY IF EXISTS "Admins can update agents in their branch" ON agents;

CREATE POLICY "Admins can update agents in their branches"
  ON agents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
      AND (u.role = 'superadmin' OR user_has_branch_access(u.id, agents.branch_id))
    )
  );

-- ============================================================================
-- UPDATE APPLICATIONS TABLE POLICIES FOR MULTI-BRANCH ACCESS
-- ============================================================================

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can view applications in their branch" ON applications;

-- Admins can view applications in ANY of their assigned branches
CREATE POLICY "Admins can view applications in their branches"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND user_has_branch_access(u.id, applications.branch_id)
    )
  );

-- Update update policy
DROP POLICY IF EXISTS "Admins can update applications in their branch" ON applications;

CREATE POLICY "Admins can update applications in their branches"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND user_has_branch_access(u.id, applications.branch_id)
    )
  );

-- ============================================================================
-- UPDATE COMMISSIONS TABLE POLICIES FOR MULTI-BRANCH ACCESS
-- ============================================================================

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can view commissions in their branch" ON commissions;

-- Admins can view commissions in ANY of their assigned branches
CREATE POLICY "Admins can view commissions in their branches"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND user_has_branch_access(u.id, commissions.branch_id)
    )
  );

-- Update update policy
DROP POLICY IF EXISTS "Admins can update commissions in their branch" ON commissions;

CREATE POLICY "Admins can update commissions in their branches"
  ON commissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND user_has_branch_access(u.id, commissions.branch_id)
    )
  );

-- ============================================================================
-- UPDATE PLANS TABLE POLICIES FOR MULTI-BRANCH ACCESS
-- ============================================================================

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can view plans in their branch" ON plans;

-- Admins can view plans in ANY of their assigned branches
CREATE POLICY "Admins can view plans in their branches"
  ON plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
      AND (u.role = 'superadmin' OR user_has_branch_access(u.id, plans.branch_id))
    )
  );

-- ============================================================================
-- UPDATE EVENTS TABLE POLICIES FOR MULTI-BRANCH ACCESS
-- ============================================================================

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view events in their branch" ON events;
DROP POLICY IF EXISTS "Admins can manage events in their branch" ON events;

-- Admins can view events in ANY of their assigned branches
CREATE POLICY "Admins can view events in their branches"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND user_has_branch_access(u.id, events.branch_id)
    )
  );

-- Admins can manage events in ANY of their assigned branches
CREATE POLICY "Admins can manage events in their branches"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND user_has_branch_access(u.id, events.branch_id)
    )
  );

-- ============================================================================
-- UPDATE USER_AUTH_STATUS VIEW TO INCLUDE BRANCH INFORMATION
-- ============================================================================

-- Drop existing view
DROP VIEW IF EXISTS user_auth_status;

-- Recreate with branch information
CREATE OR REPLACE VIEW user_auth_status AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_active,
  u.primary_branch_id,
  b.name as primary_branch_name,
  u.profile_picture_url,
  u.is_first_login,
  u.created_at,
  u.updated_at,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', ub.branch_id,
        'name', br.name
      ) ORDER BY br.name
    )
    FROM user_branches ub
    JOIN branches br ON br.id = ub.branch_id
    WHERE ub.user_id = u.id),
    '[]'::json
  ) as branches
FROM users u
LEFT JOIN branches b ON b.id = u.primary_branch_id;

COMMENT ON VIEW user_auth_status IS 'User authentication status with primary branch and all assigned branches';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE user_branches IS 'Junction table for many-to-many relationship between users and branches';
COMMENT ON COLUMN user_branches.user_id IS 'Reference to user';
COMMENT ON COLUMN user_branches.branch_id IS 'Reference to branch the user has access to';

