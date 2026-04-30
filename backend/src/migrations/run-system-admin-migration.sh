#!/bin/bash

# Script to add system_administrator role and assign it to a user
# Usage: ./run-system-admin-migration.sh

set -e  # Exit on error

echo "=========================================="
echo "System Administrator Role Migration"
echo "=========================================="
echo ""

# Load environment variables
if [ -f "../../.env" ]; then
    export $(cat ../../.env | grep -v '^#' | xargs)
elif [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
    exit 1
fi

# Extract database connection details from Supabase URL
DB_HOST=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co.*|\1.supabase.co|')
DB_NAME="postgres"
DB_USER="postgres"

echo "Connecting to Supabase database..."
echo "Host: $DB_HOST"
echo ""

# Prompt for database password
echo "Please enter your Supabase database password:"
read -s DB_PASSWORD
echo ""

# Set PGPASSWORD for psql
export PGPASSWORD=$DB_PASSWORD

echo "Step 1: Adding system_administrator role..."
psql -h "db.$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f 026_add_system_administrator_role.sql

if [ $? -eq 0 ]; then
    echo "✓ System administrator role added successfully"
else
    echo "✗ Failed to add system administrator role"
    exit 1
fi

echo ""
echo "Step 2: Assigning system_administrator role to user..."
psql -h "db.$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f 027_assign_system_administrator.sql

if [ $? -eq 0 ]; then
    echo "✓ System administrator role assigned successfully"
else
    echo "✗ Failed to assign system administrator role"
    exit 1
fi

echo ""
echo "=========================================="
echo "Migration completed successfully!"
echo "=========================================="
echo ""
echo "User eealforte0924@proton.me now has system_administrator role"
echo "This user can access all branches without being a member"
echo ""
