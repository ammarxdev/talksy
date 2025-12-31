require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Supabase Connection Test ===\n');
console.log('URL:', supabaseUrl ? supabaseUrl : 'NOT SET');
console.log('Key:', supabaseAnonKey ? 'SET' : 'NOT SET');
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ FAILED: Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Profiles table error:', profilesError.message);
    } else {
      console.log('✅ Profiles table accessible');
    }
    
    // Test 2: Check storage bucket
    const { data: files, error: storageError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1 });
    
    if (storageError) {
      console.log('❌ Storage bucket error:', storageError.message);
    } else {
      console.log('✅ Avatars storage bucket accessible');
    }
    
    // Test 3: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚠️  Auth check warning:', authError.message);
    } else {
      console.log('✅ Authentication system working (user:', user ? 'logged in' : 'not logged in', ')');
    }
    
    console.log('\n=== Connection Test Complete ===');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
