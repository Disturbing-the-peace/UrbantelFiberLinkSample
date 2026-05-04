#!/bin/bash

# Branch Access Control Migration Runner
# This script runs all branch-related migrations in the correct order

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Branch Access Control Migration Runner${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f "../../.env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create a .env file with your database connection string"
    exit 1
fi

# Load environment variables
source ../../.env

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env file${NC}"
    exit 1
fi

echo -e "${YELLOW}Database URL: ${DATABASE_URL}${NC}"
echo ""

# Function to run a migration
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")
    
    echo -e "${YELLOW}Running migration: ${migration_name}${NC}"
    
    if psql "$DATABASE_URL" -f "$migration_file"; then
        echo -e "${GREEN}✓ ${migration_name} completed successfully${NC}"
        echo ""
    else
        echo -e "${RED}✗ ${migration_name} failed${NC}"
        exit 1
    fi
}

# Confirm before proceeding
echo -e "${YELLOW}This will run the following migrations:${NC}"
echo "  1. 019_add_branches.sql - Create branches table and add branch_id columns"
echo "  2. 020_assign_default_branch.sql - Assign existing data to Davao Del Sur"
echo "  3. 021_update_rls_for_branches.sql - Update RLS policies for branch filtering"
echo ""
read -p "Do you want to proceed? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Starting migrations...${NC}"
echo ""

# Run migrations in order
run_migration "019_add_branches.sql"
run_migration "020_assign_default_branch.sql"
run_migration "021_update_rls_for_branches.sql"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Run verification queries
echo -e "${YELLOW}Running verification queries...${NC}"
echo ""

psql "$DATABASE_URL" << EOF
-- Verify branches
SELECT 'Branches created:' as info;
SELECT id, name, is_active FROM branches ORDER BY name;

-- Verify branch assignments
SELECT 'Branch assignments:' as info;
SELECT 
  'users' as table_name, 
  COUNT(*) as total, 
  COUNT(branch_id) as with_branch,
  COUNT(*) - COUNT(branch_id) as missing_branch
FROM users
UNION ALL
SELECT 'agents', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM agents
UNION ALL
SELECT 'applications', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM applications
UNION ALL
SELECT 'commissions', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM commissions
UNION ALL
SELECT 'plans', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM plans
UNION ALL
SELECT 'events', COUNT(*), COUNT(branch_id), COUNT(*) - COUNT(branch_id) FROM events;
EOF

echo ""
echo -e "${GREEN}Verification complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review the verification output above"
echo "  2. Update your backend code to use branch filtering"
echo "  3. Update your frontend to include branch selection"
echo "  4. Test with both admin and superadmin users"
echo ""
echo -e "${GREEN}See BRANCH_ACCESS_CONTROL_IMPLEMENTATION.md for details${NC}"
