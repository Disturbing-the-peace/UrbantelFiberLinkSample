#!/bin/bash

# Script to swap teal (#00A191) and purple (#4B328D) colors throughout the frontend
# This makes teal the primary color and purple the accent

echo "Swapping color scheme: Teal becomes primary, Purple becomes accent..."

# Use a temporary placeholder to avoid conflicts
TEMP_COLOR="#TEMP999"

# Find all TypeScript/TSX files in frontend/src
find frontend/src -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | while IFS= read -r -d '' file; do
  # Skip node_modules
  if [[ $file == *"node_modules"* ]]; then
    continue
  fi
  
  echo "Processing: $file"
  
  # Step 1: Replace purple with temp color
  sed -i 's/#4B328D/'$TEMP_COLOR'/g' "$file"
  sed -i 's/bg-\[#4B328D\]/bg-['$TEMP_COLOR']/g' "$file"
  sed -i 's/text-\[#4B328D\]/text-['$TEMP_COLOR']/g' "$file"
  sed -i 's/border-\[#4B328D\]/border-['$TEMP_COLOR']/g' "$file"
  
  # Step 2: Replace teal with purple
  sed -i 's/#00A191/#4B328D/g' "$file"
  sed -i 's/bg-\[#00A191\]/bg-[#4B328D]/g' "$file"
  sed -i 's/text-\[#00A191\]/text-[#4B328D]/g' "$file"
  sed -i 's/border-\[#00A191\]/border-[#4B328D]/g' "$file"
  sed -i 's/#008c7d/#3a2570/g' "$file"  # hover state
  
  # Step 3: Replace temp with teal
  sed -i 's/'$TEMP_COLOR'/#00A191/g' "$file"
  sed -i 's/bg-\['$TEMP_COLOR'\]/bg-[#00A191]/g' "$file"
  sed -i 's/text-\['$TEMP_COLOR'\]/text-[#00A191]/g' "$file"
  sed -i 's/border-\['$TEMP_COLOR'\]/border-[#00A191]/g' "$file"
done

echo "Color swap complete!"
echo "Teal (#00A191) is now the primary color"
echo "Purple (#4B328D) is now the accent color"
