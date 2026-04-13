-- UrbanConnect ISP System - Profile Pictures
-- Migration: 011_add_profile_pictures
-- Description: Add profile picture support for users

-- ============================================================================
-- ADD PROFILE PICTURE COLUMN TO USERS TABLE
-- ============================================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

COMMENT ON COLUMN users.profile_picture_url 
IS 'URL to user profile picture stored in Supabase Storage';

-- ============================================================================
-- UPDATE user_auth_status VIEW TO INCLUDE PROFILE PICTURE
-- ============================================================================
-- Drop and recreate the view to include the new column
DROP VIEW IF EXISTS public.user_auth_status CASCADE;

CREATE VIEW public.user_auth_status AS
SELECT 
  u.id,
  u.email,
  u.role,
  u.full_name,
  u.is_active,
  u.profile_picture_url,
  u.created_at,
  u.updated_at,
  requires_2fa(u.id) as requires_2fa
FROM public.users u;

COMMENT ON VIEW public.user_auth_status IS 'View showing user authentication status including 2FA requirements and profile picture';

-- ============================================================================
-- STORAGE BUCKET SETUP INSTRUCTIONS
-- ============================================================================
-- IMPORTANT: Storage policies cannot be created via regular SQL migrations.
-- You must create the storage bucket and policies manually in the Supabase Dashboard.
--
-- Follow these steps:
--
-- 1. CREATE STORAGE BUCKET:
--    - Go to Supabase Dashboard > Storage
--    - Click "New bucket"
--    - Name: profile-pictures
--    - Public: Yes (checked)
--    - File size limit: 2MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- 2. CREATE POLICIES (in Supabase Dashboard > Storage > profile-pictures > Policies):
--
--    Policy 1: "Users can upload their own profile picture"
--    - Operation: INSERT
--    - Policy definition:
--      bucket_id = 'profile-pictures' AND
--      auth.uid()::text = (storage.foldername(name))[1]
--
--    Policy 2: "Public can view profile pictures"
--    - Operation: SELECT
--    - Policy definition:
--      bucket_id = 'profile-pictures'
--
--    Policy 3: "Users can update their own profile picture"
--    - Operation: UPDATE
--    - Policy definition:
--      bucket_id = 'profile-pictures' AND
--      auth.uid()::text = (storage.foldername(name))[1]
--
--    Policy 4: "Users can delete their own profile picture"
--    - Operation: DELETE
--    - Policy definition:
--      bucket_id = 'profile-pictures' AND
--      auth.uid()::text = (storage.foldername(name))[1]
--
-- 3. VERIFY SETUP:
--    Run this query to check if the column was added:
--    SELECT column_name, data_type FROM information_schema.columns 
--    WHERE table_name = 'users' AND column_name = 'profile_picture_url';
--
-- File path format: {user_id}/profile.{ext}
-- Example: 550e8400-e29b-41d4-a716-446655440000/profile.jpg
-- ============================================================================
