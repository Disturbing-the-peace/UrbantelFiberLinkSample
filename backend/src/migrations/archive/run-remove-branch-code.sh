#!/bin/bash

# Script to remove branch code column
# This removes the redundant code field from branches table

# Load environment variables
if [ -f ../.env ]; then
  export $(cat ../.env | grep -v '^#' | xargs)
fi

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
  echo "Please set them in your .env file or as environment variables"
  exit 1
fi

echo "Removing branch code column..."
echo "Supabase URL: $SUPABASE_URL"

# Run the migration
psql "$DATABASE_URL" -f 025_remove_branch_code.sql

if [ $? -eq 0 ]; then
  echo "✅ Branch code column removed successfully!"
else
  echo "❌ Migration failed. Please check the error messages above."
  exit 1
fi
