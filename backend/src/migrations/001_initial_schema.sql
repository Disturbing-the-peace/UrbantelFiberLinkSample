-- UrbanConnect ISP System - Initial Database Schema
-- Migration: 001_initial_schema
-- Description: Creates all core tables for the ISP application system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores internal staff accounts (superadmin, admin roles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin')),
  full_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster role-based queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================================
-- AGENTS TABLE
-- ============================================================================
-- Stores agent information with unique referral codes
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  contact_number VARCHAR(20),
  email VARCHAR(255),
  messenger_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for referral code lookups
CREATE UNIQUE INDEX idx_agents_referral_code ON agents(referral_code);
CREATE INDEX idx_agents_is_active ON agents(is_active);

-- ============================================================================
-- PLANS TABLE
-- ============================================================================
-- Stores internet service plans with categories (Residential, Business)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('Residential', 'Business')),
  speed VARCHAR(50) NOT NULL, -- e.g., "100 Mbps", "1 Gbps"
  price DECIMAL(10, 2) NOT NULL,
  inclusions TEXT[], -- Array of plan features/inclusions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for category filtering
CREATE INDEX idx_plans_category ON plans(category);
CREATE INDEX idx_plans_is_active ON plans(is_active);

-- ============================================================================
-- APPLICATIONS TABLE
-- ============================================================================
-- Stores customer applications with complete workflow tracking
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer Information
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  birthday DATE NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  
  -- Location Information
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Document Storage (Supabase Storage paths)
  house_photo_url TEXT,
  government_id_url TEXT,
  id_selfie_url TEXT,
  signature_url TEXT,
  
  -- Application Status
  status VARCHAR(30) NOT NULL DEFAULT 'Submitted' CHECK (
    status IN (
      'Submitted',
      'Under Review',
      'Approved',
      'Scheduled for Installation',
      'Activated',
      'Denied',
      'Voided'
    )
  ),
  status_reason TEXT, -- For Denied/Voided statuses
  
  -- Relationships
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE, -- When status changed to 'Activated'
  
  -- Data Privacy Compliance
  data_purged BOOLEAN DEFAULT false,
  data_purged_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for filtering and queries
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_agent_id ON applications(agent_id);
CREATE INDEX idx_applications_plan_id ON applications(plan_id);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_applications_activated_at ON applications(activated_at);
CREATE INDEX idx_applications_data_purged ON applications(data_purged);

-- ============================================================================
-- COMMISSIONS TABLE
-- ============================================================================
-- Tracks agent commissions (60% of plan price)
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  subscriber_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  
  -- Commission Details
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Eligible', 'Paid')
  ),
  
  -- Timestamps
  date_activated TIMESTAMP WITH TIME ZONE NOT NULL, -- When subscriber was activated
  date_paid TIMESTAMP WITH TIME ZONE, -- When commission was paid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for commission tracking
CREATE INDEX idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX idx_commissions_subscriber_id ON commissions(subscriber_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_date_activated ON commissions(date_activated);

-- ============================================================================
-- AUDIT_LOG TABLE
-- ============================================================================
-- Tracks data purge operations for compliance
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Purge Details
  action VARCHAR(50) NOT NULL, -- e.g., 'DATA_PURGE'
  entity_type VARCHAR(50) NOT NULL, -- e.g., 'application'
  entity_id UUID NOT NULL,
  
  -- Purged Data Metadata
  fields_purged TEXT[], -- Array of field names that were purged
  files_deleted TEXT[], -- Array of file paths that were deleted
  
  -- Audit Information
  performed_by VARCHAR(50) DEFAULT 'SYSTEM', -- 'SYSTEM' for automated purges
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional Context
  metadata JSONB -- For any additional context
);

-- Indexes for audit queries
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_performed_at ON audit_log(performed_at);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE users IS 'Internal staff accounts with role-based access (superadmin, admin)';
COMMENT ON TABLE agents IS 'Sales agents with unique referral codes for customer applications';
COMMENT ON TABLE plans IS 'Internet service plans with pricing and features';
COMMENT ON TABLE applications IS 'Customer applications with complete workflow tracking';
COMMENT ON TABLE commissions IS 'Agent commission tracking (60% of plan price)';
COMMENT ON TABLE audit_log IS 'Audit trail for data purge operations and compliance';

COMMENT ON COLUMN applications.data_purged IS 'Flag indicating if sensitive data has been purged (3+ days after activation)';
COMMENT ON COLUMN applications.activated_at IS 'Timestamp when application status changed to Activated';
COMMENT ON COLUMN commissions.amount IS 'Commission amount (60% of plan price)';
