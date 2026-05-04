#!/bin/bash

# Script to run multi-branch support migration
# This adds support for users (admins) to manage multiple branches

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

echo "Running multi-branch support migration..."
echo "Supabase URL: $SUPABASE_URL"

# Run the migration
psql "$DATABASE_URL" -f 024_add_multi_branch_support.sql

if [ $? -eq 0 ]; then
  echo "✅ Multi-branch support migration completed successfully!"
else
  echo "❌ Migration failed. Please check the error messages above."
  exit 1
fi

