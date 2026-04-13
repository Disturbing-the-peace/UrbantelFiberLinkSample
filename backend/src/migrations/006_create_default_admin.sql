-- UrbanConnect ISP System - Create Default Admin User
-- Migration: 006_create_default_admin
-- Description: Creates a default superadmin user for initial system access

-- ============================================================================
-- IMPORTANT INSTRUCTIONS
-- ============================================================================
-- This migration requires manual steps in Supabase Dashboard:
--
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" (or "Invite user")
-- 3. Create a user with:
--    - Email: admin@urbanconnect.com
--    - Password: (choose a secure password)
--    - Auto Confirm User: YES (check this box)
-- 4. After creating the user, copy the user's UUID
-- 5. Replace 'YOUR_USER_UUID_HERE' below with the actual UUID
-- 6. Run this SQL script
--
-- ============================================================================

-- Insert the superadmin user into public.users table
-- REPLACE 'YOUR_USER_UUID_HERE' with the actual UUID from Supabase Auth
INSERT INTO public.users (id, email, role, full_name, is_active)
VALUES 
  ('YOUR_USER_UUID_HERE', 'admin@urbanconnect.com', 'superadmin', 'Super Admin', true)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- Verify the user was created
SELECT id, email, role, full_name, is_active 
FROM public.users 
WHERE email = 'admin@urbanconnect.com';

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this migration:
-- 1. You can login at /login with admin@urbanconnect.com
-- 2. The user has 'superadmin' role with full system access
-- 3. 2FA is NOT required initially (can be enabled later)
-- 4. You can create additional admin users from the Users page in the dashboard
