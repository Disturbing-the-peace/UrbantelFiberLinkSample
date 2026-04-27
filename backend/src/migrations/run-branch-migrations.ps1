# Branch Access Control Migration Runner (PowerShell)
# This script runs all branch-related migrations in the correct order

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Branch Access Control Migration Runner" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (-not (Test-Path "../../.env")) {
    Write-Host "Error: .env file not found" -ForegroundColor Red
    Write-Host "Please create a .env file with your database connection string"
    exit 1
}

# Load environment variables from .env
Get-Content "../../.env" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        Set-Item -Path "env:$name" -Value $value
    }
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL not set in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Database URL: $env:DATABASE_URL" -ForegroundColor Yellow
Write-Host ""

# Function to run a migration
function Run-Migration {
    param (
        [string]$MigrationFile
    )
    
    $migrationName = Split-Path $MigrationFile -Leaf
    
    Write-Host "Running migration: $migrationName" -ForegroundColor Yellow
    
    try {
        psql $env:DATABASE_URL -f $MigrationFile
        Write-Host "✓ $migrationName completed successfully" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "✗ $migrationName failed" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

# Confirm before proceeding
Write-Host "This will run the following migrations:" -ForegroundColor Yellow
Write-Host "  1. 019_add_branches.sql - Create branches table and add branch_id columns"
Write-Host "  2. 020_assign_default_branch.sql - Assign existing data to Davao Del Sur"
Write-Host "  3. 021_update_rls_for_branches.sql - Update RLS policies for branch filtering"
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Migration cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting migrations..." -ForegroundColor Green
Write-Host ""

# Run migrations in order
Run-Migration "019_add_branches.sql"
Run-Migration "020_assign_default_branch.sql"
Run-Migration "021_update_rls_for_branches.sql"

Write-Host "========================================" -ForegroundColor Green
Write-Host "All migrations completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Run verification queries
Write-Host "Running verification queries..." -ForegroundColor Yellow
Write-Host ""

$verificationQuery = @"
-- Verify branches
SELECT 'Branches created:' as info;
SELECT id, name, is_active FROM branches ORDER BY name;

-- Verify branch assignments
SELECT 'Branch assignments:' as info;
SELECT 
  'users' as table_name, 
  COUNT(*) as total, 
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch
FROM users
UNION ALL
SELECT 'agents', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM agents
UNION ALL
SELECT 'applications', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM applications
UNION ALL
SELECT 'commissions', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM commissions
UNION ALL
SELECT 'plans', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM plans
UNION ALL
SELECT 'events', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM events;
"@

psql $env:DATABASE_URL -c $verificationQuery

Write-Host ""
Write-Host "Verification complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review the verification output above"
Write-Host "  2. Update your backend code to use branch filtering"
Write-Host "  3. Update your frontend to include branch selection"
Write-Host "  4. Test with both admin and superadmin users"
Write-Host ""
Write-Host "See BRANCH_ACCESS_CONTROL_IMPLEMENTATION.md for details" -ForegroundColor Green
