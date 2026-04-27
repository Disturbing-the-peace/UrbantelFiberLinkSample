# Branch Assignment Implementation

## Overview
Implemented branch assignment for users and automatic branch inheritance for agents. Users are assigned to branches, and when they create agents, those agents automatically inherit the user's branch.

## Changes Made

### 1. User Management - Branch Assignment

#### Frontend (`frontend/src/app/dashboard/users/page.tsx`)
- **Added Branch Dropdown**: User creation/edit form now includes a branch selection dropdown
- **Branch Fetching**: Fetches all available branches from the API on modal open
- **Required Field**: Branch is now required when creating or editing users
- **Form State**: Added `branch_id` to form data state
- **Loading State**: Shows "Loading branches..." while fetching branch list

**Key Features:**
- Dropdown shows branch name and code: "Branch Name (CODE)"
- Disabled while loading branches
- Validates branch selection before submission
- Updates both create and edit operations

#### Backend (Already Implemented)
- `POST /api/users` - Requires `branch_id` in request body
- `PUT /api/users/:id` - Allows updating `branch_id`
- RLS policies enforce branch-based access control

### 2. Agent Creation - Automatic Branch Inheritance

#### Frontend (`frontend/src/app/dashboard/agents/page.tsx`)
- **Automatic Branch Assignment**: When creating an agent, automatically uses the logged-in user's `branch_id`
- **No UI Changes**: Branch field is NOT shown in the agent form (automatic assignment)
- **Auth Context**: Uses `useAuth()` hook to access current user's branch
- **Seamless UX**: Users don't need to select a branch - it's inherited automatically

**Implementation:**
```typescript
const dataToSubmit = agent 
  ? formData 
  : { ...formData, branch_id: user?.branch_id };
```

#### Backend (`backend/src/routes/agents.routes.ts`)
- **Fallback Logic**: Uses provided `branch_id` OR defaults to user's `branch_id`
- **Backward Compatible**: Still accepts `branch_id` in request body if provided
- **Validation**: Ensures admins can only create agents in their assigned branch
- **Automatic Assignment**: If no `branch_id` provided, uses `req.user!.branch_id`

**Implementation:**
```typescript
const agentBranchId = branch_id || req.user!.branch_id;
```

## User Flow

### Creating a User (Superadmin)
1. Navigate to Users page
2. Click "Create User"
3. Fill in:
   - Email
   - Full Name
   - Role (Admin/Superadmin)
   - **Branch** (dropdown with all branches)
   - Password
4. Submit
5. User is created with assigned branch

### Editing a User (Superadmin)
1. Click "Edit" on a user
2. Modify fields including **Branch**
3. Submit
4. User's branch assignment is updated

### Creating an Agent (Admin/Superadmin)
1. Navigate to Agents page
2. Click "Create Agent"
3. Fill in:
   - Name
   - Contact Number (optional)
   - Email (optional)
   - Role (CBA/Team Leader/Organic)
   - Team Leader (optional)
4. Submit
5. **Agent automatically inherits the logged-in user's branch**
6. No branch selection needed - completely automatic

## Access Control

### User Branch Assignment
- **Superadmin**: Can assign users to any branch
- **Admin**: Cannot create/edit users (protected by role check)

### Agent Branch Inheritance
- **Superadmin**: Creates agents in their assigned branch (or can specify different branch via API)
- **Admin**: Creates agents in their assigned branch only
- **Validation**: Backend prevents admins from creating agents in other branches

## Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT,
  branch_id UUID REFERENCES branches(id),  -- User's assigned branch
  ...
)
```

### Agents Table
```sql
agents (
  id UUID PRIMARY KEY,
  name TEXT,
  referral_code TEXT,
  branch_id UUID REFERENCES branches(id),  -- Inherited from creator
  ...
)
```

## Benefits

### 1. Simplified Agent Creation
- No need to select branch every time
- Reduces user error
- Faster workflow
- Consistent branch assignment

### 2. Automatic Branch Segregation
- Agents automatically belong to creator's branch
- Maintains data isolation
- Enforces branch-based access control
- Clear organizational structure

### 3. Flexible User Management
- Superadmins can assign users to any branch
- Easy to reorganize teams
- Clear branch visibility in user list
- Supports multi-branch operations

## API Endpoints

### Users
```
POST   /api/users
Body: { email, full_name, role, branch_id, password }

PUT    /api/users/:id
Body: { full_name, role, branch_id, is_active }
```

### Agents
```
POST   /api/agents
Body: { name, contact_number, email, role, team_leader_id, [branch_id] }
Note: branch_id is optional - defaults to user's branch_id
```

### Branches
```
GET    /api/branches
Returns: [{ id, name, code, address, contact_number, email, is_active }]
```

## Testing Checklist

### User Branch Assignment
- [ ] Create user with branch selection
- [ ] Edit user and change branch
- [ ] Verify branch dropdown loads all branches
- [ ] Verify branch is required (validation)
- [ ] Check user list shows branch info (if displayed)

### Agent Branch Inheritance
- [ ] Create agent as Admin - verify agent has admin's branch
- [ ] Create agent as Superadmin - verify agent has superadmin's branch
- [ ] Verify no branch field shown in agent form
- [ ] Check agent list shows correct branch
- [ ] Verify RLS policies filter agents by branch

### Access Control
- [ ] Admin cannot create agents in other branches
- [ ] Superadmin can create agents (inherits their branch)
- [ ] Branch filtering works correctly
- [ ] Users only see agents in their branch (admins)
- [ ] Superadmins see all agents

## Future Enhancements

### Potential Features
1. **Branch Transfer**: UI for transferring agents between branches
2. **Bulk Assignment**: Assign multiple agents to a different branch
3. **Branch Statistics**: Show agent count per branch in user list
4. **Branch History**: Track branch assignment changes in audit log
5. **Branch Selector for Superadmin**: Allow superadmins to optionally select branch when creating agents
6. **Branch Dashboard**: Overview of all branches with agent counts

## Related Files

### Frontend
- `frontend/src/app/dashboard/users/page.tsx` - User management with branch dropdown
- `frontend/src/app/dashboard/agents/page.tsx` - Agent creation with automatic branch
- `frontend/src/app/dashboard/branches/page.tsx` - Branch management
- `frontend/src/lib/branches.api.ts` - Branch API client

### Backend
- `backend/src/routes/users.routes.ts` - User CRUD with branch_id
- `backend/src/routes/agents.routes.ts` - Agent creation with branch inheritance
- `backend/src/routes/branches.routes.ts` - Branch CRUD operations
- `backend/src/middleware/auth.ts` - Auth middleware with branch_id
- `backend/src/middleware/branchFilter.ts` - Branch filtering helpers

### Database
- `backend/src/migrations/019_add_branches.sql` - Branches table and foreign keys
- `backend/src/migrations/020_assign_default_branch.sql` - Default branch assignment
- `backend/src/migrations/021_update_rls_for_branches.sql` - RLS policies
- `backend/src/migrations/022_update_user_auth_status_with_branch.sql` - View update
- `backend/src/migrations/023_fix_rls_infinite_recursion.sql` - RLS fix

## Troubleshooting

### Issue: Branch dropdown is empty
**Solution**: Check that branches exist in database and API endpoint is accessible

### Issue: Agent created in wrong branch
**Solution**: Verify user's branch_id is set correctly in auth context

### Issue: Cannot create agent (403 error)
**Solution**: Check that user's branch_id matches the branch they're trying to create in

### Issue: Branch not showing in user menu
**Solution**: Ensure migrations 022 and 023 are applied (view update and RLS fix)

## Documentation
- Main Architecture: `BRANCH_ARCHITECTURE.md`
- Backend Implementation: `backend/BRANCH_ACCESS_CONTROL_IMPLEMENTATION.md`
- Frontend Implementation: `BRANCH_FRONTEND_IMPLEMENTATION.md`
- Summary: `BRANCH_IMPLEMENTATION_COMPLETE.md`
