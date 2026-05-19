const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testOnboardingIssue() {
  console.log('🧪 Testing Onboarding Issue\n');
  console.log('='.repeat(60));
  
  // Step 1: Check all users and their onboarding status
  console.log('\n📝 Step 1: Checking all users and onboarding status...');
  console.log('-'.repeat(60));
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      email,
      role,
      profiles (
        id,
        customer_profiles (onboarding_completed),
        provider_profiles (onboarding_completed)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (usersError) {
    console.log('❌ Error fetching users:', usersError.message);
    return;
  }
  
  console.log(`✅ Found ${users?.length || 0} users:\n`);
  users?.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} (${user.role})`);
    console.log(`      Profile ID: ${user.profiles?.id || 'MISSING'}`);
    
    if (user.role === 'customer') {
      const onboarding = user.profiles?.customer_profiles?.onboarding_completed;
      console.log(`      Customer Onboarding: ${onboarding === true ? '✅ Complete' : onboarding === false ? '❌ Incomplete' : '⚠️  MISSING'}`);
    } else if (user.role === 'provider') {
      const onboarding = user.profiles?.provider_profiles?.onboarding_completed;
      console.log(`      Provider Onboarding: ${onboarding === true ? '✅ Complete' : onboarding === false ? '❌ Incomplete' : '⚠️  MISSING'}`);
    }
    console.log('');
  });
  
  // Step 2: Check feed posts availability
  console.log('\n📝 Step 2: Checking feed posts availability...');
  console.log('-'.repeat(60));
  
  const { data: feedPosts, error: feedError } = await supabase
    .rpc('get_feed_posts', {
      user_lat: 37.7749,
      user_lng: -122.4194,
      page_size: 20,
      page_offset: 0,
    });
  
  if (feedError) {
    console.log('❌ Error fetching feed:', feedError.message);
    console.log('   This is the error you\'re seeing in the app!');
  } else {
    console.log(`✅ Feed loaded successfully: ${feedPosts?.length || 0} posts`);
    if (feedPosts && feedPosts.length > 0) {
      console.log('\n   Sample post:');
      console.log(`   - Caption: ${feedPosts[0].caption}`);
      console.log(`   - Provider: ${feedPosts[0].provider_name}`);
      console.log(`   - Verified: ${feedPosts[0].is_verified}`);
    }
  }
  
  // Step 3: Check if there are any portfolio items
  console.log('\n📝 Step 3: Checking portfolio items...');
  console.log('-'.repeat(60));
  
  const { data: portfolioItems, error: portfolioError } = await supabase
    .from('portfolio_items')
    .select('id, provider_id, is_visible, caption')
    .limit(5);
  
  if (portfolioError) {
    console.log('❌ Error fetching portfolio items:', portfolioError.message);
  } else {
    console.log(`✅ Found ${portfolioItems?.length || 0} portfolio items`);
    portfolioItems?.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.caption || 'No caption'} (visible: ${item.is_visible})`);
    });
  }
  
  // Step 4: Check verified providers
  console.log('\n📝 Step 4: Checking verified providers...');
  console.log('-'.repeat(60));
  
  const { data: providers, error: providersError } = await supabase
    .from('provider_profiles')
    .select('id, business_name, is_verified, latitude, longitude')
    .eq('is_verified', true);
  
  if (providersError) {
    console.log('❌ Error fetching providers:', providersError.message);
  } else {
    console.log(`✅ Found ${providers?.length || 0} verified providers`);
    providers?.forEach((provider, index) => {
      console.log(`   ${index + 1}. ${provider.business_name || 'No name'}`);
      console.log(`      Location: ${provider.latitude ? 'Set' : 'Missing'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary:');
  console.log(`   - Total users: ${users?.length || 0}`);
  console.log(`   - Feed posts: ${feedPosts?.length || 0}`);
  console.log(`   - Portfolio items: ${portfolioItems?.length || 0}`);
  console.log(`   - Verified providers: ${providers?.length || 0}`);
  
  if (feedError) {
    console.log('\n⚠️  ISSUE FOUND: Feed is not loading!');
    console.log('   Error:', feedError.message);
  } else if (!feedPosts || feedPosts.length === 0) {
    console.log('\n⚠️  ISSUE: Feed is empty but no error');
    console.log('   Possible causes:');
    console.log('   - No verified providers with posts');
    console.log('   - No portfolio items marked as visible');
    console.log('   - Providers missing location data');
  } else {
    console.log('\n✅ Feed is working correctly!');
  }
  console.log('='.repeat(60));
}

testOnboardingIssue().catch(console.error);

