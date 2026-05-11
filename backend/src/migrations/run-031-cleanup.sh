#!/bin/bash

# Cleanup Script Runner for Migration 031
# Removes duplicate signature files from Supabase Storage

echo "================================================"
echo "Migration 031: Cleanup Signature Files"
echo "================================================"
echo ""
echo "⚠️  WARNING: This will DELETE signature files from storage!"
echo "   These are duplicate files (same as government_id files)"
echo ""
echo "Prerequisites:"
echo "  1. SQL migration 031_remove_signature_column.sql has been run"
echo "  2. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo ""
echo "🚀 Starting cleanup..."
echo ""

# Compile TypeScript
echo "📦 Compiling TypeScript..."
npx ts-node src/migrations/031_cleanup_signature_files.ts

echo ""
echo "✅ Done!"
