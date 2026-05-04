# PowerShell script to add system_administrator role and assign it to a user
# Usage: .\run-system-admin-migration.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "System Administrator Role Migration" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
$envFile = "..\.env"
if (-not (Test-Path $envFile)) {
    $envFile = "..\..\.env"
}

if (-not (Test-Path $envFile)) {
    Write-Host "Error: .env file not found" -ForegroundColor Red
    exit 1
}

# Parse .env file
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env" -ForegroundColor Red
    exit 1
}

# Extract database connection details from Supabase URL
if ($SUPABASE_URL -match 'https://([^.]+)\.supabase\.co') {
    $projectRef = $matches[1]
    $DB_HOST = "db.$projectRef.supabase.co"
} else {
    Write-Host "Error: Invalid SUPABASE_URL format" -ForegroundColor Red
    exit 1
}

$DB_NAME = "postgres"
$DB_USER = "postgres"

Write-Host "Connecting to Supabase database..."
Write-Host "Host: $DB_HOST"
Write-Host ""

# Prompt for database password
$DB_PASSWORD = Read-Host "Please enter your Supabase database password" -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
)

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD_PLAIN

Write-Host ""
Write-Host "Step 1: Adding system_administrator role..." -ForegroundColor Yellow

try {
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "026_add_system_administrator_role.sql"
    Write-Host "✓ System administrator role added successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to add system administrator role" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Assigning system_administrator role to user..." -ForegroundColor Yellow

try {
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "027_assign_system_administrator.sql"
    Write-Host "✓ System administrator role assigned successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to assign system administrator role" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Migration completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "User eealforte0924@proton.me now has system_administrator role" -ForegroundColor Green
Write-Host "This user can access all branches without being a member" -ForegroundColor Green
Write-Host ""
