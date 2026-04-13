# Database Migrations

This directory contains SQL migration files for the UrbanConnect ISP System database schema.

## Migration Files

1. **001_initial_schema.sql** - Creates all core tables with proper relationships and indexes
2. **002_rls_policies.sql** - Sets up Row Level Security policies for role-based access control
3. **003_seed_data.sql** - Inserts sample data for development and testing
4. **004_storage_setup.sql** - Storage bucket policies for customer document uploads

## Additional Documentation

- **STORAGE_SETUP_GUIDE.md** - Comprehensive guide for configuring Supabase Storage buckets (see Task 2.2)

## Running Migrations in Supabase

### Option 1: Supabase Dashboard (Recommended for Development)

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of each migration file in order
5. Click **Run** to execute each migration

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Initialize Supabase in your project (if not done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Direct PostgreSQL Connection

If you have direct database access:

```bash
psql -h your-db-host -U postgres -d postgres -f backend/src/migrations/001_initial_schema.sql
psql -h your-db-host -U postgres -d postgres -f backend/src/migrations/002_rls_policies.sql
psql -h your-db-host -U postgres -d postgres -f backend/src/migrations/003_seed_data.sql
```

## Database Schema Overview

### Tables

- **users** - Internal staff accounts (superadmin, admin roles)
- **agents** - Sales agents with unique referral codes
- **plans** - Internet service plans (Residential, Business categories)
- **applications** - Customer applications with workflow tracking
- **commissions** - Agent commission tracking (60% of plan price)
- **audit_log** - Audit trail for data purge operations

### Key Features

- UUID primary keys for all tables
- Automatic `updated_at` timestamp triggers
- Foreign key constraints with RESTRICT on delete
- Comprehensive indexes for query performance
- Row Level Security (RLS) policies for role-based access
- Data privacy compliance fields (data_purged, data_purged_at)

### Relationships

```
agents (1) ----< (many) applications
plans (1) ----< (many) applications
applications (1) ----< (many) commissions
agents (1) ----< (many) commissions
```

## Storage Buckets

After running database migrations, you need to configure Supabase Storage for customer document uploads.

**📖 See [STORAGE_SETUP_GUIDE.md](./STORAGE_SETUP_GUIDE.md) for complete setup instructions.**

### Quick Overview

The system requires a `customer-documents` bucket with:
- **Purpose:** Store customer uploaded documents (house photos, IDs, selfies, signatures)
- **Configuration:** 5MB file size limit, image/jpeg, image/png, image/webp only
- **Access:** Private bucket with role-based policies
- **Policies:** Public upload, staff read/update, system delete

Run migration **004_storage_setup.sql** after creating the bucket to apply storage policies.

## Initial Setup

### 1. Create Superadmin Account

After running migrations, create your first superadmin account:

1. Go to **Authentication** > **Users** in Supabase dashboard
2. Click **Add User**
3. Enter email and password
4. After user is created, note the user ID
5. Run this SQL in the SQL Editor:

```sql
INSERT INTO users (id, email, role, full_name)
VALUES (
  'user-id-from-auth',
  'admin@urbanconnect.com',
  'superadmin',
  'System Administrator'
);
```

### 2. Enable 2FA (Two-Factor Authentication)

For production, enable 2FA in Supabase:

1. Go to **Authentication** > **Settings**
2. Enable **Multi-Factor Authentication**
3. Configure TOTP (Time-based One-Time Password)

## Verification

After running all migrations, verify the setup:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check sample data
SELECT COUNT(*) as plan_count FROM plans;
SELECT COUNT(*) as agent_count FROM agents;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Expected results:
- 6 tables created (users, agents, plans, applications, commissions, audit_log)
- 7 plans inserted
- 3 agents inserted
- RLS enabled on all tables

## Rollback

If you need to rollback the migrations:

```sql
-- Drop all tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

## Notes

- Always backup your database before running migrations in production
- Test migrations in a development environment first
- The seed data (003_seed_data.sql) is optional for production
- User passwords are managed by Supabase Auth, not stored in the users table
- The users table only stores role and profile information
