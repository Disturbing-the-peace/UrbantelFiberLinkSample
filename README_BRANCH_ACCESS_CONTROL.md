# Branch-Based Access Control Implementation

## 📋 Overview

This implementation adds comprehensive branch-based access control to the ISP application. Every feature is now scoped to a branch, enabling multi-location management with proper data isolation.

### Default Branches
- **Davao Del Sur** (default for all existing data)
- **Davao de Oro**
- **Davao Oriental**

### Key Features
✅ Complete data isolation between branches  
✅ Role-based access (Superadmin vs Admin)  
✅ Database-level security (RLS policies)  
✅ Backward compatible with existing data  
✅ Fully reversible  
✅ Zero data loss  

## 🚀 Quick Start

### 1. Run Migrations (5 minutes)

**Windows:**
```powershell
cd backend/src/migrations
.\run-branch-migrations.ps1
```

**Linux/Mac:**
```bash
cd backend/src/migrations
chmod +x run-branch-migrations.sh
./run-branch-migrations.sh
```

### 2. Restart Backend (1 minute)

```bash
cd backend
npm install
npm run build
npm start
```

### 3. Update Frontend (30-60 minutes)

See `frontend/BRANCH_UI_IMPLEMENTATION.md` for detailed steps.

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](QUICK_START_BRANCH_ACCESS.md)** - Get up and running in 10 minutes
- **[Implementation Checklist](IMPLEMENTATION_CHECKLIST.md)** - Track your progress

### Architecture & Design
- **[Architecture Diagram](BRANCH_ARCHITECTURE.md)** - Visual system overview
- **[Implementation Summary](BRANCH_ACCESS_CONTROL_SUMMARY.md)** - Complete feature list

### Implementation Guides
- **[Backend Guide](backend/BRANCH_ACCESS_CONTROL_IMPLEMENTATION.md)** - Backend changes and API
- **[Frontend Guide](frontend/BRANCH_UI_IMPLEMENTATION.md)** - UI components and integration

## 🎯 What Changed?

### Database
- ✅ New `branches` table with 3 default branches
- ✅ `branch_id` column added to all relevant tables
- ✅ All existing data assigned to "Davao Del Sur"
- ✅ RLS policies updated for branch filtering

### Backend
- ✅ New `/api/branches` endpoints
- ✅ All routes now filter by branch
- ✅ Branch filtering helper middleware
- ✅ Updated TypeScript types

### Frontend (To Do)
- 🔄 Branch context and provider
- 🔄 Branch switcher component (superadmin only)
- 🔄 Updated forms with branch selection
- 🔄 Updated tables with branch column
- 🔄 Updated API calls with branch parameter

## 👥 User Roles

### Superadmin
- ✅ View data from ALL branches
- ✅ Switch between branches
- ✅ Select "All Branches" view
- ✅ Create/manage branches
- ✅ Assign users/agents to any branch

### Admin
- ✅ View ONLY their assigned branch
- ✅ No branch switcher (automatic filtering)
- ✅ Cannot access other branches
- ✅ Cannot change branch assignments

## 🔒 Security

### Three Layers of Security

1. **Frontend Validation** (Not Trusted)
   - UI restrictions
   - Form validation
   - Can be bypassed

2. **Backend Validation** (Trusted)
   - Role checking
   - Branch filtering
   - Request validation

3. **Database RLS** (Most Trusted)
   - Row-level security
   - Cannot be bypassed
   - Enforced on every query

## 📊 API Changes

### New Endpoints
```
GET    /api/branches           - List branches
POST   /api/branches           - Create branch (superadmin)
PUT    /api/branches/:id       - Update branch (superadmin)
DELETE /api/branches/:id       - Deactivate branch (superadmin)
```

### Updated Endpoints
All endpoints now support `?branch_id=<uuid>` for superadmins:
```
/api/agents?branch_id=<uuid>
/api/applications?branch_id=<uuid>
/api/commissions?branch_id=<uuid>
/api/subscribers?branch_id=<uuid>
/api/analytics/*?branch_id=<uuid>
```

### Request Body Changes
Creating records now requires `branch_id`:
```json
POST /api/agents
{
  "name": "Agent Name",
  "branch_id": "uuid-here"  // REQUIRED
}

POST /api/users
{
  "email": "admin@example.com",
  "full_name": "Admin User",
  "role": "admin",
  "password": "password123",
  "branch_id": "uuid-here"  // REQUIRED
}
```

## 🧪 Testing

### Backend Testing
```bash
# Test branches endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/branches

# Test branch filtering (admin)
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:5000/api/agents

# Test branch filtering (superadmin)
curl -H "Authorization: Bearer <superadmin_token>" \
  "http://localhost:5000/api/agents?branch_id=<uuid>"
```

### Database Verification
```sql
-- Check branches
SELECT * FROM branches ORDER BY name;

-- Check branch assignments
SELECT 
  'users' as table_name, 
  COUNT(*) as total, 
  COUNT(branch_id) as with_branch
FROM users
UNION ALL
SELECT 'agents', COUNT(*), COUNT(branch_id) FROM agents
UNION ALL
SELECT 'applications', COUNT(*), COUNT(branch_id) FROM applications;
```

## 🔄 Rollback

If you need to undo the changes:

```sql
-- See BRANCH_ACCESS_CONTROL_SUMMARY.md for complete rollback SQL
-- Backup your database first!

-- 1. Drop new RLS policies
-- 2. Restore old RLS policies
-- 3. Remove NOT NULL constraints
-- 4. Drop branch_id columns
-- 5. Drop branches table
```

## 📈 Performance

- ✅ All `branch_id` columns are indexed
- ✅ Minimal query overhead
- ✅ RLS policies are optimized
- ✅ No N+1 query issues

## 🐛 Troubleshooting

### Migration Fails
- Check DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify you have CREATE TABLE permissions

### Backend Errors
- Run `npm install`
- Check `npm run build` for TypeScript errors
- Verify migrations completed successfully

### Data Not Filtering
- Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'agents';`
- Verify user has branch_id: `SELECT id, email, branch_id FROM users;`
- Check API authentication

### Frontend Issues
- Ensure backend is running
- Check API responses include `branch_id`
- Verify authentication token is valid

## 📞 Support

### Documentation
- [Quick Start](QUICK_START_BRANCH_ACCESS.md)
- [Backend Guide](backend/BRANCH_ACCESS_CONTROL_IMPLEMENTATION.md)
- [Frontend Guide](frontend/BRANCH_UI_IMPLEMENTATION.md)
- [Architecture](BRANCH_ARCHITECTURE.md)

### Common Issues
See [Implementation Checklist](IMPLEMENTATION_CHECKLIST.md) for testing scenarios.

## ✅ Success Criteria

- [ ] All existing data assigned to "Davao Del Sur"
- [ ] Three branches created and active
- [ ] Superadmins can view all branches
- [ ] Admins can only view their branch
- [ ] All CRUD operations respect branch filtering
- [ ] RLS policies enforce branch access
- [ ] Analytics respect branch filtering
- [ ] No data leakage between branches
- [ ] Application works as before for existing users

## 🎉 Next Steps

1. ✅ Run database migrations
2. ✅ Deploy backend code
3. 🔄 Implement frontend changes
4. 🔄 Test with both user roles
5. 🔄 Train users
6. 🔄 Deploy to production

## 📝 License

Same as the main application.

## 🤝 Contributing

Follow the implementation guides and checklist when making changes.

---

**Status**: Backend Complete ✅ | Frontend In Progress 🔄

**Last Updated**: 2024

**Version**: 1.0.0
