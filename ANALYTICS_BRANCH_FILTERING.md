# Analytics Branch Filtering Implementation

## Overview
Updated all analytics endpoints to respect branch-based access control. Admins now see analytics only for their assigned branch, while superadmins can view all branches or filter by specific branch.

## Changes Made

### Backend (`backend/src/routes/analytics.routes.ts`)

All 20 analytics endpoints have been updated to include branch filtering:

#### Endpoints Updated:
1. ✅ `/api/analytics/subscribers-monthly` - Monthly subscriber count
2. ✅ `/api/analytics/subscribers-per-agent` - Subscribers grouped by agent
3. ✅ `/api/analytics/subscribers-per-plan` - Subscribers grouped by plan
4. ✅ `/api/analytics/subscription-trends` - 12-month subscription trends
5. ✅ `/api/analytics/conversion-rate` - Application conversion rate
6. ✅ `/api/analytics/pending-applications` - Pending applications count
7. ✅ `/api/analytics/total-commissions-due` - Total eligible commissions
8. ✅ `/api/analytics/pipeline-snapshot` - Applications by status
9. ✅ `/api/analytics/agent-rankings` - Agent rankings by activations
10. ✅ `/api/analytics/agent-activations-by-status` - Agent breakdown by status
11. ✅ `/api/analytics/stuck-applications` - Applications stuck in status
12. ✅ `/api/analytics/agent-commissions-breakdown` - Commission breakdown per agent
13. ✅ `/api/analytics/pipeline-duration` - Average activation time
14. ✅ `/api/analytics/plan-category-distribution` - Plan category distribution
15. ✅ `/api/analytics/revenue-estimates` - Monthly revenue estimates
16. ✅ `/api/analytics/denial-reasons` - Common denial reasons
17. ✅ `/api/analytics/subscriber-locations` - Subscriber map locations
18. ✅ `/api/analytics/agent-conversion-rates` - Conversion rate per agent
19. ✅ `/api/analytics/plan-conversion-rates` - Conversion rate per plan
20. ✅ `/api/analytics/growth-comparison` - Month-over-month growth

## Implementation Pattern

### For Regular Queries (applications, commissions)
```typescript
let query = supabase
  .from('applications')
  .select('...');

// Apply branch filtering
query = applyBranchFilter(query, req);

const { data, error } = await query;
```

### For Count Queries
```typescript
const branchFilter = getBranchFilterValue(req);

let query = supabase
  .from('applications')
  .select('*', { count: 'exact', head: true });

if (branchFilter) {
  query = query.eq('branch_id', branchFilter);
}

const { count, error } = await query;
```

## Branch Filtering Logic

### For Admins
- Automatically filtered to their assigned `branch_id`
- Cannot see data from other branches
- No query parameter needed

### For Superadmins
- See all branches by default
- Can optionally filter by specific branch using `?branch_id=<uuid>` query parameter
- Useful for branch-specific reports

## Helper Functions Used

### `applyBranchFilter(query, req)`
- Applies branch filtering to Supabase queries
- Checks user role and applies appropriate filter
- Returns modified query

### `getBranchFilterValue(req)`
- Extracts branch filter value for the current user
- Returns `branch_id` for admins
- Returns query parameter `branch_id` for superadmins (if provided)
- Returns `null` for superadmins without filter (all branches)

## Access Control

### Admin User
```
GET /api/analytics/subscribers-monthly
→ Returns: Subscribers in admin's branch only
```

### Superadmin User (All Branches)
```
GET /api/analytics/subscribers-monthly
→ Returns: Subscribers across all branches
```

### Superadmin User (Specific Branch)
```
GET /api/analytics/subscribers-monthly?branch_id=<uuid>
→ Returns: Subscribers in specified branch only
```

## Testing

### Test as Admin
1. Login as admin user assigned to "Davao Del Sur"
2. Navigate to Analytics page
3. Verify all metrics show only "Davao Del Sur" data
4. Check that agent rankings only show agents from "Davao Del Sur"
5. Verify commissions only show for "Davao Del Sur" agents

### Test as Superadmin
1. Login as superadmin
2. Navigate to Analytics page
3. Verify all metrics show data from all branches
4. Test branch filter (if implemented in frontend)
5. Verify switching branches updates all analytics

## Frontend Impact

### Current State
- Frontend analytics page automatically respects backend filtering
- No frontend changes required for basic functionality
- All API calls will return branch-filtered data

### Future Enhancement (Optional)
Add branch selector dropdown for superadmins:
```typescript
// In analytics page
const [selectedBranch, setSelectedBranch] = useState<string>('all');

// Modify API calls
const data = await analyticsApi.subscribersMonthly(
  selectedBranch !== 'all' ? { branch_id: selectedBranch } : undefined
);
```

## Benefits

### 1. Data Isolation
- Admins only see their branch data
- Prevents accidental data leakage
- Maintains branch-based security

### 2. Accurate Metrics
- Analytics reflect actual branch performance
- No confusion from mixed branch data
- Clear branch-specific insights

### 3. Scalability
- Supports multi-branch operations
- Easy to add new branches
- Consistent filtering across all endpoints

### 4. Compliance
- Enforces data access policies
- Audit trail for branch access
- Role-based analytics access

## Performance Considerations

### Database Indexes
Ensure indexes exist on:
- `applications.branch_id`
- `commissions.branch_id`
- `agents.branch_id`

### Query Optimization
- Branch filtering happens at database level
- No additional application-level filtering needed
- Efficient use of RLS policies

## Related Files

### Backend
- `backend/src/routes/analytics.routes.ts` - All analytics endpoints
- `backend/src/middleware/branchFilter.ts` - Branch filtering helpers
- `backend/src/middleware/auth.ts` - Auth middleware with branch_id

### Database
- `backend/src/migrations/019_add_branches.sql` - Branch tables
- `backend/src/migrations/021_update_rls_for_branches.sql` - RLS policies

### Documentation
- `BRANCH_ARCHITECTURE.md` - Overall branch architecture
- `BRANCH_ASSIGNMENT_IMPLEMENTATION.md` - Branch assignment details
- `BRANCH_IMPLEMENTATION_COMPLETE.md` - Complete implementation summary

## Troubleshooting

### Issue: Analytics showing no data
**Solution**: 
- Verify user has `branch_id` assigned
- Check that data exists for that branch
- Ensure migrations are applied

### Issue: Superadmin sees only one branch
**Solution**:
- Verify user role is 'superadmin'
- Check auth middleware is setting role correctly
- Ensure no hardcoded branch filter in frontend

### Issue: Analytics showing wrong branch data
**Solution**:
- Clear analytics cache (if implemented)
- Verify `branch_id` in user session
- Check RLS policies are applied correctly

## Migration Notes

### Existing Data
- All existing applications/commissions should have `branch_id`
- Run migration 020 to assign default branch
- Verify no NULL `branch_id` values

### Cache Invalidation
If analytics caching is implemented:
- Clear cache after branch assignment changes
- Consider branch-specific cache keys
- Set appropriate TTL for branch-filtered data

## Future Enhancements

### 1. Branch Comparison
Add endpoint to compare metrics across branches:
```typescript
GET /api/analytics/branch-comparison
→ Returns: Side-by-side branch metrics
```

### 2. Branch Dashboard
Dedicated dashboard for branch managers:
- Branch-specific KPIs
- Team performance metrics
- Branch health indicators

### 3. Cross-Branch Reports
For superadmins:
- Consolidated reports across all branches
- Branch performance rankings
- Resource allocation insights

### 4. Branch Trends
Historical branch performance:
- Growth trends per branch
- Seasonal patterns
- Comparative analysis

## Conclusion

All analytics endpoints now properly respect branch-based access control. Admins see only their branch data, while superadmins have full visibility with optional filtering. This ensures data isolation, accurate metrics, and scalable multi-branch operations.
