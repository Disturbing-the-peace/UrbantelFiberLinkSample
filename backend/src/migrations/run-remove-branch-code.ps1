# PowerShell script to remove branch code column
# This removes the redundant code field from branches table

# Load environment variables from .env file
$envFile = "../.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

# Check if required environment variables are set
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set" -ForegroundColor Red
    Write-Host "Please set them in your .env file or as environment variables"
    exit 1
}

Write-Host "Removing branch code column..." -ForegroundColor Cyan
Write-Host "Supabase URL: $env:SUPABASE_URL"

# Run the migration using psql
$migrationFile = "025_remove_branch_code.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file $migrationFile not found" -ForegroundColor Red
    exit 1
}

# Execute migration
try {
    psql $env:DATABASE_URL -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Branch code column removed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed. Please check the error messages above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}
