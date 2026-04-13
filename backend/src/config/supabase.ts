import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// In test environment, allow missing env vars (will be mocked)
if (!supabaseUrl || !supabaseServiceKey) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Missing Supabase environment variables');
  }
}

// Use dummy values in test environment if not provided
const url = supabaseUrl || 'https://test.supabase.co';
const key = supabaseServiceKey || 'test-service-key';

// Use service role key for backend to bypass RLS
export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
