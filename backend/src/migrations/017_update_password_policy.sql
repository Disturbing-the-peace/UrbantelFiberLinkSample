-- Update Supabase Auth Password Policy
-- This migration configures the password requirements to 8 characters minimum

-- Note: Supabase password policy is configured via the Supabase Dashboard or API
-- This file documents the required settings for reference

/*
To apply these settings, you need to update your Supabase project configuration:

Option 1: Via Supabase Dashboard
1. Go to Authentication > Policies in your Supabase Dashboard
2. Set "Minimum password length" to 8
3. Disable "Require uppercase letters" (optional)
4. Disable "Require special characters" (optional)
5. Keep "Require lowercase letters" enabled
6. Keep "Require numbers" enabled

Option 2: Via Supabase Management API
Run this command with your Supabase project credentials:

curl -X PATCH 'https://api.supabase.com/v1/projects/{project_ref}/config/auth' \
  -H "Authorization: Bearer {service_role_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "password_min_length": 8,
    "password_required_characters": "abcdefghijklmnopqrstuvwxyz0123456789"
  }'

Option 3: Via Environment Variables (if using self-hosted Supabase)
Add to your .env file:
GOTRUE_PASSWORD_MIN_LENGTH=8
GOTRUE_PASSWORD_REQUIRED_CHARACTERS=abcdefghijklmnopqrstuvwxyz0123456789
*/

-- This is a documentation-only migration
-- The actual password policy must be configured in Supabase Auth settings
SELECT 'Password policy should be configured to require 8 characters minimum' as note;
