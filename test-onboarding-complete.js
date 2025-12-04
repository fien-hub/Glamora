const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testOnboardingComplete() {
  console.log('🧪 Testing Onboarding Completion with Real User...\n');
  console.log('='.repeat(60));
  
  // Get the most recent provider user
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'provider')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (usersError || !users || users.length === 0) {
    console.log('❌ No provider users found');
    console.log('   Please create a provider account first');
    return;
  }
  
  const user = users[0];
  console.log('📋 Testing with user:', user.email);
  
  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  if (profileError || !profile) {
    console.log('❌ Profile not found:', profileError?.message);
    return;
  }
  
  console.log('✅ Profile ID:', profile.id);
  
  // Check provider profile
  const { data: providerProfile, error: ppError } = await supabase
    .from('provider_profiles')
    .select('*')
    .eq('id', profile.id)
    .single();
  
  if (ppError || !providerProfile) {
    console.log('❌ Provider profile not found:', ppError?.message);
    return;
  }
  
  console.log('\n📊 Current Provider Profile:');
  console.log('   Business Name:', providerProfile.business_name || '(not set)');
  console.log('   Onboarding Completed:', providerProfile.onboarding_completed);
  console.log('   Years Experience:', providerProfile.years_experience);
  console.log('   Service Radius:', providerProfile.service_radius_km, 'km');
  
  // Check services
  const { data: services, error: servicesError } = await supabase
    .from('provider_services')
    .select('id, service_id, base_price, duration_minutes')
    .eq('provider_id', profile.id);
  
  console.log('\n🛠️  Provider Services:', services?.length || 0);
  if (services && services.length > 0) {
    services.forEach((s, i) => {
      console.log(`   ${i + 1}. Service ID: ${s.service_id}, Price: $${(s.base_price / 100).toFixed(2)}, Duration: ${s.duration_minutes} min`);
    });
  }
  
  // Check availability
  const { data: availability, error: availError } = await supabase
    .from('provider_availability')
    .select('*')
    .eq('provider_id', profile.id);
  
  console.log('\n📅 Availability:', availability?.length || 0, 'days');
  if (availability && availability.length > 0) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    availability.forEach(a => {
      console.log(`   ${days[a.day_of_week]}: ${a.start_time} - ${a.end_time}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Diagnose issues
  console.log('\n🔍 Diagnosis:');
  
  if (!providerProfile.business_name) {
    console.log('   ⚠️  Business name is missing');
  }
  
  if (!services || services.length === 0) {
    console.log('   ⚠️  No services added - this might be the issue!');
    console.log('   The onboarding might be failing when trying to add services');
  }
  
  if (!availability || availability.length === 0) {
    console.log('   ⚠️  No availability set - this might be the issue!');
    console.log('   The onboarding might be failing when trying to add availability');
  }
  
  if (providerProfile.onboarding_completed) {
    console.log('   ✅ Onboarding is marked as completed');
  } else {
    console.log('   ⚠️  Onboarding is NOT completed');
  }
  
  console.log('\n' + '='.repeat(60));
}

testOnboardingComplete().catch(console.error);

