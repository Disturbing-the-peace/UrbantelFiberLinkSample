-- ============================================================================
-- BRANCH ACCESS CONTROL - COMPLETE MIGRATION
-- ============================================================================
-- This file combines all three branch migrations into one
-- Run this entire file in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- MIGRATION 019: Add Branches Table and Columns
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default branches
INSERT INTO branches (name) VALUES
  ('Davao Del Sur'),
  ('Davao de Oro'),
  ('Davao Oriental')
ON CONFLICT (name) DO NOTHING;

-- Add branch_id columns to all tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;

-- Create indexes for branch filtering
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_agents_branch_id ON agents(branch_id);
CREATE INDEX IF NOT EXISTS idx_applications_branch_id ON applications(branch_id);
CREATE INDEX IF NOT EXISTS idx_commissions_branch_id ON commissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_plans_branch_id ON plans(branch_id);
CREATE INDEX IF NOT EXISTS idx_events_branch_id ON events(branch_id);

-- ============================================================================
-- MIGRATION 020: Assign Default Branch to Existing Data
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

  -- Update all tables with default branch
  UPDATE users SET branch_id = default_branch_id WHERE branch_id IS NULL;
  UPDATE agents SET branch_id = default_branch_id WHERE branch_id IS NULL;
  UPDATE applications SET branch_id = default_branch_id WHERE branch_id IS NULL;
  UPDATE commissions SET branch_id = default_branch_id WHERE branch_id IS NULL;
  UPDATE plans SET branch_id = default_branch_id WHERE branch_id IS NULL;
  UPDATE events SET branch_id = default_branch_id WHERE branch_id IS NULL;

  RAISE NOTICE 'All existing records assigned to Davao Del Sur';
END $$;

-- Make branch_id NOT NULL after assigning default values
ALTER TABLE users ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE agents ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE applications ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE commissions ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE plans ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE events ALTER COLUMN branch_id SET NOT NULL;

-- ============================================================================
-- MIGRATION 021: Update RLS Policies for Branch Filtering
-- ============================================================================

-- Enable RLS on branches table
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Branches table policies
DROP POLICY IF EXISTS "Authenticated users can view branches" ON branches;
CREATE POLICY "Authenticated users can view branches"
  ON branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.is_active = true
    )
  );

DROP POLICY IF EXISTS "Superadmins can manage branches" ON branches;
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

-- Update agents table policies
DROP POLICY IF EXISTS "Superadmins can manage agents" ON agents;
DROP POLICY IF EXISTS "Admins can view agents" ON agents;
DROP POLICY IF EXISTS "Public can view active agents" ON agents;

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

CREATE POLICY "Public can view active agents"
  ON agents FOR SELECT
  USING (is_active = true);

-- Update applications table policies
DROP POLICY IF EXISTS "Staff can view all applications" ON applications;
DROP POLICY IF EXISTS "Staff can update applications" ON applications;
DROP POLICY IF EXISTS "Public can submit applications" ON applications;

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

CREATE POLICY "Public can submit applications"
  ON applications FOR INSERT
  WITH CHECK (true);

-- Update commissions table policies
DROP POLICY IF EXISTS "Staff can view all commissions" ON commissions;
DROP POLICY IF EXISTS "Staff can update commissions" ON commissions;
DROP POLICY IF EXISTS "System can insert commissions" ON commissions;

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

CREATE POLICY "System can insert commissions"
  ON commissions FOR INSERT
  WITH CHECK (true);

-- Update plans table policies
DROP POLICY IF EXISTS "Superadmins can manage plans" ON plans;
DROP POLICY IF EXISTS "Admins can view plans" ON plans;
DROP POLICY IF EXISTS "Public can view active plans" ON plans;

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

CREATE POLICY "Public can view active plans"
  ON plans FOR SELECT
  USING (is_active = true);

-- Update events table policies
DROP POLICY IF EXISTS "Staff can view all events" ON events;
DROP POLICY IF EXISTS "Staff can manage events" ON events;

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
-- VERIFICATION QUERIES
-- ============================================================================

-- Show branches
SELECT 'Branches created:' as info;
SELECT id, name, is_active FROM branches ORDER BY name;

-- Show branch assignments
SELECT 'Branch assignments:' as info;
SELECT 
  'users' as table_name, 
  COUNT(*) as total, 
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch
FROM users
UNION ALL
SELECT 'agents', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM agents
UNION ALL
SELECT 'applications', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM applications
UNION ALL
SELECT 'commissions', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM commissions
UNION ALL
SELECT 'plans', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM plans
UNION ALL
SELECT 'events', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM events;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All migrations have been applied successfully!
-- 
-- Next steps:
-- 1. Verify the output above shows 3 branches
-- 2. Verify all tables have 0 missing_branch records
-- 3. Restart your backend server
-- 4. Test the /api/branches endpoint
-- 5. Implement frontend changes (see BRANCH_UI_IMPLEMENTATION.md)
-- ============================================================================
