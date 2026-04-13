-- UrbanConnect ISP System - Authentication Setup
-- Migration: 005_auth_setup
-- Description: Additional database functions and triggers for Supabase Auth integration

-- ============================================================================
-- AUTHENTICATION HELPER FUNCTIONS
-- ============================================================================

-- Function to get user role from auth.users
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id AND is_active = true;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_role IS 'Returns the role of an authenticated user';

-- Function to check if user requires 2FA
CREATE OR REPLACE FUNCTION public.requires_2fa(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id AND is_active = true;
  
  -- Admin and superadmin roles require 2FA
  RETURN user_role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.requires_2fa IS 'Checks if user role requires 2FA (admin/superadmin)';

-- Function to validate user is active
CREATE OR REPLACE FUNCTION public.is_user_active(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  active BOOLEAN;
BEGIN
  SELECT is_active INTO active
  FROM public.users
  WHERE id = user_id;
  
  RETURN COALESCE(active, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_user_active IS 'Checks if user account is active';

-- ============================================================================
-- TRIGGER: Sync auth.users with public.users
-- ============================================================================
-- This trigger ensures that when a user is created in Supabase Auth,
-- a corresponding record is created in public.users table

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users when new auth user is created
  -- Note: This should be called manually or via API when creating users
  -- as Supabase Auth triggers are limited
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Supabase Auth triggers are configured in the dashboard
-- This function is a placeholder for reference

-- ============================================================================
-- HELPER VIEW: User Authentication Status
-- ============================================================================

CREATE OR REPLACE VIEW public.user_auth_status AS
SELECT 
  u.id,
  u.email,
  u.role,
  u.full_name,
  u.is_active,
  u.created_at,
  u.updated_at,
  requires_2fa(u.id) as requires_2fa
FROM public.users u;

COMMENT ON VIEW public.user_auth_status IS 'View showing user authentication status including 2FA requirements';

-- Grant access to authenticated users to view their own status
CREATE POLICY "Users can view own auth status"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- ============================================================================
-- AUDIT LOG: Authentication Events
-- ============================================================================

-- Function to log authentication events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    action,
    entity_type,
    entity_id,
    metadata,
    performed_by,
    performed_at
  ) VALUES (
    p_event_type,
    'auth_event',
    p_user_id,
    p_metadata,
    p_user_id,
    NOW()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_auth_event IS 'Logs authentication events to audit_log table';

-- ============================================================================
-- INDEXES FOR AUTHENTICATION QUERIES
-- ============================================================================

-- Index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role) WHERE is_active = true;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email) WHERE is_active = true;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'Internal staff accounts with role-based access control. Synced with Supabase Auth.';

