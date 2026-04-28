-- Migration: 019_add_branches
-- Description: Add branches table and branch_id to all relevant tables for branch-based access control

-- ============================================================================
-- CREATE BRANCHES TABLE
-- ============================================================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  contact_number VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_branches_name ON branches(name);
CREATE INDEX idx_branches_is_active ON branches(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INSERT DEFAULT BRANCHES
-- ============================================================================
INSERT INTO branches (name, address, contact_number, email) VALUES
  ('Davao Del Sur', NULL, NULL, NULL),
  ('Davao de Oro', NULL, NULL, NULL),
  ('Davao Oriental', NULL, NULL, NULL);

-- ============================================================================
-- ADD BRANCH_ID TO USERS TABLE
-- ============================================================================
ALTER TABLE users ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;

-- Create index for branch filtering
CREATE INDEX idx_users_branch_id ON users(branch_id);

-- ============================================================================
-- ADD BRANCH_ID TO AGENTS TABLE
-- ============================================================================
ALTER TABLE agents ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;

-- Create index for branch filtering
CREATE INDEX idx_agents_branch_id ON agents(branch_id);

-- ============================================================================
-- ADD BRANCH_ID TO APPLICATIONS TABLE
-- ============================================================================
ALTER TABLE applications ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;

-- Create index for branch filtering
CREATE INDEX idx_applications_branch_id ON applications(branch_id);

-- ============================================================================
-- ADD BRANCH_ID TO COMMISSIONS TABLE
-- ============================================================================
ALTER TABLE commissions ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;

-- Create index for branch filtering
CREATE INDEX idx_commissions_branch_id ON commissions(branch_id);

-- ============================================================================
-- ADD BRANCH_ID TO PLANS TABLE
-- ============================================================================
ALTER TABLE plans ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;

-- Create index for branch filtering
CREATE INDEX idx_plans_branch_id ON plans(branch_id);

-- ============================================================================
-- ADD BRANCH_ID TO EVENTS TABLE (if exists)
-- ============================================================================
ALTER TABLE events ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT;

-- Create index for branch filtering
CREATE INDEX idx_events_branch_id ON events(branch_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE branches IS 'Branch locations for multi-branch access control';
COMMENT ON COLUMN users.branch_id IS 'Branch assignment for user - determines data visibility';
COMMENT ON COLUMN agents.branch_id IS 'Branch assignment for agent';
COMMENT ON COLUMN applications.branch_id IS 'Branch where application was submitted';
COMMENT ON COLUMN commissions.branch_id IS 'Branch for commission tracking';
COMMENT ON COLUMN plans.branch_id IS 'Branch-specific plan availability';
COMMENT ON COLUMN events.branch_id IS 'Branch for event';
