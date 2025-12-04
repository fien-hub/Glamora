const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testPostCreationAndDisplay() {
  console.log('🧪 Testing Post Creation and Display\n');
  console.log('='.repeat(60));

  // Step 0: Sign in as provider
  console.log('\n📝 Step 0: Signing in as provider...');
  console.log('-'.repeat(60));

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test-provider@example.com',
    password: 'TestPassword123!',
  });

  if (authError) {
    console.log('❌ Error signing in:', authError.message);
    return;
  }

  console.log('✅ Signed in as:', authData.user.email);

  // Step 1: Setup provider profile
  console.log('\n📝 Step 1: Setting up provider profile...');
  console.log('-'.repeat(60));

  const providerId = 'b9cb0488-739c-4cd1-a02c-1b09a713f822';
  
  // Update provider profile with required data
  const { error: updateError } = await supabase
    .from('provider_profiles')
    .update({
      business_name: 'Test Beauty Studio',
      is_verified: true,
      latitude: 37.7749,  // San Francisco coordinates
      longitude: -122.4194,
      address: '123 Market St',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102',
    })
    .eq('id', providerId);
  
  if (updateError) {
    console.log('❌ Error updating provider:', updateError.message);
    return;
  }
  
  console.log('✅ Provider profile updated');
  
  // Step 2: Create a portfolio post
  console.log('\n📝 Step 2: Creating portfolio post...');
  console.log('-'.repeat(60));
  
  const { data: postData, error: postError } = await supabase
    .from('portfolio_items')
    .insert({
      provider_id: providerId,
      image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
      description: 'Beautiful bridal makeup for a special day',
      caption: 'Bridal Glam ✨',
      service_category: 'Makeup',
      is_visible: true,
      like_count: 0,
      view_count: 0,
      display_order: 1,
    })
    .select()
    .single();
  
  if (postError) {
    console.log('❌ Error creating post:', postError.message);
    return;
  }
  
  console.log('✅ Post created successfully!');
  console.log('   Post ID:', postData.id);
  console.log('   Caption:', postData.caption);
  console.log('   Category:', postData.service_category);
  
  // Step 3: Test feed retrieval
  console.log('\n📝 Step 3: Testing feed retrieval...');
  console.log('-'.repeat(60));
  
  const { data: feedData, error: feedError } = await supabase
    .rpc('get_feed_posts', {
      user_lat: 37.7749,  // Same location as provider
      user_lng: -122.4194,
      page_size: 20,
      page_offset: 0,
    });
  
  if (feedError) {
    console.log('❌ Error fetching feed:', feedError.message);
    return;
  }
  
  console.log(`✅ Feed retrieved: ${feedData?.length || 0} posts found`);
  
  if (feedData && feedData.length > 0) {
    console.log('\n📋 Feed Post Details:');
    feedData.forEach((post, index) => {
      console.log(`\n   Post ${index + 1}:`);
      console.log(`   - ID: ${post.id}`);
      console.log(`   - Caption: ${post.caption}`);
      console.log(`   - Provider: ${post.provider_name}`);
      console.log(`   - Category: ${post.service_category}`);
      console.log(`   - Likes: ${post.likes_count}`);
      console.log(`   - Views: ${post.views_count}`);
      console.log(`   - Distance: ${post.distance_km?.toFixed(2)} km`);
      console.log(`   - Verified: ${post.is_verified ? 'Yes' : 'No'}`);
    });
  } else {
    console.log('\n⚠️  No posts found in feed. Checking why...');
    
    // Debug: Check if post exists
    const { data: allPosts } = await supabase
      .from('portfolio_items')
      .select('*');
    console.log(`   Total posts in database: ${allPosts?.length || 0}`);
    
    // Debug: Check provider verification
    const { data: provider } = await supabase
      .from('provider_profiles')
      .select('is_verified, business_name')
      .eq('id', providerId)
      .single();
    console.log(`   Provider verified: ${provider?.is_verified}`);
    console.log(`   Provider name: ${provider?.business_name}`);
  }
  
  // Step 4: Test post interactions
  console.log('\n📝 Step 4: Testing post interactions...');
  console.log('-'.repeat(60));
  
  if (postData) {
    // Increment view count
    const { error: viewError } = await supabase
      .from('portfolio_items')
      .update({ view_count: 1 })
      .eq('id', postData.id);
    
    if (viewError) {
      console.log('❌ Error updating view count:', viewError.message);
    } else {
      console.log('✅ View count incremented');
    }
    
    // Increment like count
    const { error: likeError } = await supabase
      .from('portfolio_items')
      .update({ like_count: 5 })
      .eq('id', postData.id);
    
    if (likeError) {
      console.log('❌ Error updating like count:', likeError.message);
    } else {
      console.log('✅ Like count updated to 5');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Post Creation and Display Test Complete!');
  console.log('='.repeat(60));
}

testPostCreationAndDisplay().catch(console.error);

