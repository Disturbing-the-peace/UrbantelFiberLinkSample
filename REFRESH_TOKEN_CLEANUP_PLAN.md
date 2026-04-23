# Refresh Token Cleanup Plan

## Overview
The codebase still contains remnants of the old manual token refresh system that conflicts with Supabase's built-in `autoRefreshToken` feature. This is causing "Invalid Refresh Token: Refresh Token Not Found" errors.

## Current State Analysis

### Files to DELETE Completely
1. **`frontend/src/lib/tokenRefresh.ts`** - Entire file (162 lines)
   - Contains manual token refresh logic
   - Implements `startTokenRefreshService()`, `stopTokenRefreshService()`, `refreshToken()`, `forceRefreshToken()`
   - Conflicts with Supabase's built-in refresh mechanism

2. **`frontend/src/components/TokenRefreshProvider.tsx`** - Entire file (53 lines)
   - Wrapper component that starts/stops the manual refresh service
   - No longer needed since Supabase handles this automatically
   - Currently NOT imported/used anywhere (already orphaned)

### Files to MODIFY

#### 1. `frontend/src/contexts/AuthContext.tsx`
**Lines to Remove/Modify:**
- Line 109-112: Remove `TOKEN_REFRESHED` event handler
  ```typescript
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('[AuthContext] Token refreshed, keeping current user');
    // Don't change user state on token refresh
  ```
- Line 94-96: Update comment (remove mention of token refresh)
  ```typescript
  // This prevents refetching on token refresh
  ```
  Change to:
  ```typescript
  // This prevents unnecessary refetching
  ```

#### 2. `frontend/src/lib/auth.ts`
**Lines to Remove:**
- Line 372-373: Remove refresh token error mapping
  ```typescript
  'Invalid refresh token': 'Your session has expired. Please login again.',
  ```

#### 3. `backend/src/config/auth.config.ts`
**Lines to Remove:**
- Line 111-112: Remove refresh token error mapping
  ```typescript
  'Invalid refresh token': 'Your session has expired. Please login again.',
  ```

#### 4. `backend/src/config/supabase.ts`
**Current Configuration (Line 24-26):**
```typescript
auth: {
  autoRefreshToken: false,
  persistSession: false
}
```
**Note:** Backend should have `autoRefreshToken: false` because it's stateless. This is CORRECT.

#### 5. `frontend/src/lib/supabase.ts`
**Current Configuration (Line 17-18):**
```typescript
autoRefreshToken: true, // Let Supabase handle token refresh
```
**Note:** This is CORRECT - frontend should have auto refresh enabled.

### Test Files (Optional Cleanup)
These are just mocks and don't affect functionality, but can be cleaned up:
- `frontend/src/app/dashboard/subscribers/page.test.tsx` (Line 10)
- `frontend/src/app/dashboard/users/page.test.tsx` (Line 18)
- `frontend/src/app/dashboard/commissions/page.test.tsx` (Line 9)

All have: `getItem: jest.fn(() => 'mock-token')`
These are fine to leave as-is since they're just test mocks.

## Root Cause of Current Error

The error "Invalid Refresh Token: Refresh Token Not Found" is likely caused by:

1. **Old localStorage data** from the previous manual refresh system
2. **Conflicting refresh attempts** between:
   - Supabase's built-in `autoRefreshToken: true` (correct)
   - Old manual refresh code (if TokenRefreshProvider was ever used)

## Recommended Cleanup Steps

### Step 1: Delete Files
```bash
rm frontend/src/lib/tokenRefresh.ts
rm frontend/src/components/TokenRefreshProvider.tsx
```

### Step 2: Update AuthContext.tsx
Remove the `TOKEN_REFRESHED` event handler and update comments.

### Step 3: Update Error Mappings
Remove "Invalid refresh token" from error mappings in:
- `frontend/src/lib/auth.ts`
- `backend/src/config/auth.config.ts`

### Step 4: Clear User Browser Storage (User Action)
Users experiencing the error should:
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear all localStorage and sessionStorage
4. Refresh the page
5. Log in again

### Step 5: Verify Configuration
Confirm that:
- Frontend: `autoRefreshToken: true` ✓ (already correct)
- Backend: `autoRefreshToken: false` ✓ (already correct)

## Expected Behavior After Cleanup

1. **Token Refresh**: Handled automatically by Supabase SDK
2. **Session Management**: 2-hour inactivity timeout (as per SESSION_TIMEOUT_FIX.md)
3. **No Manual Refresh**: All manual refresh logic removed
4. **Clean Errors**: No more "Invalid Refresh Token" errors
5. **Simpler Codebase**: Less code to maintain

## Files Summary

### To Delete (2 files):
- `frontend/src/lib/tokenRefresh.ts`
- `frontend/src/components/TokenRefreshProvider.tsx`

### To Modify (3 files):
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/lib/auth.ts`
- `backend/src/config/auth.config.ts`

### Already Correct (2 files):
- `frontend/src/lib/supabase.ts` (autoRefreshToken: true)
- `backend/src/config/supabase.ts` (autoRefreshToken: false)

## Verification Checklist

After cleanup, verify:
- [ ] No imports of `tokenRefresh` anywhere
- [ ] No imports of `TokenRefreshProvider` anywhere
- [ ] No `TOKEN_REFRESHED` event handlers
- [ ] No manual `refreshSession()` calls (except in Supabase SDK)
- [ ] Frontend has `autoRefreshToken: true`
- [ ] Backend has `autoRefreshToken: false`
- [ ] Users can log in without refresh token errors
- [ ] Sessions persist correctly with activity
- [ ] Inactive sessions timeout after 2 hours

## Additional Notes

- The SESSION_TIMEOUT_FIX.md already documents that these components should be removed
- TokenRefreshProvider is already orphaned (not imported anywhere)
- The manual refresh logic was conflicting with Supabase's built-in mechanism
- Supabase SDK handles token refresh automatically when `autoRefreshToken: true`
