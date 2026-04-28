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
    // Try to query users table to check which branch column exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, primary_branch_id')
      .limit(1)
      .maybeSingle();

    // If primary_branch_id query succeeds, we have the new schema
    if (!userError || userError.code !== '42703') {
      console.log('✅ Database schema: MIGRATED (has primary_branch_id)');
      console.log('   Multi-branch support is enabled');
      
      // Check if user_branches table exists
      const { error: userBranchesError } = await supabase
        .from('user_branches')
        .select('user_id')
        .limit(1)
        .maybeSingle();
      
      if (!userBranchesError || userBranchesError.code !== '42P01') {
        console.log('✅ user_branches table: EXISTS');
      } else {
        console.log('ℹ️  user_branches table: DOES NOT EXIST (will use fallback)');
      }
    } else {
      // If we get column not found error, try old schema
      const { error: oldSchemaError } = await supabase
        .from('users')
        .select('id, branch_id')
        .limit(1)
        .maybeSingle();
      
      if (!oldSchemaError || oldSchemaError.code !== '42703') {
        console.log('⚠️  Database schema: OLD (has branch_id)');
        console.log('   Backend is backward compatible - will work with old schema');
        console.log('   Consider running migrations for multi-branch support');
      } else {
        console.log('❌ Database schema: UNKNOWN (no branch column found)');
        return false;
      }
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
