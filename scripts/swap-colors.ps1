# PowerShell script to swap teal (#00A191) and purple (#4B328D) colors
# This makes teal the primary color and purple the accent

Write-Host "Swapping color scheme: Teal becomes primary, Purple becomes accent..." -ForegroundColor Cyan

$tempColor = "#TEMP999"

# Get all TypeScript/TSX files
$files = Get-ChildItem -Path "frontend/src" -Include *.tsx,*.ts -Recurse -File | Where-Object { $_.FullName -notlike "*node_modules*" }

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Gray
    
    $content = Get-Content $file.FullName -Raw
    
    # Step 1: Replace purple with temp
    $content = $content -replace '#4B328D', $tempColor
    $content = $content -replace 'bg-\[#4B328D\]', "bg-[$tempColor]"
    $content = $content -replace 'text-\[#4B328D\]', "text-[$tempColor]"
    $content = $content -replace 'border-\[#4B328D\]', "border-[$tempColor]"
    $content = $content -replace '#3a2570', '#TEMPHOVER1'
    
    # Step 2: Replace teal with purple  
    $content = $content -replace '#00A191', '#4B328D'
    $content = $content -replace 'bg-\[#00A191\]', 'bg-[#4B328D]'
    $content = $content -replace 'text-\[#00A191\]', 'text-[#4B328D]'
    $content = $content -replace 'border-\[#00A191\]', 'border-[#4B328D]'
    $content = $content -replace '#008c7d', '#3a2570'
    
    # Step 3: Replace temp with teal
    $content = $content -replace $tempColor, '#00A191'
    $content = $content -replace "bg-\[$tempColor\]", 'bg-[#00A191]'
    $content = $content -replace "text-\[$tempColor\]", 'text-[#00A191]'
    $content = $content -replace "border-\[$tempColor\]", 'border-[#00A191]'
    $content = $content -replace '#TEMPHOVER1', '#008c7d'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "`nColor swap complete!" -ForegroundColor Green
Write-Host "Teal (#00A191) is now the primary color" -ForegroundColor Cyan
Write-Host "Purple (#4B328D) is now the accent color" -ForegroundColor Magenta
