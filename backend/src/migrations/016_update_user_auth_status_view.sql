-- Migration: Update user_auth_status view to include first login and onboarding fields
-- Description: Updates the user_auth_status view to include is_first_login and onboarding_completed fields

-- Drop and recreate the view to include the new columns
DROP VIEW IF EXISTS public.user_auth_status CASCADE;

CREATE VIEW public.user_auth_status AS
SELECT 
  u.id,
  u.email,
  u.role,
  u.full_name,
  u.is_active,
  u.profile_picture_url,
  u.is_first_login,
  u.onboarding_completed,
  u.password_changed_at,
  u.last_login_at,
  u.created_at,
  u.updated_at,
  requires_2fa(u.id) as requires_2fa
FROM public.users u;

COMMENT ON VIEW public.user_auth_status IS 'View showing user authentication status including 2FA requirements, profile picture, and onboarding status';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'user_auth_status view updated with first login and onboarding fields';
END $$;