# Agent Applications Setup Guide

This guide will help you set up the agent applications feature.

## Prerequisites

- PostgreSQL client (`psql`) installed
- Access to your Supabase database
- Database connection string from Supabase Dashboard

## Step 1: Run the Migration

### Option A: Using the migration script (Recommended)

**On Linux/Mac:**
```bash
cd backend/src/migrations

# Set your database URL
export SUPABASE_DB_URL='postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:[PORT]/postgres'

# Run the migration
chmod +x run-029-agent-applications.sh
./run-029-agent-applications.sh
```

**On Windows (PowerShell):**
```powershell
cd backend\src\migrations

# Set your database URL
$env:SUPABASE_DB_URL = "postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:[PORT]/postgres"

# Run the migration
.\run-029-agent-applications.ps1
```

### Option B: Manual SQL execution

1. Go to Supabase Dashboard > SQL Editor
2. Copy the contents of `029_add_agent_applications.sql`
3. Paste and run the SQL

## Step 2: Create Storage Bucket

1. Go to Supabase Dashboard > Storage
2. Click "Create bucket"
3. Configure:
   - **Name:** `agent-application-documents`
   - **Public:** `false` (private bucket)
   - **File size limit:** `50MB`
4. Click "Create bucket"

## Step 3: Verify Setup

### Check if table exists:
```sql
SELECT * FROM agent_applications LIMIT 1;
```

### Check if storage bucket exists:
Go to Storage in Supabase Dashboard and verify `agent-application-documents` bucket is listed.

## Usage

### Public Application Form
- URL: `https://your-domain.com/apply-agent?ref=AGENT_ID`
- Optional `ref` parameter for referrer tracking
- Accepts: Resume (PDF/DOCX), Valid ID, Barangay Clearance (optional), GCash Screenshot

### Admin Dashboard
- URL: `https://your-domain.com/dashboard/agent-applications`
- Features:
  - View all applications
  - Filter by referrer and date
  - Download documents
  - Delete applications

## Troubleshooting

### Error: "Could not find the table 'public.agent_applications'"
- The migration hasn't been run yet
- Run the migration script or execute the SQL manually

### Error: "Failed to upload document"
- Check if storage bucket `agent-application-documents` exists
- Verify bucket is private (not public)
- Check file size limits (max 50MB)

### Error: "Invalid referrer agent ID"
- The agent ID in the URL doesn't exist
- Check if the agent is active in the database

## Database Schema

The migration creates:
- **Table:** `agent_applications`
  - Personal info (name, birthday, contact, email, address)
  - Document URLs (resume, valid ID, barangay clearance, gcash screenshot)
  - Referral tracking (`referred_by_agent_id`)
  - Timestamps (created_at, updated_at)

- **RLS Policies:**
  - Public can submit applications
  - Admins can view/delete applications

## Next Steps

After setup is complete:
1. Test the public form: `/apply-agent`
2. Submit a test application
3. View it in admin dashboard: `/dashboard/agent-applications`
4. Download documents to verify storage works
5. Delete test application

## Support

For issues or questions, check:
- Main README.md
- Migration logs
- Supabase Dashboard > Logs
