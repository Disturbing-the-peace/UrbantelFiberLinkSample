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

const isDevelopment = process.env.NODE_ENV !== 'production';

// Simple logger for startup script
const log = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

// Always log critical errors
const logCritical = (...args) => {
  console.error('[CRITICAL]', ...args);
};

async function checkDatabaseSchema() {
  log('🔍 Checking database schema...\n');

  try {
    // Try to query users table to check which branch column exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, primary_branch_id')
      .limit(1)
      .maybeSingle();

    // If primary_branch_id query succeeds, we have the new schema
    if (!userError || userError.code !== '42703') {
      log('✅ Database schema: MIGRATED (has primary_branch_id)');
      log('   Multi-branch support is enabled');
      
      // Check if user_branches table exists
      const { error: userBranchesError } = await supabase
        .from('user_branches')
        .select('user_id')
        .limit(1)
        .maybeSingle();
      
      if (!userBranchesError || userBranchesError.code !== '42P01') {
        log('✅ user_branches table: EXISTS');
      } else {
        log('ℹ️  user_branches table: DOES NOT EXIST (will use fallback)');
      }
    } else {
      // If we get column not found error, try old schema
      const { error: oldSchemaError } = await supabase
        .from('users')
        .select('id, branch_id')
        .limit(1)
        .maybeSingle();
      
      if (!oldSchemaError || oldSchemaError.code !== '42703') {
        log('⚠️  Database schema: OLD (has branch_id)');
        log('   Backend is backward compatible - will work with old schema');
        log('   Consider running migrations for multi-branch support');
      } else {
        logCritical('Database schema: UNKNOWN (no branch column found)');
        return false;
      }
    }

    log('\n✅ Database connection successful');
    log('✅ Backend is compatible with current database schema\n');
    return true;

  } catch (error) {
    logCritical('Error checking database:', error.message);
    return false;
  }
}

// Run check
checkDatabaseSchema()
  .then(success => {
    if (success) {
      log('🚀 Ready to start server\n');
      process.exit(0);
    } else {
      logCritical('Database check failed\n');
      process.exit(1);
    }
  })
  .catch(error => {
    logCritical('Unexpected error:', error);
    process.exit(1);
  });
