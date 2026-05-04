-- Fix: Add current authenticated user to users table
-- Run this if you're getting "User not found in system" error

-- Step 1: Find your user ID from Supabase Auth
-- Go to Supabase Dashboard → Authentication → Users
-- Copy your user's UUID

-- Step 2: Replace 'YOUR_USER_UUID_HERE' with your actual UUID
-- Step 3: Replace 'your-email@example.com' with your actual email
-- Step 4: Run this SQL

INSERT INTO public.users (id, email, role, full_name, is_active)
VALUES 
  (
    'YOUR_USER_UUID_HERE',  -- Replace with your UUID from Supabase Auth
    'your-email@example.com',  -- Replace with your email
    'superadmin',  -- Role: 'superadmin' or 'admin'
    'Your Full Name',  -- Replace with your name
    true
  )
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- Verify the user was created
SELECT id, email, role, full_name, is_active 
FROM public.users 
WHERE email = 'your-email@example.com';  -- Replace with your email

-- Alternative: If you want to add ALL Supabase Auth users to the users table automatically
-- (Use this carefully - it will add all auth users as 'admin' role)
/*
INSERT INTO public.users (id, email, role, full_name, is_active)
SELECT 
  id,
  email,
  'admin' as role,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  true as is_active
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (id) DO NOTHING;
*/
