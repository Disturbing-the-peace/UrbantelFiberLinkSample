-- ============================================================================
-- NetHub - Baseline Fresh Install Script
-- Version: 027 (Current as of 2026-05-04)
-- ============================================================================
-- This script contains the complete current database schema.
-- Use this for NEW installations only.
-- For existing databases, use the numbered migration scripts.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin', 'system_administrator')),
  full_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  primary_branch_id UUID, -- References branches(id), added later with FK
  profile_picture_url TEXT,
  is_first_login BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_primary_branch_id ON users(primary_branch_id);

COMMENT ON TABLE users IS 'Internal staff accounts with role-based access';
COMMENT ON COLUMN users.primary_branch_id IS 'Primary/default branch for user - used as default selection in UI';
COMMENT ON COLUMN users.role IS 'Valid roles: superadmin (full system access), admin (branch-specific access), system_administrator (full access across all branches)';

-- BRANCHES TABLE
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  contact_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_branches_name ON branches(name);
CREATE INDEX idx_branches_is_active ON branches(is_active);

COMMENT ON TABLE branches IS 'Branch locations - name serves as human-readable identifier, UUID provides uniqueness';

-- Add FK constraint to users table now that branches exists
ALTER TABLE users ADD CONSTRAINT fk_users_primary_branch 
  FOREIGN KEY (primary_branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- USER_BRANCHES JUNCTION TABLE (Many-to-many)
CREATE TABLE user_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

CREATE INDEX idx_user_branches_user_id ON user_branches(user_id);
CREATE INDEX idx_user_branches_branch_id ON user_branches(branch_id);

COMMENT ON TABLE user_branches IS 'Junction table for many-to-many relationship between users and branches';

-- AGENTS TABLE
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  contact_number VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('agent', 'team_leader')),
  team_leader_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_agents_referral_code ON agents(referral_code);
CREATE INDEX idx_agents_is_active ON agents(is_active);
CREATE INDEX idx_agents_branch_id ON agents(branch_id);
CREATE INDEX idx_agents_role ON agents(role);
CREATE INDEX idx_agents_team_leader_id ON agents(team_leader_id);

COMMENT ON TABLE agents IS 'Sales agents with unique referral codes for customer applications';
COMMENT ON COLUMN agents.role IS 'Agent role: agent (regular agent) or team_leader (manages other agents)';

-- PLANS TABLE
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('Residential', 'Business')),
  speed VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  inclusions TEXT[],
  is_active BOOLEAN DEFAULT true,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plans_category ON plans(category);
CREATE INDEX idx_plans_is_active ON plans(is_active);
CREATE INDEX idx_plans_branch_id ON plans(branch_id);

COMMENT ON TABLE plans IS 'Internet service plans with pricing and features';

-- APPLICATIONS TABLE
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  birthday DATE NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  house_photo_url TEXT,
  government_id_url TEXT,
  id_selfie_url TEXT,
  signature_url TEXT,
  proof_of_billing_url TEXT,
  proof_of_income_url TEXT,
  business_permit_url TEXT,
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
  status_reason TEXT,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  data_purged BOOLEAN DEFAULT false,
  data_purged_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_agent_id ON applications(agent_id);
CREATE INDEX idx_applications_plan_id ON applications(plan_id);
CREATE INDEX idx_applications_branch_id ON applications(branch_id);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_applications_activated_at ON applications(activated_at);
CREATE INDEX idx_applications_data_purged ON applications(data_purged);

COMMENT ON TABLE applications IS 'Customer applications with complete workflow tracking';
COMMENT ON COLUMN applications.data_purged IS 'Flag indicating if sensitive data has been purged (3+ days after activation)';

-- COMMISSIONS TABLE
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  subscriber_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Eligible', 'Paid')
  ),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  date_activated TIMESTAMP WITH TIME ZONE NOT NULL,
  date_paid TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX idx_commissions_subscriber_id ON commissions(subscriber_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_branch_id ON commissions(branch_id);
CREATE INDEX idx_commissions_date_activated ON commissions(date_activated);

COMMENT ON TABLE commissions IS 'Agent commission tracking (60% of plan price)';

-- EVENTS TABLE
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_branch_id ON events(branch_id);
CREATE INDEX idx_events_created_by ON events(created_by);

COMMENT ON TABLE events IS 'Calendar events for branch activities and scheduling';

-- AUDIT_LOG TABLE
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  fields_purged TEXT[],
  files_deleted TEXT[],
  performed_by VARCHAR(50) DEFAULT 'SYSTEM',
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_performed_at ON audit_log(performed_at);

COMMENT ON TABLE audit_log IS 'Audit trail for data purge operations and compliance';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user branch IDs
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

-- Function to check user branch access
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
-- VIEWS
-- ============================================================================

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
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
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

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Superadmins and System Administrators can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

CREATE POLICY "Superadmins and System Administrators can manage users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

-- BRANCHES TABLE POLICIES
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

CREATE POLICY "Admins can view their assigned branches"
  ON branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
      AND user_has_branch_access(u.id, branches.id)
    )
  );

-- USER_BRANCHES TABLE POLICIES
CREATE POLICY "Users can view their own branch assignments"
  ON user_branches FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

CREATE POLICY "Superadmins and System Administrators can manage branch assignments"
  ON user_branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('superadmin', 'system_administrator')
      AND u.is_active = true
    )
  );

-- AGENTS TABLE POLICIES
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

CREATE POLICY "Admins can create agents in their branches"
  ON agents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin', 'system_administrator')
      AND u.is_active = true
      AND (u.role IN ('superadmin', 'system_administrator') OR user_has_branch_access(u.id, agents.branch_id))
    )
  );

CREATE POLICY "Admins can update agents in their branches"
  ON agents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin', 'system_administrator')
      AND u.is_active = true
      AND (u.role IN ('superadmin', 'system_administrator') OR user_has_branch_access(u.id, agents.branch_id))
    )
  );

-- PLANS TABLE POLICIES
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

CREATE POLICY "Admins can view plans in their branches"
  ON plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin', 'system_administrator')
      AND u.is_active = true
      AND (u.role IN ('superadmin', 'system_administrator') OR user_has_branch_access(u.id, plans.branch_id))
    )
  );

-- APPLICATIONS TABLE POLICIES
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

CREATE POLICY "Admins can update applications in their branches"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin', 'system_administrator')
      AND u.is_active = true
      AND (u.role IN ('superadmin', 'system_administrator') OR user_has_branch_access(u.id, applications.branch_id))
    )
  );

-- COMMISSIONS TABLE POLICIES
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

CREATE POLICY "Admins can update commissions in their branches"
  ON commissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin', 'system_administrator')
      AND u.is_active = true
      AND (u.role IN ('superadmin', 'system_administrator') OR user_has_branch_access(u.id, commissions.branch_id))
    )
  );

-- EVENTS TABLE POLICIES
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
-- STORAGE SETUP (Supabase)
-- ============================================================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- Required buckets:
-- - application-documents (for customer documents)
-- - profile-pictures (for user profile pictures)

-- ============================================================================
-- SEED DATA (Optional - for development/testing)
-- ============================================================================

-- Insert default branch
INSERT INTO branches (id, name, address, contact_number)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Main Branch', '123 Main St', '+1234567890')
ON CONFLICT (id) DO NOTHING;

-- Insert default admin user
-- Note: Password must be set via Supabase Auth
-- Default credentials: admin@example.com / Admin123!
INSERT INTO users (id, email, role, full_name, primary_branch_id, is_first_login, must_change_password)
VALUES 
  (auth.uid(), 'admin@example.com', 'superadmin', 'System Administrator', '00000000-0000-0000-0000-000000000001', false, false)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- COMPLETION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NetHub Baseline Installation Complete!';
  RAISE NOTICE 'Schema Version: 027';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create storage buckets in Supabase Dashboard';
  RAISE NOTICE '2. Create admin user via Supabase Auth';
  RAISE NOTICE '3. Configure environment variables';
  RAISE NOTICE '4. Start the application';
  RAISE NOTICE '========================================';
END $$;
