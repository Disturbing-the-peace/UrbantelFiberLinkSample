#!/bin/bash

# UrbanConnect ISP System - Migration Runner Script
# This script helps run migrations in the correct order

set -e  # Exit on error

echo "=========================================="
echo "UrbanConnect ISP System - Database Setup"
echo "=========================================="
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "Error: SUPABASE_DB_URL environment variable is not set"
    echo ""
    echo "Please set it using:"
    echo "  export SUPABASE_DB_URL='postgresql://postgres:[password]@[host]:[port]/postgres'"
    echo ""
    echo "You can find your database URL in:"
    echo "  Supabase Dashboard > Project Settings > Database > Connection string"
    exit 1
fi

echo "Database URL: ${SUPABASE_DB_URL:0:30}..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to run a migration
run_migration() {
    local file=$1
    echo "Running migration: $file"
    psql "$SUPABASE_DB_URL" -f "$SCRIPT_DIR/$file"
    if [ $? -eq 0 ]; then
        echo "✓ $file completed successfully"
    else
        echo "✗ $file failed"
        exit 1
    fi
    echo ""
}

# Run migrations in order
echo "Starting migrations..."
echo ""

run_migration "001_initial_schema.sql"
run_migration "002_rls_policies.sql"

# Ask if user wants to run seed data
echo "Do you want to run seed data (sample plans and agents)? [y/N]"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    run_migration "003_seed_data.sql"
else
    echo "Skipping seed data"
    echo ""
fi

echo "=========================================="
echo "✓ All migrations completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Create storage bucket 'customer-documents' in Supabase Dashboard"
echo "2. Apply storage policies (see README.md)"
echo "3. Create your first superadmin account"
echo "4. Enable 2FA in Authentication settings"
echo ""
echo "For more information, see:"
echo "  - README.md (detailed setup guide)"
echo "  - SCHEMA_DIAGRAM.md (database structure)"
echo "  - QUICK_REFERENCE.md (common queries)"
echo ""
