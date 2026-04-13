# UrbanConnect ISP System - Migration Runner Script (PowerShell)
# This script helps run migrations in the correct order

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "UrbanConnect ISP System - Database Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SUPABASE_DB_URL is set
if (-not $env:SUPABASE_DB_URL) {
    Write-Host "Error: SUPABASE_DB_URL environment variable is not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set it using:"
    Write-Host '  $env:SUPABASE_DB_URL = "postgresql://postgres:[password]@[host]:[port]/postgres"'
    Write-Host ""
    Write-Host "You can find your database URL in:"
    Write-Host "  Supabase Dashboard > Project Settings > Database > Connection string"
    exit 1
}

$dbUrlPreview = $env:SUPABASE_DB_URL.Substring(0, [Math]::Min(30, $env:SUPABASE_DB_URL.Length))
Write-Host "Database URL: $dbUrlPreview..." -ForegroundColor Gray
Write-Host ""

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Function to run a migration
function Run-Migration {
    param (
        [string]$File
    )
    
    Write-Host "Running migration: $File" -ForegroundColor Yellow
    
    $FilePath = Join-Path $ScriptDir $File
    
    try {
        # Check if psql is available
        $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
        
        if (-not $psqlPath) {
            Write-Host "Error: psql command not found" -ForegroundColor Red
            Write-Host "Please install PostgreSQL client tools" -ForegroundColor Red
            Write-Host ""
            Write-Host "Alternative: Run migrations manually in Supabase Dashboard SQL Editor" -ForegroundColor Yellow
            exit 1
        }
        
        # Run the migration
        psql $env:SUPABASE_DB_URL -f $FilePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $File completed successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ $File failed" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "✗ $File failed: $_" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
}

# Run migrations in order
Write-Host "Starting migrations..." -ForegroundColor Cyan
Write-Host ""

Run-Migration "001_initial_schema.sql"
Run-Migration "002_rls_policies.sql"

# Ask if user wants to run seed data
Write-Host "Do you want to run seed data (sample plans and agents)? [y/N]" -ForegroundColor Yellow
$response = Read-Host

if ($response -match "^[yY]") {
    Run-Migration "003_seed_data.sql"
} else {
    Write-Host "Skipping seed data" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "✓ All migrations completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create storage bucket 'customer-documents' in Supabase Dashboard"
Write-Host "2. Apply storage policies (see README.md)"
Write-Host "3. Create your first superadmin account"
Write-Host "4. Enable 2FA in Authentication settings"
Write-Host ""
Write-Host "For more information, see:" -ForegroundColor Cyan
Write-Host "  - README.md (detailed setup guide)"
Write-Host "  - SCHEMA_DIAGRAM.md (database structure)"
Write-Host "  - QUICK_REFERENCE.md (common queries)"
Write-Host ""
