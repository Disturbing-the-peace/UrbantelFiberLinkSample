-- Migration: Update user_auth_status view to include branch_id
-- Description: Adds branch_id to the user_auth_status view so frontend can query branch information

-- Drop and recreate the view to include branch_id
DROP VIEW IF EXISTS public.user_auth_status CASCADE;

CREATE VIEW public.user_auth_status AS
SELECT 
  u.id,
  u.email,
  u.role,
  u.full_name,
  u.is_active,
  u.branch_id,
  u.profile_picture_url,
  u.is_first_login,
  u.onboarding_completed,
  u.password_changed_at,
  u.last_login_at,
  u.created_at,
  u.updated_at,
  requires_2fa(u.id) as requires_2fa
FROM public.users u;

COMMENT ON VIEW public.user_auth_status IS 'View showing user authentication status including 2FA requirements, profile picture, onboarding status, and branch assignment';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'user_auth_status view updated with branch_id column';
END $$;
