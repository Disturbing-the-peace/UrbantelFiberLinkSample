# Session Timeout Fix

## Problem
After the site was idle for a couple of hours, navigating to a different page would get stuck in loading state. This was caused by expired authentication tokens and hanging refresh operations.

## Root Causes
1. **Expired tokens**: Supabase tokens expire after 1 hour, and after 2+ hours of inactivity, the refresh token would also be stale
2. **Long timeouts**: Token refresh operations had 10-30 second timeouts, causing the UI to hang
3. **No expiration checks**: The app didn't check if tokens were already expired before using them
4. **Race conditions**: Multiple components could trigger token refresh simultaneously
5. **No visibility handling**: When users returned to the tab after hours, the app didn't validate the session

## Solutions Implemented

### 1. Improved Token Expiration Handling (`frontend/src/lib/api.ts`)
- Added explicit check for already-expired tokens before attempting to use them
- Reduced session fetch timeout from 5s to 3s for faster failure detection
- Added check for expired sessions immediately after fetching from Supabase
- Implemented refresh promise deduplication to prevent multiple simultaneous refresh attempts

### 2. Faster Timeouts (`frontend/src/lib/api.ts`)
- Reduced token refresh timeout from 10s to 5s
- Reduced API request timeout from 30s to 15s
- Reduced retry request timeout from 60s to 15s
- These shorter timeouts prevent the UI from hanging and provide faster feedback

### 3. Session Validation on Tab Visibility (`frontend/src/contexts/AuthContext.tsx`)
- Added `visibilitychange` event listener to validate session when user returns to tab
- Automatically refreshes expired sessions when tab becomes visible
- Clears user state if session is invalid, prompting re-login

### 4. Improved Proactive Refresh (`frontend/src/contexts/AuthContext.tsx`)
- Changed refresh interval from 50 minutes to 45 minutes for better safety margin
- Added timeout protection to prevent hanging refresh operations
- Better error handling for refresh failures

### 5. Global Fetch Timeout (`frontend/src/lib/supabase.ts`)
- Added 10-second timeout to all Supabase client requests
- Prevents hanging connections at the Supabase SDK level

## Testing Recommendations
1. Leave the site idle for 2+ hours, then try navigating to different pages
2. Close the browser tab for 2+ hours, reopen, and try to use the app
3. Test with network throttling to simulate slow connections
4. Monitor browser console for timeout messages and session refresh logs

## Expected Behavior
- If session is expired and can be refreshed: Automatic refresh, seamless navigation
- If session is expired and cannot be refreshed: Quick redirect to login page (within 5-15 seconds)
- No more indefinite loading states
