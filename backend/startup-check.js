/**
 * Startup Check Script
 * Checks database schema compatibility before starting the server
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check if users table has primary_branch_id or branch_id
    const { data: userColumns, error: userError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .in('column_name', ['primary_branch_id', 'branch_id']);

    if (userError) {
      console.error('❌ Error checking users table:', userError.message);
      return false;
    }

    const hasPrimaryBranchId = userColumns?.some(c => c.column_name === 'primary_branch_id');
    const hasBranchId = userColumns?.some(c => c.column_name === 'branch_id');

    if (hasPrimaryBranchId) {
      console.log('✅ Database schema: MIGRATED (has primary_branch_id)');
      console.log('   Multi-branch support is enabled');
    } else if (hasBranchId) {
      console.log('⚠️  Database schema: OLD (has branch_id)');
      console.log('   Backend is backward compatible - will work with old schema');
      console.log('   Consider running migrations for multi-branch support');
    } else {
      console.log('❌ Database schema: UNKNOWN (no branch column found)');
      return false;
    }

    // Check if user_branches table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'user_branches');

    if (!tableError && tables && tables.length > 0) {
      console.log('✅ user_branches table: EXISTS');
    } else {
      console.log('ℹ️  user_branches table: DOES NOT EXIST (will use fallback)');
    }

    console.log('\n✅ Database connection successful');
    console.log('✅ Backend is compatible with current database schema\n');
    return true;

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    return false;
  }
}

// Run check
checkDatabaseSchema()
  .then(success => {
    if (success) {
      console.log('🚀 Ready to start server\n');
      process.exit(0);
    } else {
      console.log('❌ Database check failed\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
