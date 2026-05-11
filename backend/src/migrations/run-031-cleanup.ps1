# Cleanup Script Runner for Migration 031 (PowerShell)
# Removes duplicate signature files from Supabase Storage

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Migration 031: Cleanup Signature Files" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will DELETE signature files from storage!" -ForegroundColor Yellow
Write-Host "   These are duplicate files (same as government_id files)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor White
Write-Host "  1. SQL migration 031_remove_signature_column.sql has been run" -ForegroundColor White
Write-Host "  2. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Do you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting cleanup..." -ForegroundColor Green
Write-Host ""

# Compile and run TypeScript
Write-Host "📦 Compiling and running TypeScript..." -ForegroundColor Cyan
npx ts-node src/migrations/031_cleanup_signature_files.ts

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
