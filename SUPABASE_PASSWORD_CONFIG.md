# Supabase Password Policy Configuration

This project requires an 8-character minimum password policy. Follow these steps to configure Supabase:

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Policies** (or **Settings** → **Authentication**)
4. Update the password requirements:
   - **Minimum password length**: `8`
   - **Require uppercase letters**: `Disabled` (optional)
   - **Require lowercase letters**: `Enabled`
   - **Require numbers**: `Enabled`
   - **Require special characters**: `Disabled` (optional)
5. Click **Save**

## Option 2: Via Supabase Management API

If you prefer to configure via API, use this curl command:

```bash
curl -X PATCH 'https://api.supabase.com/v1/projects/{YOUR_PROJECT_REF}/config/auth' \
  -H "Authorization: Bearer {YOUR_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "password_min_length": 8,
    "password_required_characters": "abcdefghijklmnopqrstuvwxyz0123456789"
  }'
```

Replace:
- `{YOUR_PROJECT_REF}`: Your Supabase project reference ID
- `{YOUR_SERVICE_ROLE_KEY}`: Your service role key (found in Settings → API)

## Option 3: Self-Hosted Supabase

If you're running a self-hosted Supabase instance, add these environment variables:

```env
GOTRUE_PASSWORD_MIN_LENGTH=8
GOTRUE_PASSWORD_REQUIRED_CHARACTERS=abcdefghijklmnopqrstuvwxyz0123456789
```

## Current Password Requirements

After configuration, passwords must:
- ✅ Be at least **8 characters** long
- ✅ Contain at least one **lowercase letter**
- ✅ Contain at least one **number**
- ❌ Uppercase letters (optional)
- ❌ Special characters (optional)

## Verification

To verify the configuration is working:
1. Try creating a user with a 7-character password → Should fail
2. Try creating a user with an 8-character password (e.g., `password123`) → Should succeed
3. Check the browser console for any auth errors

## Troubleshooting

If you still see "Password should be at least 12 characters" errors:
1. Clear your browser cache and localStorage
2. Restart your backend server
3. Verify the Supabase dashboard shows the correct settings
4. Check that you're using the correct Supabase project

## Related Files

- Backend config: `backend/src/config/auth.config.ts`
- Frontend validation: `frontend/src/components/FirstLoginModal.tsx`
- Backend validation: `backend/src/routes/auth.routes.ts`
