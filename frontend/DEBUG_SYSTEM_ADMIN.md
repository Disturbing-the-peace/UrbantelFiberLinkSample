# Debug System Administrator Access Issue

## Steps to Debug

### 1. Check User Role in Database

Run this SQL query in your Supabase database:

```sql
SELECT id, email, role, full_name, is_active
FROM users
WHERE email = 'eealforte0924@proton.me';
```

**Expected Result:**
- `role` should be `'system_administrator'`

### 2. Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Log in as `eealforte0924@proton.me`
4. Try to access `/dashboard/users`

**Look for these console logs:**

```
ProtectedRoute - loading: false, user: { role: 'system_administrator', ... }
ProtectedRoute useEffect - loading: false, user: { role: 'system_administrator', ... }, requiredRole: 'superadmin'
Authorization check: {
  userRole: 'system_administrator',
  requiredRole: 'superadmin',
  hasElevatedAccess: true,
  isAuthorized: true
}
User authenticated and authorized
Final authorization check: {
  userRole: 'system_administrator',
  requiredRole: 'superadmin',
  hasElevatedAccess: true,
  willRender: true
}
```

### 3. Check What You're Actually Seeing

**If you see:**
```
userRole: 'admin'
```
**Problem:** The database role wasn't updated. Run the migration again.

**If you see:**
```
hasElevatedAccess: false
```
**Problem:** The role check logic isn't working. This shouldn't happen with the current code.

**If you see:**
```
isAuthorized: false
```
**Problem:** The authorization logic is failing. Check the ProtectedRoute code.

**If you see:**
```
User role system_administrator not authorized for superadmin, redirecting to dashboard
```
**Problem:** The useEffect is redirecting before the component renders.

### 4. Check Network Tab

1. Open DevTools Network tab
2. Log in
3. Look for the API call to get user details
4. Check the response - what role does it return?

### 5. Clear Everything

If the role is correct in the database but wrong in the frontend:

1. **Clear browser cache completely**
   - Chrome: Ctrl+Shift+Delete → Clear all
   - Or use Incognito mode

2. **Clear local storage**
   - DevTools → Application → Local Storage → Clear all

3. **Hard refresh**
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)

4. **Restart frontend**
   ```bash
   cd frontend
   # Kill the process (Ctrl+C)
   npm run dev
   ```

### 6. Check TypeScript Compilation

Make sure TypeScript compiled the changes:

```bash
cd frontend
# Check for any TypeScript errors
npm run build
```

### 7. Verify the User Object

Add this temporary code to the Users page to see what the user object contains:

```typescript
// Add at the top of UsersPageContent component
console.log('Current user object:', user);
console.log('User role:', user?.role);
console.log('User role type:', typeof user?.role);
console.log('Is system_administrator?:', user?.role === 'system_administrator');
```

### 8. Check if Migration Ran Successfully

```sql
-- Check if the role constraint was updated
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'users_role_check';

-- Expected: CHECK constraint should include 'system_administrator'
```

### 9. Check RLS Policies

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE policyname LIKE '%System administrator%'
ORDER BY tablename;

-- Should see multiple policies for system administrators
```

### 10. Test with Superadmin

1. Log in as a superadmin user
2. Can you access Users and Purge Logs pages?
3. If yes, the pages work - it's just the system_administrator role check
4. If no, there's a bigger issue

## Common Issues and Solutions

### Issue 1: Role is 'admin' in console but 'system_administrator' in database

**Solution:**
1. Log out completely
2. Clear browser cache and local storage
3. Log back in
4. The user object should refresh

### Issue 2: hasElevatedAccess is false

**Solution:**
Check the exact string comparison:
```typescript
console.log('Role comparison:', {
  role: user.role,
  roleType: typeof user.role,
  isSuper: user.role === 'superadmin',
  isSysAdmin: user.role === 'system_administrator',
  hasElevated: user.role === 'superadmin' || user.role === 'system_administrator'
});
```

### Issue 3: Page redirects immediately

**Solution:**
The useEffect might be running before the final check. Try commenting out the useEffect redirect temporarily to see if the final check works.

### Issue 4: TypeScript type mismatch

**Solution:**
Make sure all type definitions are updated:
- `frontend/src/types/index.ts`
- `frontend/src/lib/auth.ts`
- `frontend/src/components/ProtectedRoute.tsx`

## Quick Test

Create a simple test page to verify the role:

```typescript
// frontend/src/app/test-role/page.tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';

export default function TestRole() {
  const { user } = useAuth();
  
  return (
    <div className="p-8">
      <h1>Role Test</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      <p>Role: {user?.role}</p>
      <p>Is system_administrator: {String(user?.role === 'system_administrator')}</p>
      <p>Has elevated access: {String(user?.role === 'superadmin' || user?.role === 'system_administrator')}</p>
    </div>
  );
}
```

Navigate to `/test-role` and check the output.

## Report Back

Please provide:
1. The console logs from step 2
2. The database query result from step 1
3. What you see in the test page
4. Any error messages

This will help identify exactly where the issue is!
