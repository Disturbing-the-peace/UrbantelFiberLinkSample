#!/bin/bash

# ============================================================================
# Cleanup Script Runner - Bash
# ============================================================================
# Purpose: Execute the cleanup SQL script to remove all seed/sample data
# Usage: ./run-cleanup.sh
# ============================================================================

echo "========================================"
echo "UrbanConnect ISP - Data Cleanup Script"
echo "========================================"
echo ""

# Load environment variables from .env file
ENV_FILE="$(dirname "$0")/../../.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from .env..."
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "Warning: .env file not found at $ENV_FILE"
    echo "Please ensure your .env file exists with SUPABASE_DB_URL"
    exit 1
fi

# Get database URL
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "Error: SUPABASE_DB_URL not found in environment variables"
    echo "Please set SUPABASE_DB_URL in your .env file"
    exit 1
fi

echo "Database URL found"
echo ""

# Confirm before proceeding
echo -e "\033[0;31mWARNING: This will DELETE all seed/sample data!\033[0m"
echo -e "\033[0;33mThe following will be DELETED:\033[0m"
echo "  - All agents"
echo "  - All applications"
echo "  - All subscribers"
echo "  - All commissions"
echo "  - All audit logs"
echo "  - All purge logs"
echo ""
echo -e "\033[0;32mThe following will be KEPT:\033[0m"
echo "  - Plans (production data)"
echo "  - Admin users (system access)"
echo "  - Database structure (tables, policies, functions)"
echo ""

read -p "Are you sure you want to proceed? (yes/no): " confirmation
if [ "$confirmation" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."

# Path to cleanup SQL file
CLEANUP_FILE="$(dirname "$0")/CLEANUP_seed_data.sql"

if [ ! -f "$CLEANUP_FILE" ]; then
    echo "Error: Cleanup SQL file not found at $CLEANUP_FILE"
    exit 1
fi

# Execute the cleanup script
echo "Executing cleanup script..."
psql "$SUPABASE_DB_URL" -f "$CLEANUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Cleanup completed successfully!"
    echo "========================================"
    echo ""
    echo "Your database is now ready for pilot testing."
    echo "All seed/sample data has been removed."
else
    echo ""
    echo "Error: Cleanup script failed"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Verify the cleanup in Supabase dashboard"
echo "2. Create your first real agent for pilot testing"
echo "3. Test the application flow with real data"
echo ""
