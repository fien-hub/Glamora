const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testFeedDisplay() {
  console.log('🧪 Testing Feed Display with Distance Calculations\n');
  console.log('='.repeat(60));
  
  // Test 1: Feed from same location (San Francisco)
  console.log('\n📝 Test 1: Feed from same location (San Francisco)');
  console.log('-'.repeat(60));
  
  const { data: feed1, error: error1 } = await supabase
    .rpc('get_feed_posts', {
      user_lat: 37.7749,
      user_lng: -122.4194,
      page_size: 20,
      page_offset: 0,
    });
  
  if (error1) {
    console.log('❌ Error:', error1.message);
  } else {
    console.log(`✅ Found ${feed1?.length || 0} posts`);
    if (feed1 && feed1.length > 0) {
      console.log(`   Distance to first post: ${feed1[0].distance_km?.toFixed(2)} km`);
    }
  }
  
  // Test 2: Feed from nearby location (Oakland - ~20km away)
  console.log('\n📝 Test 2: Feed from nearby location (Oakland)');
  console.log('-'.repeat(60));
  
  const { data: feed2, error: error2 } = await supabase
    .rpc('get_feed_posts', {
      user_lat: 37.8044,
      user_lng: -122.2712,
      page_size: 20,
      page_offset: 0,
    });
  
  if (error2) {
    console.log('❌ Error:', error2.message);
  } else {
    console.log(`✅ Found ${feed2?.length || 0} posts`);
    if (feed2 && feed2.length > 0) {
      console.log(`   Distance to first post: ${feed2[0].distance_km?.toFixed(2)} km`);
    }
  }
  
  // Test 3: Feed from far location (Los Angeles - ~600km away)
  console.log('\n📝 Test 3: Feed from far location (Los Angeles)');
  console.log('-'.repeat(60));
  
  const { data: feed3, error: error3 } = await supabase
    .rpc('get_feed_posts', {
      user_lat: 34.0522,
      user_lng: -118.2437,
      page_size: 20,
      page_offset: 0,
    });
  
  if (error3) {
    console.log('❌ Error:', error3.message);
  } else {
    console.log(`✅ Found ${feed3?.length || 0} posts`);
    if (feed3 && feed3.length > 0) {
      console.log(`   Distance to first post: ${feed3[0].distance_km?.toFixed(2)} km`);
    }
  }
  
  // Test 4: Feed without location (should still work)
  console.log('\n📝 Test 4: Feed without user location');
  console.log('-'.repeat(60));
  
  const { data: feed4, error: error4 } = await supabase
    .rpc('get_feed_posts', {
      user_lat: null,
      user_lng: null,
      page_size: 20,
      page_offset: 0,
    });
  
  if (error4) {
    console.log('❌ Error:', error4.message);
  } else {
    console.log(`✅ Found ${feed4?.length || 0} posts`);
    if (feed4 && feed4.length > 0) {
      console.log(`   Distance: ${feed4[0].distance_km === null ? 'Not calculated' : feed4[0].distance_km + ' km'}`);
    }
  }
  
  // Test 5: Verify all post data is complete
  console.log('\n📝 Test 5: Verify post data completeness');
  console.log('-'.repeat(60));
  
  if (feed1 && feed1.length > 0) {
    const post = feed1[0];
    const requiredFields = [
      'id', 'provider_id', 'image_url', 'description', 'caption',
      'service_category', 'likes_count', 'views_count', 'created_at',
      'is_visible', 'provider_name', 'is_verified'
    ];
    
    const missingFields = requiredFields.filter(field => post[field] === undefined);
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields present');
      console.log('\n   Post Details:');
      console.log(`   - ID: ${post.id}`);
      console.log(`   - Caption: ${post.caption}`);
      console.log(`   - Provider: ${post.provider_name}`);
      console.log(`   - Category: ${post.service_category}`);
      console.log(`   - Likes: ${post.likes_count}`);
      console.log(`   - Views: ${post.views_count}`);
      console.log(`   - Verified: ${post.is_verified ? 'Yes' : 'No'}`);
      console.log(`   - Visible: ${post.is_visible ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Missing fields:', missingFields.join(', '));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Feed Display Test Complete!');
  console.log('='.repeat(60));
}

testFeedDisplay().catch(console.error);

