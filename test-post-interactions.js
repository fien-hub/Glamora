const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testPostInteractions() {
  console.log('🧪 Testing Post Interactions (Likes & Views)\n');
  console.log('='.repeat(60));
  
  // Sign in as customer
  console.log('\n📝 Step 1: Signing in as customer...');
  console.log('-'.repeat(60));
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test-customer@example.com',
    password: 'TestPassword123!',
  });
  
  if (authError) {
    console.log('❌ Error signing in:', authError.message);
    return;
  }
  
  console.log('✅ Signed in as:', authData.user.email);
  
  // Get customer profile ID
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authData.user.id)
    .single();
  
  if (!profileData) {
    console.log('❌ Customer profile not found');
    return;
  }
  
  const customerId = profileData.id;
  console.log('   Customer ID:', customerId);
  
  // Get a post to interact with
  console.log('\n📝 Step 2: Getting a post to interact with...');
  console.log('-'.repeat(60));
  
  const { data: posts } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('is_visible', true)
    .limit(1)
    .single();
  
  if (!posts) {
    console.log('❌ No posts found');
    return;
  }
  
  console.log('✅ Found post:', posts.id);
  console.log('   Initial likes:', posts.like_count);
  console.log('   Initial views:', posts.view_count);
  
  // Test: Record a view
  console.log('\n📝 Step 3: Recording a view...');
  console.log('-'.repeat(60));
  
  const { error: viewError } = await supabase
    .from('portfolio_views')
    .insert({
      portfolio_item_id: posts.id,
      customer_id: customerId,
    });
  
  if (viewError) {
    console.log('❌ Error recording view:', viewError.message);
  } else {
    console.log('✅ View recorded');
    
    // Wait a bit for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check updated view count
    const { data: updatedPost1 } = await supabase
      .from('portfolio_items')
      .select('view_count')
      .eq('id', posts.id)
      .single();
    
    console.log('   Updated view count:', updatedPost1?.view_count);
  }
  
  // Test: Add a like
  console.log('\n📝 Step 4: Adding a like...');
  console.log('-'.repeat(60));
  
  const { error: likeError } = await supabase
    .from('portfolio_likes')
    .insert({
      portfolio_item_id: posts.id,
      customer_id: customerId,
    });
  
  if (likeError) {
    console.log('❌ Error adding like:', likeError.message);
  } else {
    console.log('✅ Like added');
    
    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check updated like count
    const { data: updatedPost2 } = await supabase
      .from('portfolio_items')
      .select('like_count')
      .eq('id', posts.id)
      .single();
    
    console.log('   Updated like count:', updatedPost2?.like_count);
  }
  
  // Test: Remove the like
  console.log('\n📝 Step 5: Removing the like...');
  console.log('-'.repeat(60));
  
  const { error: unlikeError } = await supabase
    .from('portfolio_likes')
    .delete()
    .eq('portfolio_item_id', posts.id)
    .eq('customer_id', customerId);
  
  if (unlikeError) {
    console.log('❌ Error removing like:', unlikeError.message);
  } else {
    console.log('✅ Like removed');
    
    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check updated like count
    const { data: updatedPost3 } = await supabase
      .from('portfolio_items')
      .select('like_count')
      .eq('id', posts.id)
      .single();
    
    console.log('   Updated like count:', updatedPost3?.like_count);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Post Interactions Test Complete!');
  console.log('='.repeat(60));
}

testPostInteractions().catch(console.error);

