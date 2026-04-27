# Branch Access Control - Implementation Checklist

Use this checklist to track your implementation progress.

## Phase 1: Database Setup ✅

### Migrations
- [ ] Review migration files:
  - [ ] `019_add_branches.sql`
  - [ ] `020_assign_default_branch.sql`
  - [ ] `021_update_rls_for_branches.sql`
- [ ] Backup your database
- [ ] Run migrations using script:
  - [ ] Windows: `.\run-branch-migrations.ps1`
  - [ ] Linux/Mac: `./run-branch-migrations.sh`
- [ ] Verify migrations:
  ```sql
  SELECT * FROM branches;  -- Should show 3 branches
  SELECT COUNT(*) FROM users WHERE branch_id IS NULL;  -- Should be 0
  ```

### Verification
- [ ] All tables have `branch_id` column
- [ ] All existing records assigned to "Davao Del Sur"
- [ ] Three branches exist and are active
- [ ] RLS policies are updated
- [ ] No NULL branch_id values

## Phase 2: Backend Implementation ✅

### Code Updates
- [ ] Types updated (`backend/src/types/index.ts`)
- [ ] Auth middleware updated (`backend/src/middleware/auth.ts`)
- [ ] Branch filter helper created (`backend/src/middleware/branchFilter.ts`)
- [ ] Branches routes created (`backend/src/routes/branches.routes.ts`)
- [ ] All routes updated for branch filtering:
  - [ ] `agents.routes.ts`
  - [ ] `applications.routes.ts`
  - [ ] `commissions.routes.ts`
  - [ ] `subscribers.routes.ts`
  - [ ] `users.routes.ts`
  - [ ] `analytics.routes.ts`
- [ ] Main index.ts updated with branches route

### Testing
- [ ] Backend builds successfully: `npm run build`
- [ ] Backend starts without errors: `npm start`
- [ ] Test branches endpoint:
  ```bash
  curl -H "Authorization: Bearer <token>" http://localhost:5000/api/branches
  ```
- [ ] Test branch filtering:
  ```bash
  # Admin sees only their branch
  curl -H "Authorization: Bearer <admin_token>" http://localhost:5000/api/agents
  
  # Superadmin can filter by branch
  curl -H "Authorization: Bearer <superadmin_token>" \
    "http://localhost:5000/api/agents?branch_id=<uuid>"
  ```

## Phase 3: Frontend Implementation 🔄

### Context Setup
- [ ] Create `BranchContext.tsx`:
  - [ ] Define Branch interface
  - [ ] Create BranchContext
  - [ ] Create BranchProvider
  - [ ] Create useBranch hook
  - [ ] Fetch branches on mount
  - [ ] Set initial branch based on user role

- [ ] Update `AuthContext.tsx`:
  - [ ] Add `branch_id` to User interface
  - [ ] Add `branch` object to User interface
  - [ ] Fetch branch info with user data

### Components
- [ ] Create `BranchSwitcher.tsx`:
  - [ ] Show only for superadmins
  - [ ] Dropdown with all branches
  - [ ] "All Branches" option
  - [ ] Update context on change

- [ ] Update Dashboard Layout:
  - [ ] Wrap with BranchProvider
  - [ ] Add BranchSwitcher to header
  - [ ] Show current branch context

### API Integration
- [ ] Create API helper (`lib/api.ts`):
  - [ ] `useApiWithBranch` hook
  - [ ] `buildUrl` function
  - [ ] Auto-append branch_id parameter

- [ ] Update all data fetching:
  - [ ] Agents list
  - [ ] Applications list
  - [ ] Commissions list
  - [ ] Subscribers list
  - [ ] Analytics endpoints
  - [ ] Refetch on branch change

### Forms
- [ ] Update Agent Creation Form:
  - [ ] Add branch selector (superadmin only)
  - [ ] Use user.branch_id for admins
  - [ ] Validate branch_id is required
  - [ ] Submit with branch_id

- [ ] Update User Creation Form:
  - [ ] Add branch selector
  - [ ] Validate branch_id is required
  - [ ] Submit with branch_id

- [ ] Update Agent Edit Form:
  - [ ] Show current branch
  - [ ] Allow branch change (superadmin only)
  - [ ] Validate branch access

- [ ] Update User Edit Form:
  - [ ] Show current branch
  - [ ] Allow branch change (superadmin only)

### Tables
- [ ] Update Agents Table:
  - [ ] Add branch column
  - [ ] Show branch name
  - [ ] Add branch filter (superadmin)

- [ ] Update Applications Table:
  - [ ] Add branch column
  - [ ] Show branch name
  - [ ] Add branch filter (superadmin)

- [ ] Update Commissions Table:
  - [ ] Add branch column
  - [ ] Show branch name
  - [ ] Add branch filter (superadmin)

- [ ] Update Users Table:
  - [ ] Add branch column
  - [ ] Show branch name
  - [ ] Add branch filter (superadmin)

### Dashboard
- [ ] Update Dashboard Stats:
  - [ ] Show current branch context
  - [ ] Filter stats by branch
  - [ ] Update on branch change

- [ ] Update Analytics:
  - [ ] Filter all charts by branch
  - [ ] Show branch name in titles
  - [ ] Update on branch change

## Phase 4: Testing 🧪

### Superadmin Testing
- [ ] Login as superadmin
- [ ] Verify branch switcher appears
- [ ] Switch to "All Branches"
  - [ ] See all agents
  - [ ] See all applications
  - [ ] See all commissions
  - [ ] See all analytics
- [ ] Switch to "Davao Del Sur"
  - [ ] See only Davao Del Sur data
  - [ ] Stats update correctly
- [ ] Switch to "Davao de Oro"
  - [ ] See only Davao de Oro data
  - [ ] Stats update correctly
- [ ] Create agent in "Davao de Oro"
  - [ ] Agent appears in Davao de Oro
  - [ ] Agent doesn't appear in other branches
- [ ] Create user in "Davao Oriental"
  - [ ] User assigned to correct branch
- [ ] Edit agent branch
  - [ ] Agent moves to new branch
  - [ ] Data updates correctly

### Admin Testing
- [ ] Login as admin (Davao Del Sur)
- [ ] Verify NO branch switcher
- [ ] Verify only see Davao Del Sur data:
  - [ ] Agents list
  - [ ] Applications list
  - [ ] Commissions list
  - [ ] Dashboard stats
  - [ ] Analytics
- [ ] Try to create agent:
  - [ ] No branch selector visible
  - [ ] Agent created in admin's branch
- [ ] Try to access other branch data:
  - [ ] Direct API call should fail
  - [ ] UI should not show other branches
- [ ] Verify cannot see:
  - [ ] Agents from other branches
  - [ ] Applications from other branches
  - [ ] Commissions from other branches

### Data Integrity Testing
- [ ] Create application through agent portal
  - [ ] Application gets agent's branch_id
  - [ ] Visible to correct branch admins
- [ ] Activate application
  - [ ] Commission created with correct branch_id
  - [ ] Visible to correct branch admins
- [ ] Verify no data leakage:
  - [ ] Admin A cannot see Admin B's data
  - [ ] API calls respect branch filtering
  - [ ] Database queries enforce RLS

### Edge Cases
- [ ] User with no branch_id (shouldn't exist)
- [ ] Agent with no branch_id (shouldn't exist)
- [ ] Creating record without branch_id (should fail)
- [ ] Admin trying to access superadmin endpoints (should fail)
- [ ] Invalid branch_id in query parameter (should fail)
- [ ] Deactivated branch (should not appear in dropdowns)

## Phase 5: Documentation 📚

- [ ] Review implementation guides:
  - [ ] `QUICK_START_BRANCH_ACCESS.md`
  - [ ] `BRANCH_ACCESS_CONTROL_SUMMARY.md`
  - [ ] `BRANCH_ARCHITECTURE.md`
  - [ ] `backend/BRANCH_ACCESS_CONTROL_IMPLEMENTATION.md`
  - [ ] `frontend/BRANCH_UI_IMPLEMENTATION.md`

- [ ] Update team documentation:
  - [ ] Add branch access control to README
  - [ ] Document branch management procedures
  - [ ] Document user/agent assignment process

- [ ] Create user guides:
  - [ ] How to switch branches (superadmin)
  - [ ] How to create agents in branches
  - [ ] How to manage branch assignments

## Phase 6: Deployment 🚀

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Team notified of changes

### Deployment Steps
- [ ] Deploy database migrations
- [ ] Verify migrations successful
- [ ] Deploy backend code
- [ ] Verify backend health check
- [ ] Deploy frontend code
- [ ] Verify frontend loads

### Post-Deployment
- [ ] Smoke test with superadmin account
- [ ] Smoke test with admin account
- [ ] Verify existing data still accessible
- [ ] Monitor error logs
- [ ] Monitor performance metrics

### Rollback (if needed)
- [ ] Have rollback SQL ready
- [ ] Have previous code version ready
- [ ] Test rollback in staging first
- [ ] Document rollback procedure

## Phase 7: Training & Support 👥

### User Training
- [ ] Train superadmins on branch switcher
- [ ] Train admins on branch limitations
- [ ] Document common workflows
- [ ] Create FAQ document

### Support Preparation
- [ ] Document common issues
- [ ] Create troubleshooting guide
- [ ] Set up monitoring alerts
- [ ] Prepare support team

## Success Criteria ✅

### Functional Requirements
- [ ] Three branches exist and are active
- [ ] All existing data assigned to Davao Del Sur
- [ ] Superadmins can view all branches
- [ ] Superadmins can switch between branches
- [ ] Admins can only view their branch
- [ ] New records require branch assignment
- [ ] Branch filtering works on all endpoints
- [ ] Analytics respect branch filtering

### Non-Functional Requirements
- [ ] No performance degradation
- [ ] No data loss
- [ ] No security vulnerabilities
- [ ] Backward compatible
- [ ] Fully reversible
- [ ] Well documented

### User Experience
- [ ] Branch switcher is intuitive
- [ ] Forms are clear about branch requirement
- [ ] Tables show branch information
- [ ] No confusing error messages
- [ ] Smooth branch switching

## Notes

### Issues Encountered
```
Date: ___________
Issue: ___________________________________________
Resolution: ______________________________________
```

### Performance Metrics
```
Before:
- Average query time: _______
- Page load time: _______

After:
- Average query time: _______
- Page load time: _______
```

### Feedback
```
User feedback:
_________________________________________________
_________________________________________________

Action items:
_________________________________________________
_________________________________________________
```

## Sign-Off

- [ ] Database migrations completed by: _____________ Date: _______
- [ ] Backend implementation completed by: __________ Date: _______
- [ ] Frontend implementation completed by: _________ Date: _______
- [ ] Testing completed by: ______________________ Date: _______
- [ ] Deployment completed by: ____________________ Date: _______
- [ ] Final approval by: __________________________ Date: _______

---

**Status**: ⬜ Not Started | 🔄 In Progress | ✅ Complete

**Overall Progress**: ____%
