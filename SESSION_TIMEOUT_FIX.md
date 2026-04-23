# Session Management - Simplified Approach

## Overview
Simplified session management with a straightforward 2-hour inactivity timeout. No complex token refresh logic, no proactive refreshes, just clean and simple.

## How It Works

### User Login
1. User logs in with email/password (and 2FA if required)
2. Supabase creates a session
3. Session is stored in localStorage
4. User is redirected to dashboard

### Session Monitoring
1. **Inactivity Timer**: Starts when user logs in
2. **Activity Detection**: Monitors user interactions (mouse, keyboard, touch, scroll)
3. **Timer Reset**: Any user activity resets the 2-hour countdown
4. **Auto Logout**: After 2 hours of no activity, user is automatically logged out

### Session Timeout
- **Duration**: 2 hours of inactivity
- **What counts as activity**: 
  - Mouse movement
  - Mouse clicks
  - Keyboard input
  - Scrolling
  - Touch events

### Logout Process
1. Call Supabase signOut with global scope
2. Clear user state
3. Clear all localStorage and sessionStorage
4. Redirect to login page

## Implementation Details

### AuthContext (`frontend/src/contexts/AuthContext.tsx`)
- Simple state management: `user`, `loading`
- Inactivity timer that resets on user activity
- Clean signOut function
- No complex token refresh logic
- No visibility change handlers
- No proactive refresh intervals

### Auth Library (`frontend/src/lib/auth.ts`)
- `getCurrentUser()`: Simple session check with 5-second timeout
- `getUserDetails()`: Fetch user data from database
- No complex error handling or retry logic
- Returns `null` on any error

### API Layer (`frontend/src/lib/api.ts`)
- `getAccessToken()`: Simple session fetch
- `apiRequest()`: Standard fetch with auth header
- No token refresh logic
- No retry mechanisms
- No complex timeout handling

### Supabase Client (`frontend/src/lib/supabase.ts`)
- Single client instance
- `autoRefreshToken: true` - Supabase handles token refresh automatically
- Simple configuration
- No custom fetch wrapper
- No session caching

## Removed Components

- **TokenRefreshProvider**: Removed - was conflicting with Supabase's built-in refresh
- **tokenRefresh.ts**: No longer needed - Supabase handles this internally

## Benefits

1. **Simple**: Easy to understand and maintain
2. **Predictable**: Clear 2-hour timeout, no surprises
3. **Fast**: No hanging requests or complex retry logic
4. **Reliable**: Fewer moving parts = fewer bugs
5. **User-Friendly**: Activity-based timeout feels natural

## User Experience

- **Active users**: Never logged out (activity resets timer)
- **Inactive users**: Logged out after 2 hours
- **First visit**: Fast loading, no hanging
- **Returning users**: Quick session check
- **Logout**: Clean and complete

## Testing

1. Log in and use the system normally - should stay logged in
2. Log in and leave idle for 2 hours - should auto logout
3. Log in, leave for 1.5 hours, move mouse - timer resets, stays logged in
4. First visit (no session) - should load quickly and show login page
5. Manual logout - should clear everything and redirect

## Configuration

To change the inactivity timeout, edit `INACTIVITY_TIMEOUT` in `AuthContext.tsx`:

```typescript
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
```

Examples:
- 1 hour: `1 * 60 * 60 * 1000`
- 30 minutes: `30 * 60 * 1000`
- 4 hours: `4 * 60 * 60 * 1000`
