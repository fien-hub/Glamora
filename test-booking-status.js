const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testBookingStatus() {
  console.log('🧪 Testing Booking Status Updates\n');
  console.log('='.repeat(60));
  
  // Step 1: Get a booking to test with
  console.log('\n📝 Step 1: Getting a test booking...');
  console.log('-'.repeat(60));
  
  // Sign in as customer
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test-customer@example.com',
    password: 'TestPassword123!',
  });
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authData.user.id)
    .single();
  
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', profile.id)
    .limit(1)
    .single();
  
  if (!bookings) {
    console.log('❌ No bookings found');
    return;
  }
  
  console.log('✅ Found booking:', bookings.id);
  console.log(`   Current status: ${bookings.status}`);
  
  // Step 2: Test status update to 'confirmed'
  console.log('\n📝 Step 2: Updating status to "confirmed"...');
  console.log('-'.repeat(60));
  
  const { data: confirmed, error: confirmError } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookings.id)
    .select()
    .single();
  
  if (confirmError) {
    console.log('❌ Error updating to confirmed:', confirmError.message);
  } else {
    console.log('✅ Status updated to:', confirmed.status);
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 3: Test status update to 'in_progress'
  console.log('\n📝 Step 3: Updating status to "in_progress"...');
  console.log('-'.repeat(60));
  
  const { data: inProgress, error: progressError } = await supabase
    .from('bookings')
    .update({ status: 'in_progress' })
    .eq('id', bookings.id)
    .select()
    .single();
  
  if (progressError) {
    console.log('❌ Error updating to in_progress:', progressError.message);
  } else {
    console.log('✅ Status updated to:', inProgress.status);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 4: Test status update to 'completed'
  console.log('\n📝 Step 4: Updating status to "completed"...');
  console.log('-'.repeat(60));
  
  const { data: completed, error: completeError } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookings.id)
    .select()
    .single();
  
  if (completeError) {
    console.log('❌ Error updating to completed:', completeError.message);
  } else {
    console.log('✅ Status updated to:', completed.status);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 5: Test cancellation
  console.log('\n📝 Step 5: Testing cancellation...');
  console.log('-'.repeat(60));
  
  const { data: cancelled, error: cancelError } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      cancellation_reason: 'Test cancellation from automated test'
    })
    .eq('id', bookings.id)
    .select()
    .single();
  
  if (cancelError) {
    console.log('❌ Error cancelling booking:', cancelError.message);
  } else {
    console.log('✅ Booking cancelled');
    console.log(`   Status: ${cancelled.status}`);
    console.log(`   Reason: ${cancelled.cancellation_reason}`);
  }
  
  // Step 6: Verify final state
  console.log('\n📝 Step 6: Verifying final booking state...');
  console.log('-'.repeat(60));
  
  const { data: finalBooking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookings.id)
    .single();
  
  console.log('✅ Final booking state:');
  console.log(`   ID: ${finalBooking.id}`);
  console.log(`   Status: ${finalBooking.status}`);
  console.log(`   Created: ${finalBooking.created_at}`);
  console.log(`   Updated: ${finalBooking.updated_at}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Booking Status Updates Test Complete!');
  console.log('='.repeat(60));
}

testBookingStatus().catch(console.error);

