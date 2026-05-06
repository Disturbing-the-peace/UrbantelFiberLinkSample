-- Referrers System for Agent Recruitment
-- Migration: 030_add_referrers
-- Description: Creates referrers table for agent recruitment tracking (separate from agents)

-- ============================================================================
-- REFERRERS TABLE
-- ============================================================================
-- Stores referrers who recruit new agents (separate from ISP agents)
CREATE TABLE referrers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  contact_number VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for referral code lookups
CREATE UNIQUE INDEX idx_referrers_referral_code ON referrers(referral_code);
CREATE INDEX idx_referrers_is_active ON referrers(is_active);
CREATE INDEX idx_referrers_email ON referrers(email);

-- ============================================================================
-- UPDATE AGENT_APPLICATIONS TABLE
-- ============================================================================
-- Change referred_by_agent_id to referred_by_referrer_id
ALTER TABLE agent_applications 
  DROP COLUMN IF EXISTS referred_by_agent_id;

ALTER TABLE agent_applications 
  ADD COLUMN referred_by_referrer_id UUID REFERENCES referrers(id) ON DELETE SET NULL;

-- Update index
DROP INDEX IF EXISTS idx_agent_applications_referred_by;
CREATE INDEX idx_agent_applications_referred_by ON agent_applications(referred_by_referrer_id);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_referrers_updated_at
  BEFORE UPDATE ON referrers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;

-- Superadmins and system_administrators have full access to referrers
CREATE POLICY "System admins can manage referrers"
  ON referrers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

-- Public can view active referrers (for referral code validation)
CREATE POLICY "Public can view active referrers"
  ON referrers FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- UPDATE AGENT_APPLICATIONS RLS POLICIES
-- ============================================================================
-- Drop old policies that reference agents
DROP POLICY IF EXISTS "Staff can view all agent applications" ON agent_applications;
DROP POLICY IF EXISTS "Staff can delete agent applications" ON agent_applications;
DROP POLICY IF EXISTS "Public can submit agent applications" ON agent_applications;

-- Recreate policies
CREATE POLICY "System admins can view all agent applications"
  ON agent_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

CREATE POLICY "System admins can delete agent applications"
  ON agent_applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

CREATE POLICY "Public can submit agent applications"
  ON agent_applications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE referrers IS 'Referrers who recruit new agents (separate from ISP agents)';
COMMENT ON COLUMN referrers.referral_code IS 'Unique referral code for agent recruitment tracking';
COMMENT ON COLUMN agent_applications.referred_by_referrer_id IS 'Referrer who recruited this agent applicant';
