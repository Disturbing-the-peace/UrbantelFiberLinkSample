# ============================================================================
# Cleanup Script Runner - PowerShell
# ============================================================================
# Purpose: Execute the cleanup SQL script to remove all seed/sample data
# Usage: .\run-cleanup.ps1
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UrbanConnect ISP - Data Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
$envFile = Join-Path $PSScriptRoot "../../.env"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "Warning: .env file not found at $envFile" -ForegroundColor Red
    Write-Host "Please ensure your .env file exists with SUPABASE_DB_URL" -ForegroundColor Red
    exit 1
}

# Get database URL
$dbUrl = $env:SUPABASE_DB_URL
if (-not $dbUrl) {
    Write-Host "Error: SUPABASE_DB_URL not found in environment variables" -ForegroundColor Red
    Write-Host "Please set SUPABASE_DB_URL in your .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Database URL found" -ForegroundColor Green
Write-Host ""

# Confirm before proceeding
Write-Host "WARNING: This will DELETE all seed/sample data!" -ForegroundColor Red
Write-Host "The following will be DELETED:" -ForegroundColor Yellow
Write-Host "  - All agents" -ForegroundColor Yellow
Write-Host "  - All applications" -ForegroundColor Yellow
Write-Host "  - All subscribers" -ForegroundColor Yellow
Write-Host "  - All commissions" -ForegroundColor Yellow
Write-Host "  - All audit logs" -ForegroundColor Yellow
Write-Host "  - All purge logs" -ForegroundColor Yellow
Write-Host ""
Write-Host "The following will be KEPT:" -ForegroundColor Green
Write-Host "  - Plans (production data)" -ForegroundColor Green
Write-Host "  - Admin users (system access)" -ForegroundColor Green
Write-Host "  - Database structure (tables, policies, functions)" -ForegroundColor Green
Write-Host ""

$confirmation = Read-Host "Are you sure you want to proceed? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting cleanup..." -ForegroundColor Cyan

# Path to cleanup SQL file
$cleanupFile = Join-Path $PSScriptRoot "CLEANUP_seed_data.sql"

if (-not (Test-Path $cleanupFile)) {
    Write-Host "Error: Cleanup SQL file not found at $cleanupFile" -ForegroundColor Red
    exit 1
}

# Execute the cleanup script
Write-Host "Executing cleanup script..." -ForegroundColor Yellow
try {
    # Use psql to execute the SQL file
    $env:PGPASSWORD = ""  # Password is in the connection string
    psql $dbUrl -f $cleanupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Cleanup completed successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your database is now ready for pilot testing." -ForegroundColor Green
        Write-Host "All seed/sample data has been removed." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Error: Cleanup script failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error executing cleanup script: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify the cleanup in Supabase dashboard" -ForegroundColor White
Write-Host "2. Create your first real agent for pilot testing" -ForegroundColor White
Write-Host "3. Test the application flow with real data" -ForegroundColor White
Write-Host ""
