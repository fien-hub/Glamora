/**
 * Test the payment endpoint directly
 * Run with: node test-payment-endpoint.js
 */

require('dotenv').config({ path: './glamora-backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function testPaymentEndpoint() {
  console.log('\n🧪 Testing Payment Endpoint\n');
  console.log('API URL:', API_URL);
  
  try {
    // 1. Get a test user and create a session
    console.log('1️⃣  Getting test user...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found. Please create a test user first.');
      return;
    }
    
    const testUser = users[0];
    console.log('✅ Found user:', testUser.email);
    
    // 2. Sign in as the test user
    console.log('\n2️⃣  Signing in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: 'TestPassword123!', // You'll need to use the actual password
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      console.log('💡 Try with a known test account or create one');
      return;
    }
    
    const accessToken = signInData.session.access_token;
    console.log('✅ Signed in successfully');
    console.log('   Token:', accessToken.substring(0, 20) + '...');
    
    // 3. Get a recent booking
    console.log('\n3️⃣  Finding a recent booking...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, total_price, status')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (bookingsError || !bookings || bookings.length === 0) {
      console.error('❌ No bookings found. Create a booking first.');
      return;
    }
    
    const booking = bookings[0];
    console.log('✅ Found booking:', booking.id);
    console.log('   Amount: $' + booking.total_price);
    console.log('   Status:', booking.status);
    
    // 4. Test the payment intent endpoint
    console.log('\n4️⃣  Testing payment intent creation...');
    console.log('   URL:', `${API_URL}/api/payments/create-intent`);
    console.log('   Booking ID:', booking.id);
    
    const response = await fetch(`${API_URL}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        bookingId: booking.id,
      }),
    });
    
    console.log('   Response status:', response.status);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Payment intent creation failed');
      console.error('   Error:', data.error || data.message);
      console.error('   Full response:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('✅ Payment intent created successfully!');
    console.log('   Payment Intent ID:', data.paymentIntentId);
    console.log('   Customer ID:', data.customer);
    console.log('   Client Secret:', data.clientSecret ? 'Present ✓' : 'Missing ✗');
    console.log('   Ephemeral Key:', data.ephemeralKey ? 'Present ✓' : 'Missing ✗');
    
    console.log('\n✅ All tests passed! The payment endpoint is working correctly.');
    console.log('\n💡 Next steps:');
    console.log('   1. Make sure your Expo app is using the correct API URL');
    console.log('   2. Check that authentication is working in the app');
    console.log('   3. Use test card: 4242 4242 4242 4242');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testPaymentEndpoint();

