-- Migration: 021_update_rls_for_branches
-- Description: Update Row Level Security policies to enforce branch-based access control

-- ============================================================================
-- BRANCHES TABLE POLICIES
-- ============================================================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view branches
CREATE POLICY "Authenticated users can view branches"
  ON branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.is_active = true
    )
  );

-- Only superadmins can manage branches
CREATE POLICY "Superadmins can manage branches"
  ON branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- ============================================================================
-- UPDATE AGENTS TABLE POLICIES FOR BRANCH FILTERING
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Superadmins can manage agents" ON agents;
DROP POLICY IF EXISTS "Admins can view agents" ON agents;
DROP POLICY IF EXISTS "Public can view active agents" ON agents;

-- Superadmins can view and manage all agents across all branches
CREATE POLICY "Superadmins can manage all agents"
  ON agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can only view agents in their branch
CREATE POLICY "Admins can view agents in their branch"
  ON agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND u.branch_id = agents.branch_id
    )
  );

-- Admins can create agents in their branch
CREATE POLICY "Admins can create agents in their branch"
  ON agents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
      AND (u.role = 'superadmin' OR u.branch_id = agents.branch_id)
    )
  );

-- Admins can update agents in their branch
CREATE POLICY "Admins can update agents in their branch"
  ON agents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
      AND (u.role = 'superadmin' OR u.branch_id = agents.branch_id)
    )
  );

-- Public can view active agents (for referral code validation)
CREATE POLICY "Public can view active agents"
  ON agents FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- UPDATE APPLICATIONS TABLE POLICIES FOR BRANCH FILTERING
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view all applications" ON applications;
DROP POLICY IF EXISTS "Staff can update applications" ON applications;
DROP POLICY IF EXISTS "Public can submit applications" ON applications;

-- Superadmins can view all applications across all branches
CREATE POLICY "Superadmins can view all applications"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can only view applications in their branch
CREATE POLICY "Admins can view applications in their branch"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND u.branch_id = applications.branch_id
    )
  );

-- Superadmins can update all applications
CREATE POLICY "Superadmins can update all applications"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can update applications in their branch
CREATE POLICY "Admins can update applications in their branch"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND u.branch_id = applications.branch_id
    )
  );

-- Public can submit applications (branch_id will be set from agent's branch)
CREATE POLICY "Public can submit applications"
  ON applications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- UPDATE COMMISSIONS TABLE POLICIES FOR BRANCH FILTERING
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view all commissions" ON commissions;
DROP POLICY IF EXISTS "Staff can update commissions" ON commissions;
DROP POLICY IF EXISTS "System can insert commissions" ON commissions;

-- Superadmins can view all commissions across all branches
CREATE POLICY "Superadmins can view all commissions"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can only view commissions in their branch
CREATE POLICY "Admins can view commissions in their branch"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND u.branch_id = commissions.branch_id
    )
  );

-- Superadmins can update all commissions
CREATE POLICY "Superadmins can update all commissions"
  ON commissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can update commissions in their branch
CREATE POLICY "Admins can update commissions in their branch"
  ON commissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND u.branch_id = commissions.branch_id
    )
  );

-- System can insert commissions (automated on activation)
CREATE POLICY "System can insert commissions"
  ON commissions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- UPDATE PLANS TABLE POLICIES FOR BRANCH FILTERING
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Superadmins can manage plans" ON plans;
DROP POLICY IF EXISTS "Admins can view plans" ON plans;
DROP POLICY IF EXISTS "Public can view active plans" ON plans;

-- Superadmins can manage all plans across all branches
CREATE POLICY "Superadmins can manage all plans"
  ON plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can view plans in their branch
CREATE POLICY "Admins can view plans in their branch"
  ON plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
      AND (u.role = 'superadmin' OR u.branch_id = plans.branch_id)
    )
  );

-- Public can view active plans (for application form - will be filtered by agent's branch in application logic)
CREATE POLICY "Public can view active plans"
  ON plans FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- UPDATE EVENTS TABLE POLICIES FOR BRANCH FILTERING
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view all events" ON events;
DROP POLICY IF EXISTS "Staff can manage events" ON events;

-- Superadmins can view all events across all branches
CREATE POLICY "Superadmins can view all events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can only view events in their branch
CREATE POLICY "Admins can view events in their branch"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND u.branch_id = events.branch_id
    )
  );

-- Superadmins can manage all events
CREATE POLICY "Superadmins can manage all events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can manage events in their branch
CREATE POLICY "Admins can manage events in their branch"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND u.branch_id = events.branch_id
    )
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON POLICY "Superadmins can manage all agents" ON agents IS 'Superadmins have full access to agents across all branches';
COMMENT ON POLICY "Admins can view agents in their branch" ON agents IS 'Admins can only see agents in their assigned branch';
COMMENT ON POLICY "Superadmins can view all applications" ON applications IS 'Superadmins can view applications from all branches';
COMMENT ON POLICY "Admins can view applications in their branch" ON applications IS 'Admins can only view applications in their branch';
