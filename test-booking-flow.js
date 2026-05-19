const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testBookingFlow() {
  console.log('🧪 Testing Complete Booking Flow\n');
  console.log('='.repeat(60));
  
  // Step 1: Setup - Get provider and customer IDs
  console.log('\n📝 Step 1: Getting provider and customer profiles...');
  console.log('-'.repeat(60));
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test-provider@example.com',
    password: 'TestPassword123!',
  });
  
  if (authError) {
    console.log('❌ Error signing in as provider:', authError.message);
    return;
  }
  
  const { data: providerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authData.user.id)
    .single();
  
  const providerId = providerProfile?.id;
  console.log('✅ Provider ID:', providerId);
  
  // Get customer
  const { data: customerAuth } = await supabase.auth.signInWithPassword({
    email: 'test-customer@example.com',
    password: 'TestPassword123!',
  });
  
  const { data: customerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', customerAuth.user.id)
    .single();
  
  const customerId = customerProfile?.id;
  console.log('✅ Customer ID:', customerId);
  
  // Step 2: Get available services
  console.log('\n📝 Step 2: Getting available services...');
  console.log('-'.repeat(60));
  
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .limit(5);
  
  if (servicesError) {
    console.log('❌ Error fetching services:', servicesError.message);
    return;
  }
  
  console.log(`✅ Found ${services?.length || 0} services`);
  if (services && services.length > 0) {
    services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name} - ${service.category}`);
    });
  }
  
  // Step 3: Get or create provider services
  console.log('\n📝 Step 3: Getting/creating provider services...');
  console.log('-'.repeat(60));

  if (!services || services.length === 0) {
    console.log('❌ No services available');
    return;
  }

  // First, check if provider services already exist
  const { data: existingServices } = await supabase
    .from('provider_services')
    .select('*')
    .eq('provider_id', providerId);

  let providerServices = existingServices || [];

  if (providerServices.length === 0) {
    // Create new services
    for (let i = 0; i < Math.min(3, services.length); i++) {
      const { data: result, error: psError } = await supabase
        .rpc('create_provider_service', {
          p_provider_id: providerId,
          p_service_id: services[i].id,
          p_base_price: 50.00 + (i * 25),
          p_duration_minutes: 60 + (i * 30),
          p_description: `Professional ${services[i].name} service`,
        });

      if (psError || !result?.success) {
        console.log(`   ⚠️  Error creating service ${services[i].name}:`, psError?.message || result?.error);
      } else {
        providerServices.push({ id: result.service_id, base_price: 50.00 + (i * 25) });
        console.log(`   ✅ Created: ${services[i].name} - $${50.00 + (i * 25)}`);
      }
    }
  } else {
    console.log(`✅ Found ${providerServices.length} existing provider services`);
    providerServices.forEach((ps, index) => {
      console.log(`   ${index + 1}. Service ID: ${ps.service_id} - $${ps.base_price}`);
    });
  }

  if (providerServices.length === 0) {
    console.log('❌ No provider services available');
    return;
  }
  
  // Step 4: Search for services (as customer)
  console.log('\n📝 Step 4: Searching for services...');
  console.log('-'.repeat(60));
  
  const { data: searchResults, error: searchError } = await supabase
    .from('provider_services')
    .select(`
      *,
      service:services(*),
      provider:provider_profiles(
        id,
        business_name,
        rating,
        is_verified,
        latitude,
        longitude
      )
    `)
    .eq('is_active', true)
    .eq('provider.is_verified', true);
  
  if (searchError) {
    console.log('❌ Error searching services:', searchError.message);
  } else {
    console.log(`✅ Found ${searchResults?.length || 0} available services`);
  }
  
  // Step 5: Create a booking (as customer)
  console.log('\n📝 Step 5: Creating a booking...');
  console.log('-'.repeat(60));

  if (providerServices.length === 0) {
    console.log('❌ No provider services available for booking');
    return;
  }

  // Sign in as customer
  await supabase.auth.signInWithPassword({
    email: 'test-customer@example.com',
    password: 'TestPassword123!',
  });

  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 7); // Book for next week

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      customer_id: customerId,
      provider_id: providerId,
      provider_service_id: providerServices[0].id,
      scheduled_date: bookingDate.toISOString().split('T')[0],
      scheduled_time: '14:00:00',
      total_price: providerServices[0].base_price,
      address: '123 Test Street',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102',
      latitude: 37.7749,
      longitude: -122.4194,
      notes: 'Test booking from automated test',
      status: 'pending',
    })
    .select()
    .single();

  if (bookingError) {
    console.log('❌ Error creating booking:', bookingError.message);
  } else {
    console.log('✅ Booking created successfully!');
    console.log(`   Booking ID: ${booking.id}`);
    console.log(`   Date: ${booking.scheduled_date}`);
    console.log(`   Time: ${booking.scheduled_time}`);
    console.log(`   Price: $${booking.total_price}`);
    console.log(`   Status: ${booking.status}`);
  }

  // Step 6: Retrieve bookings
  console.log('\n📝 Step 6: Retrieving customer bookings...');
  console.log('-'.repeat(60));

  const { data: customerBookings, error: cbError } = await supabase
    .from('bookings')
    .select(`
      *,
      provider:provider_profiles(business_name, rating),
      provider_service:provider_services(
        base_price,
        duration_minutes,
        service:services(name, description)
      )
    `)
    .eq('customer_id', customerId)
    .order('scheduled_date', { ascending: false });

  if (cbError) {
    console.log('❌ Error retrieving bookings:', cbError.message);
  } else {
    console.log(`✅ Found ${customerBookings?.length || 0} bookings`);
    if (customerBookings && customerBookings.length > 0) {
      customerBookings.forEach((b, index) => {
        console.log(`\n   Booking ${index + 1}:`);
        console.log(`   - Provider: ${b.provider?.business_name}`);
        console.log(`   - Service: ${b.provider_service?.service?.name}`);
        console.log(`   - Date: ${b.scheduled_date} at ${b.scheduled_time}`);
        console.log(`   - Status: ${b.status}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Summary:');
  console.log(`   - Provider services created: ${providerServices.length}`);
  console.log(`   - Services searchable: ${searchResults?.length || 0}`);
  console.log(`   - Bookings created: ${booking ? 1 : 0}`);
  console.log(`   - Bookings retrieved: ${customerBookings?.length || 0}`);
  console.log('='.repeat(60));
}

testBookingFlow().catch(console.error);

