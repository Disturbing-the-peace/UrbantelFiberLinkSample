-- UrbanConnect ISP System - Row Level Security Policies
-- Migration: 002_rls_policies
-- Description: Sets up RLS policies for role-based access control

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Superadmins can do everything with users
CREATE POLICY "Superadmins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

CREATE POLICY "Superadmins can insert users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

CREATE POLICY "Superadmins can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

CREATE POLICY "Superadmins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ============================================================================
-- AGENTS TABLE POLICIES
-- ============================================================================
-- Superadmins have full access to agents
CREATE POLICY "Superadmins can manage agents"
  ON agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can view agents
CREATE POLICY "Admins can view agents"
  ON agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
    )
  );

-- Public can view active agents (for referral code validation)
CREATE POLICY "Public can view active agents"
  ON agents FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- PLANS TABLE POLICIES
-- ============================================================================
-- Superadmins have full access to plans
CREATE POLICY "Superadmins can manage plans"
  ON plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- Admins can view plans
CREATE POLICY "Admins can view plans"
  ON plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
    )
  );

-- Public can view active plans (for application form)
CREATE POLICY "Public can view active plans"
  ON plans FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- APPLICATIONS TABLE POLICIES
-- ============================================================================
-- Admins and superadmins can view all applications
CREATE POLICY "Staff can view all applications"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
    )
  );

-- Admins and superadmins can update applications
CREATE POLICY "Staff can update applications"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
    )
  );

-- Public can insert applications (customer submissions)
CREATE POLICY "Public can submit applications"
  ON applications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- COMMISSIONS TABLE POLICIES
-- ============================================================================
-- Admins and superadmins can view all commissions
CREATE POLICY "Staff can view all commissions"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
    )
  );

-- Admins and superadmins can update commission status
CREATE POLICY "Staff can update commissions"
  ON commissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
      AND u.is_active = true
    )
  );

-- System can insert commissions (automated on activation)
CREATE POLICY "System can insert commissions"
  ON commissions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- AUDIT_LOG TABLE POLICIES
-- ============================================================================
-- Only superadmins can view audit logs
CREATE POLICY "Superadmins can view audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
      AND u.is_active = true
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- STORAGE POLICIES (for Supabase Storage buckets)
-- ============================================================================
-- Note: These policies should be applied in the Supabase dashboard
-- or via the Supabase Storage API

-- Bucket: customer-documents
-- Policy: Staff can view all documents
-- Policy: Public can upload documents (during application submission)
-- Policy: System can delete documents (during data purge)

COMMENT ON POLICY "Superadmins can view all users" ON users IS 'Superadmins have full read access to user accounts';
COMMENT ON POLICY "Public can submit applications" ON applications IS 'Allows public form submissions via referral links';
COMMENT ON POLICY "System can insert commissions" ON commissions IS 'Allows automated commission creation on activation';
