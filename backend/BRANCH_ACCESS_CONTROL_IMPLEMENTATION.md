# Branch-Based Access Control Implementation Guide

## Overview
This document describes the implementation of branch-based access control across the entire application. Every feature is now scoped to a branch, with three default branches: Davao Del Sur, Davao de Oro, and Davao Oriental.

## Database Changes

### 1. New Tables
- **branches**: Stores branch information (id, name, is_active)
  - Default branches: Davao Del Sur, Davao de Oro, Davao Oriental

### 2. Schema Updates
All relevant tables now have a `branch_id` column:
- `users` - Branch assignment for staff
- `agents` - Branch assignment for agents
- `applications` - Branch where application was submitted
- `commissions` - Branch for commission tracking
- `plans` - Branch-specific plan availability
- `events` - Branch for events

### 3. Migrations
- **019_add_branches.sql**: Creates branches table and adds branch_id to all tables
- **020_assign_default_branch.sql**: Assigns all existing records to "Davao Del Sur"
- **021_update_rls_for_branches.sql**: Updates RLS policies for branch filtering

## Access Control Rules

### Superadmin
- Can view and manage data across ALL branches
- Can optionally filter by specific branch using `?branch_id=<uuid>` query parameter
- Can create/update/delete branches
- Can assign users and agents to any branch

### Admin
- Can ONLY view and manage data in their assigned branch
- Cannot see data from other branches
- Cannot change branch assignments
- Cannot create/update/delete branches

## API Changes

### Authentication Middleware
The `req.user` object now includes `branch_id`:
```typescript
req.user = {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  branch_id: string;  // NEW
}
```

### Branch Filtering Helper
New middleware helper in `backend/src/middleware/branchFilter.ts`:
- `applyBranchFilter(query, req)`: Applies branch filtering to Supabase queries
- `getBranchFilterValue(req)`: Returns branch_id for count queries

### Updated Routes

#### Branches (`/api/branches`)
- `GET /api/branches` - List all branches (authenticated users)
- `GET /api/branches/:id` - Get single branch
- `POST /api/branches` - Create branch (superadmin only)
- `PUT /api/branches/:id` - Update branch (superadmin only)
- `DELETE /api/branches/:id` - Deactivate branch (superadmin only)

#### Agents (`/api/agents`)
- All endpoints now filter by branch
- `POST` requires `branch_id` in request body
- Admins can only create/update agents in their branch
- Superadmins can manage agents across all branches

#### Applications (`/api/applications`)
- All endpoints now filter by branch
- `branch_id` is automatically set from the agent's branch when application is submitted
- Admins see only applications in their branch
- Superadmins can filter by `?branch_id=<uuid>`

#### Commissions (`/api/commissions`)
- All endpoints now filter by branch
- `branch_id` is automatically set when commission is created
- Admins see only commissions in their branch
- Superadmins can filter by `?branch_id=<uuid>`

#### Subscribers (`/api/subscribers`)
- All endpoints now filter by branch
- Admins see only subscribers in their branch
- Superadmins can filter by `?branch_id=<uuid>`

#### Users (`/api/users`)
- `POST` requires `branch_id` in request body
- `PUT` allows updating `branch_id` (superadmin only)
- `GET` can filter by `?branch_id=<uuid>`

#### Analytics (`/api/analytics/*`)
- ALL analytics endpoints now respect branch filtering
- Admins see only stats for their branch
- Superadmins can filter by `?branch_id=<uuid>` or see all branches

## Frontend Changes Required

### 1. User Management
- Add branch selector when creating/editing users
- Display user's assigned branch in user list
- Show branch filter for superadmins

### 2. Agent Management
- Add branch selector when creating agents (required)
- Display agent's branch in agent list
- Show branch filter for superadmins
- Only superadmins can change agent's branch

### 3. Dashboard/Analytics
- Add branch switcher for superadmins in header/sidebar
- Show "All Branches" option for superadmins
- Display current branch context in UI
- Filter all data by selected branch

### 4. Application Forms
- `branch_id` is automatically determined from agent's branch
- No UI changes needed for public application form

### 5. Lists and Tables
- Add branch column to all data tables
- Show branch filter dropdown for superadmins
- Display current branch context

## Data Migration

### Running Migrations
```bash
# Run migrations in order
psql -U postgres -d your_database -f backend/src/migrations/019_add_branches.sql
psql -U postgres -d your_database -f backend/src/migrations/020_assign_default_branch.sql
psql -U postgres -d your_database -f backend/src/migrations/021_update_rls_for_branches.sql
```

### Verification
After running migrations, verify:
1. All existing records have `branch_id` set to "Davao Del Sur"
2. Three branches exist in the `branches` table
3. All tables have `branch_id` column with NOT NULL constraint
4. RLS policies are updated

```sql
-- Verify branch assignments
SELECT 'users' as table_name, COUNT(*) as total, COUNT(branch_id) as with_branch FROM users
UNION ALL
SELECT 'agents', COUNT(*), COUNT(branch_id) FROM agents
UNION ALL
SELECT 'applications', COUNT(*), COUNT(branch_id) FROM applications
UNION ALL
SELECT 'commissions', COUNT(*), COUNT(branch_id) FROM commissions
UNION ALL
SELECT 'plans', COUNT(*), COUNT(branch_id) FROM plans
UNION ALL
SELECT 'events', COUNT(*), COUNT(branch_id) FROM events;

-- Verify branches
SELECT * FROM branches ORDER BY name;
```

## Testing Checklist

### Backend Testing
- [ ] Superadmin can see all branches
- [ ] Admin can only see their branch
- [ ] Branch filtering works on all endpoints
- [ ] Creating records requires branch_id
- [ ] RLS policies enforce branch access
- [ ] Analytics respect branch filtering

### Frontend Testing
- [ ] Branch selector appears for superadmins
- [ ] Branch filter works on all lists
- [ ] Creating agents requires branch selection
- [ ] Creating users requires branch selection
- [ ] Dashboard shows correct branch data
- [ ] Analytics show correct branch data

## Rollback Plan

If issues occur, rollback in reverse order:
```sql
-- 1. Drop RLS policies
DROP POLICY IF EXISTS "Superadmins can manage all agents" ON agents;
-- ... (drop all new policies)

-- 2. Remove NOT NULL constraints
ALTER TABLE users ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE agents ALTER COLUMN branch_id DROP NOT NULL;
-- ... (for all tables)

-- 3. Drop branch_id columns
ALTER TABLE users DROP COLUMN branch_id;
ALTER TABLE agents DROP COLUMN branch_id;
-- ... (for all tables)

-- 4. Drop branches table
DROP TABLE branches;
```

## Future Enhancements

1. **Branch Transfer**: Allow transferring agents/users between branches
2. **Branch Reports**: Generate branch-specific reports
3. **Branch Quotas**: Set quotas/limits per branch
4. **Branch Settings**: Branch-specific configuration
5. **Multi-Branch View**: Allow superadmins to compare branches side-by-side
