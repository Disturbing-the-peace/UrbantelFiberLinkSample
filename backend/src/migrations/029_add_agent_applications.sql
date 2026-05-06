-- Agent Applications - Recruitment System
-- Migration: 029_add_agent_applications
-- Description: Creates agent_applications table for agent recruitment with referral tracking

-- ============================================================================
-- AGENT_APPLICATIONS TABLE
-- ============================================================================
-- Stores agent recruitment applications with document uploads
CREATE TABLE agent_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  birthday DATE NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT NOT NULL,
  
  -- Document Storage (Supabase Storage paths)
  resume_url TEXT, -- docx or pdf
  valid_id_url TEXT, -- image with 3 signatures
  barangay_clearance_url TEXT, -- optional
  gcash_screenshot_url TEXT, -- gcash verified screenshot
  
  -- Referral Tracking
  referred_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for filtering and queries
CREATE INDEX idx_agent_applications_referred_by ON agent_applications(referred_by_agent_id);
CREATE INDEX idx_agent_applications_created_at ON agent_applications(created_at);
CREATE INDEX idx_agent_applications_contact ON agent_applications(contact_number);
CREATE INDEX idx_agent_applications_email ON agent_applications(email);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_agent_applications_updated_at
  BEFORE UPDATE ON agent_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;

-- Admins and superadmins can view all agent applications
CREATE POLICY "Staff can view all agent applications"
  ON agent_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

-- Admins and superadmins can delete agent applications
CREATE POLICY "Staff can delete agent applications"
  ON agent_applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

-- Public can insert agent applications (recruitment form submissions)
CREATE POLICY "Public can submit agent applications"
  ON agent_applications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE agent_applications IS 'Agent recruitment applications with referral tracking';
COMMENT ON COLUMN agent_applications.referred_by_agent_id IS 'Agent who referred this applicant (for commission cascade)';
COMMENT ON COLUMN agent_applications.resume_url IS 'Resume document (docx or pdf)';
COMMENT ON COLUMN agent_applications.valid_id_url IS 'Valid ID image with 3 signatures';
COMMENT ON COLUMN agent_applications.barangay_clearance_url IS 'Barangay clearance (optional)';
COMMENT ON COLUMN agent_applications.gcash_screenshot_url IS 'GCash verified account screenshot';
