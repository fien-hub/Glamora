#!/usr/bin/env node

/**
 * Delete all test accounts from Supabase
 * This script will:
 * 1. Delete all related data (profiles, bookings, etc.)
 * 2. Delete all auth users
 * 
 * WARNING: This will delete ALL user data!
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAllTestAccounts() {
  console.log('🗑️  Starting deletion of all test accounts...\n');

  try {
    // Step 1: Get all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }

    console.log(`📊 Found ${users.length} users to delete\n`);

    if (users.length === 0) {
      console.log('✅ No users to delete');
      return;
    }

    // Step 2: Delete related data first (in correct order)
    console.log('🗑️  Deleting related data...');
    
    await supabase.from('analytics_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted analytics_events');
    
    await supabase.from('portfolio_views').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted portfolio_views');
    
    await supabase.from('portfolio_saves').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted portfolio_saves');
    
    await supabase.from('portfolio_likes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted portfolio_likes');
    
    await supabase.from('portfolio_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted portfolio_items');
    
    await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted reviews');
    
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted bookings');
    
    await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted services');
    
    await supabase.from('availability').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted availability');
    
    await supabase.from('provider_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted provider_profiles');
    
    await supabase.from('customer_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   ✓ Deleted customer_profiles');

    console.log('\n🗑️  Deleting auth users...');

    // Step 3: Delete all auth users
    let deletedCount = 0;
    for (const user of users) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`   ❌ Failed to delete user ${user.email}: ${error.message}`);
      } else {
        deletedCount++;
        console.log(`   ✓ Deleted user: ${user.email}`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} out of ${users.length} users`);
    console.log('✅ All test accounts have been removed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
deleteAllTestAccounts();

