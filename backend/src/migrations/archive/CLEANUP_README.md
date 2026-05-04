# Data Cleanup Script - Pilot Testing Preparation

## Overview
This cleanup script removes all seed/sample data from your database to prepare for pilot testing with real data.

## What Gets Deleted ❌
- **All Agents** - Sample agents created during development
- **All Applications** - Test applications
- **All Subscribers** - Test subscribers
- **All Commissions** - Test commission records
- **All Audit Logs** - Historical audit entries
- **All Purge Logs** - Data purge history

## What Gets Kept ✅
- **Plans** - Your service plans (production data)
- **Admin Users** - System administrators
- **Database Structure** - Tables, RLS policies, functions, triggers
- **Storage Buckets** - File storage structure

## Usage

### Option 1: Using PowerShell (Windows)
```powershell
cd backend/src/migrations
.\run-cleanup.ps1
```

### Option 2: Using Bash (Linux/Mac)
```bash
cd backend/src/migrations
chmod +x run-cleanup.sh
./run-cleanup.sh
```

### Option 3: Manual Execution (Supabase Dashboard)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `CLEANUP_seed_data.sql`
4. Execute the script

## Prerequisites
- PostgreSQL client (`psql`) installed
- `SUPABASE_DB_URL` set in your `.env` file
- Database connection access

## Safety Features
- ✅ **Transaction-wrapped** - All deletions in a single transaction
- ✅ **Confirmation prompt** - Requires explicit "yes" to proceed
- ✅ **Verification output** - Shows data counts after cleanup
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Rollback capable** - Can be rolled back if needed

## After Cleanup

### Verify the Cleanup
1. Check Supabase Dashboard → Table Editor
2. Verify these tables are empty:
   - `agents`
   - `applications`
   - `subscribers`
   - `commissions`
   - `audit_log`
   - `purge_logs`

3. Verify these tables still have data:
   - `plans` (should have ~20+ plans)
   - `users` (should have your admin user)

### Next Steps for Pilot Testing
1. **Create Real Agents**
   - Go to Dashboard → Agents
   - Add your first real agent with actual contact info
   - Note their referral code

2. **Test Application Flow**
   - Use the agent's referral link
   - Submit a test application
   - Process it through the workflow

3. **Monitor System**
   - Check Analytics dashboard
   - Verify notifications work
   - Test commission calculations

## Troubleshooting

### Error: "SUPABASE_DB_URL not found"
**Solution:** Ensure your `.env` file exists in `backend/` directory with:
```env
SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:[port]/postgres
```

### Error: "psql: command not found"
**Solution:** Install PostgreSQL client:
- **Windows:** Download from postgresql.org
- **Mac:** `brew install postgresql`
- **Linux:** `sudo apt-get install postgresql-client`

### Error: "Permission denied"
**Solution (Linux/Mac):** Make script executable:
```bash
chmod +x run-cleanup.sh
```

### Want to Keep Some Test Data?
Edit `CLEANUP_seed_data.sql` and comment out specific DELETE statements:
```sql
-- DELETE FROM agents;  -- Comment this to keep agents
```

## Rollback (If Needed)
If you need to restore seed data after cleanup:
1. Re-run the seed data migrations:
   - `003_seed_data_urbanconnect.sql`
   - `007_seed_sample_data.sql`

## Important Notes
⚠️ **This action cannot be undone** (unless you have a backup)
⚠️ **Run this only when ready for pilot testing**
⚠️ **Backup your database first** if you want to preserve test data

## Support
If you encounter issues:
1. Check the error message in the console
2. Verify database connection
3. Check Supabase logs
4. Review the SQL script for any custom modifications needed
