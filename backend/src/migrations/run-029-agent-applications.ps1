# Run migration 029 - Agent Applications
# This script runs the agent applications migration

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Running Migration 029: Agent Applications" -ForegroundColor Cyan
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

Write-Host "Database URL: $($env:SUPABASE_DB_URL.Substring(0, [Math]::Min(30, $env:SUPABASE_DB_URL.Length)))..."
Write-Host ""

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Running migration: 029_add_agent_applications.sql"
psql $env:SUPABASE_DB_URL -f "$ScriptDir\029_add_agent_applications.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✓ Migration completed successfully!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Create storage bucket 'agent-application-documents' in Supabase Dashboard"
    Write-Host "   - Go to Storage > Create bucket"
    Write-Host "   - Name: agent-application-documents"
    Write-Host "   - Public: false"
    Write-Host "   - File size limit: 50MB"
    Write-Host ""
    Write-Host "2. The agent applications feature is now ready to use!"
    Write-Host "   - Public form: /apply-agent?ref=AGENT_ID"
    Write-Host "   - Admin page: /dashboard/agent-applications"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ Migration failed" -ForegroundColor Red
    exit 1
}
