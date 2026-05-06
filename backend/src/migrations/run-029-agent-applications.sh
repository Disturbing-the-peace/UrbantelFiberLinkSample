#!/bin/bash

# Run migration 029 - Agent Applications
# This script runs the agent applications migration

set -e  # Exit on error

echo "=========================================="
echo "Running Migration 029: Agent Applications"
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

echo "Running migration: 029_add_agent_applications.sql"
psql "$SUPABASE_DB_URL" -f "$SCRIPT_DIR/029_add_agent_applications.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ Migration completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Create storage bucket 'agent-application-documents' in Supabase Dashboard"
    echo "   - Go to Storage > Create bucket"
    echo "   - Name: agent-application-documents"
    echo "   - Public: false"
    echo "   - File size limit: 50MB"
    echo ""
    echo "2. The agent applications feature is now ready to use!"
    echo "   - Public form: /apply-agent?ref=AGENT_ID"
    echo "   - Admin page: /dashboard/agent-applications"
    echo ""
else
    echo ""
    echo "✗ Migration failed"
    exit 1
fi
