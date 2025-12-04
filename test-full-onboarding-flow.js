const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testFullFlow() {
  console.log('🧪 Testing FULL Onboarding Flow...\n');
  console.log('='.repeat(60));
  
  const testEmail = `fulltest-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Step 1: Sign up
    console.log('1️⃣  SIGNUP: Creating account...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (authError) throw authError;
    console.log('   ✅ Auth account created:', authData.user.id);
    
    // Step 2: Create profile
    console.log('\n2️⃣  SIGNUP: Creating profile...');
    const { data: profileResult, error: profileError } = await supabase.rpc('create_user_profile', {
      p_user_id: authData.user.id,
      p_email: testEmail,
      p_role: 'provider',
      p_first_name: 'Test',
      p_last_name: 'Provider',
      p_phone: null,
    });
    
    if (profileError) throw profileError;
    console.log('   ✅ Profile created:', profileResult.profile_id);
    
    // Step 3: Get profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authData.user.id)
      .single();
    
    console.log('\n3️⃣  ONBOARDING STEP 1: Business Info...');
    const { error: providerError } = await supabase
      .from('provider_profiles')
      .update({
        business_name: 'Test Beauty Studio',
        years_experience: 5,
        certifications: ['Licensed Cosmetologist'],
        service_radius_km: 10,
      })
      .eq('id', profile.id);
    
    if (providerError) throw providerError;
    console.log('   ✅ Business info saved');
    
    // Step 4: Add services
    console.log('\n4️⃣  ONBOARDING STEP 2: Adding services...');
    const { data: services } = await supabase
      .from('services')
      .select('id, base_duration_minutes')
      .limit(3);
    
    for (const service of services) {
      const { error: serviceError } = await supabase
        .from('provider_services')
        .insert({
          provider_id: profile.id,
          service_id: service.id,
          base_price: 5000,
          duration_minutes: service.base_duration_minutes,
          is_active: true,
          platform_commission_rate: 0.20,
        });
      
      if (serviceError) throw serviceError;
    }
    console.log(`   ✅ Added ${services.length} services`);
    
    // Step 5: Add availability
    console.log('\n5️⃣  ONBOARDING STEP 3: Adding availability...');
    const workingDays = [1, 2, 3, 4, 5];
    for (const day of workingDays) {
      const { error: availError } = await supabase
        .from('provider_availability')
        .insert({
          provider_id: profile.id,
          day_of_week: day,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
        });
      
      if (availError) throw availError;
    }
    console.log('   ✅ Availability added');
    
    // Step 6: Complete onboarding
    console.log('\n6️⃣  ONBOARDING STEP 4: Completing onboarding...');
    const { error: completeError } = await supabase
      .from('provider_profiles')
      .update({ onboarding_completed: true })
      .eq('id', profile.id);
    
    if (completeError) throw completeError;
    console.log('   ✅ Onboarding marked as complete');
    
    // Verify everything
    console.log('\n7️⃣  VERIFICATION: Checking final state...');
    const { data: finalProfile } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('id', profile.id)
      .single();
    
    const { data: finalServices } = await supabase
      .from('provider_services')
      .select('*')
      .eq('provider_id', profile.id);
    
    const { data: finalAvailability } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', profile.id);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ FULL FLOW COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📊 Final State:');
    console.log(`   Business Name: ${finalProfile.business_name}`);
    console.log(`   Onboarding Complete: ${finalProfile.onboarding_completed}`);
    console.log(`   Services: ${finalServices.length}`);
    console.log(`   Availability: ${finalAvailability.length} days`);
    console.log('\n📱 You can now log in with:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Details:', error);
  }
}

testFullFlow().catch(console.error);

