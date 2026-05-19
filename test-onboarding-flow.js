const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testOnboardingFlow() {
  console.log('🧪 Testing Onboarding Flow\n');
  console.log('='.repeat(60));
  
  // Test 1: Create a provider account
  console.log('\n📝 Test 1: Provider Signup Flow');
  console.log('-'.repeat(60));
  
  const providerEmail = 'test-provider@example.com';
  const providerPassword = 'TestPassword123!';
  
  console.log(`Creating provider account: ${providerEmail}`);
  
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: providerEmail,
    password: providerPassword,
    options: {
      data: {
        role: 'provider',
        first_name: 'Test',
        last_name: 'Provider',
      }
    }
  });
  
  if (signupError) {
    console.log('❌ Signup failed:', signupError.message);
    return;
  }
  
  console.log('✅ Provider account created:', signupData.user.id);
  
  // Wait a bit for database triggers
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if user record was created
  const { data: userData } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', signupData.user.id)
    .single();
  
  console.log('User record:', userData ? '✅ Created' : '❌ Missing');
  
  // Check if profile was created
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('user_id', signupData.user.id)
    .single();
  
  console.log('Profile record:', profileData ? '✅ Created' : '❌ Missing');
  
  if (profileData) {
    // Check if provider profile was created
    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('id, business_name, onboarding_completed')
      .eq('id', profileData.id)
      .single();
    
    console.log('Provider profile:', providerProfile ? '✅ Created' : '❌ Missing');
    
    if (providerProfile) {
      console.log('Onboarding status:', providerProfile.onboarding_completed ? '❌ Already completed (should be false)' : '✅ Not completed (correct)');
      
      if (!providerProfile.onboarding_completed) {
        console.log('\n✅ Provider should see onboarding screen!');
      }
    }
  }
  
  // Test 2: Create a customer account
  console.log('\n\n📝 Test 2: Customer Signup Flow');
  console.log('-'.repeat(60));
  
  const customerEmail = 'test-customer@example.com';
  const customerPassword = 'TestPassword123!';
  
  console.log(`Creating customer account: ${customerEmail}`);
  
  const { data: customerSignupData, error: customerSignupError } = await supabase.auth.signUp({
    email: customerEmail,
    password: customerPassword,
    options: {
      data: {
        role: 'customer',
        first_name: 'Test',
        last_name: 'Customer',
      }
    }
  });
  
  if (customerSignupError) {
    console.log('❌ Signup failed:', customerSignupError.message);
    return;
  }
  
  console.log('✅ Customer account created:', customerSignupData.user.id);
  
  // Wait a bit for database triggers
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check customer profile
  const { data: customerProfileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', customerSignupData.user.id)
    .single();
  
  console.log('Profile record:', customerProfileData ? '✅ Created' : '❌ Missing');
  
  if (customerProfileData) {
    const { data: customerProfile } = await supabase
      .from('customer_profiles')
      .select('id, onboarding_completed')
      .eq('id', customerProfileData.id)
      .single();
    
    console.log('Customer profile:', customerProfile ? '✅ Created' : '❌ Missing');
    
    if (customerProfile) {
      console.log('Onboarding status:', customerProfile.onboarding_completed ? '❌ Already completed (should be false)' : '✅ Not completed (correct)');
      
      if (!customerProfile.onboarding_completed) {
        console.log('\n✅ Customer should see personalization screen!');
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Onboarding Flow Test Complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Open the app and try logging in with:');
  console.log(`   Provider: ${providerEmail} / ${providerPassword}`);
  console.log(`   Customer: ${customerEmail} / ${customerPassword}`);
  console.log('2. Verify that onboarding screens appear');
  console.log('3. Complete the onboarding and verify you reach the main app');
}

testOnboardingFlow().catch(console.error);

