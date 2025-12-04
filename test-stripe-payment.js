/**
 * Test script to diagnose Stripe payment issues
 * Run with: node test-stripe-payment.js
 */

require('dotenv').config({ path: './glamora-backend/.env' });
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testStripeConnection() {
  console.log('\n🔍 Testing Stripe Connection...\n');
  
  try {
    const balance = await stripe.balance.retrieve();
    console.log('✅ Stripe connection successful!');
    console.log('   Available balance:', balance.available);
    console.log('   Pending balance:', balance.pending);
    return true;
  } catch (error) {
    console.error('❌ Stripe connection failed:', error.message);
    return false;
  }
}

async function testPaymentIntent() {
  console.log('\n🔍 Testing Payment Intent Creation...\n');
  
  try {
    // Create a test customer
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      metadata: { test: 'true' }
    });
    console.log('✅ Test customer created:', customer.id);

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000, // $50.00
      currency: 'usd',
      customer: customer.id,
      metadata: { test: 'true' }
    });
    console.log('✅ Payment intent created:', paymentIntent.id);
    console.log('   Status:', paymentIntent.status);
    console.log('   Amount:', paymentIntent.amount / 100, 'USD');

    // Clean up
    await stripe.customers.del(customer.id);
    console.log('✅ Test customer deleted');
    
    return true;
  } catch (error) {
    console.error('❌ Payment intent creation failed:', error.message);
    return false;
  }
}

async function checkProviderStripeAccounts() {
  console.log('\n🔍 Checking Provider Stripe Accounts...\n');
  
  try {
    const { data: providers, error } = await supabase
      .from('provider_profiles')
      .select('id, stripe_account_id, stripe_onboarding_complete, business_name');

    if (error) throw error;

    console.log(`Found ${providers.length} providers:\n`);
    
    providers.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider.business_name || 'Unnamed'}`);
      console.log(`   ID: ${provider.id}`);
      console.log(`   Stripe Account: ${provider.stripe_account_id || '❌ NOT SET UP'}`);
      console.log(`   Onboarding Complete: ${provider.stripe_onboarding_complete ? '✅' : '❌'}`);
      console.log('');
    });

    const withoutStripe = providers.filter(p => !p.stripe_account_id);
    if (withoutStripe.length > 0) {
      console.log(`⚠️  ${withoutStripe.length} provider(s) need to set up Stripe Connect`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check providers:', error.message);
    return false;
  }
}

async function checkRecentBookings() {
  console.log('\n🔍 Checking Recent Bookings...\n');
  
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        total_price,
        created_at,
        customer_id,
        provider:provider_profiles(business_name, stripe_account_id)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log(`Found ${bookings.length} recent bookings:\n`);

    for (const [index, booking] of bookings.entries()) {
      // Get customer email from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', booking.customer_id)
        .single();

      let customerEmail = 'Unknown';
      if (profile?.user_id) {
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
        customerEmail = user?.email || 'Unknown';
      }

      console.log(`${index + 1}. Booking ${booking.id.substring(0, 8)}...`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Amount: $${booking.total_price}`);
      console.log(`   Customer: ${customerEmail}`);
      console.log(`   Provider: ${booking.provider?.business_name || 'Unknown'}`);
      console.log(`   Provider Stripe: ${booking.provider?.stripe_account_id ? '✅' : '❌'}`);
      console.log(`   Created: ${new Date(booking.created_at).toLocaleString()}`);
      console.log('');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check bookings:', error.message);
    return false;
  }
}

async function checkPaymentRecords() {
  console.log('\n🔍 Checking Payment Records...\n');
  
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log(`Found ${payments.length} recent payment records:\n`);
    
    for (const payment of payments) {
      console.log(`Payment ${payment.id.substring(0, 8)}...`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Amount: $${payment.amount}`);
      console.log(`   Stripe Payment Intent: ${payment.stripe_payment_intent_id}`);
      console.log(`   Created: ${new Date(payment.created_at).toLocaleString()}`);
      
      // Check Stripe status
      if (payment.stripe_payment_intent_id) {
        try {
          const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
          console.log(`   Stripe Status: ${intent.status}`);
          if (intent.last_payment_error) {
            console.log(`   ❌ Error: ${intent.last_payment_error.message}`);
          }
        } catch (e) {
          console.log(`   ⚠️  Could not retrieve from Stripe: ${e.message}`);
        }
      }
      console.log('');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check payments:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Stripe Payment Diagnostic Tool');
  console.log('═══════════════════════════════════════════════════');

  const results = {
    stripeConnection: await testStripeConnection(),
    paymentIntent: await testPaymentIntent(),
    providers: await checkProviderStripeAccounts(),
    bookings: await checkRecentBookings(),
    payments: await checkPaymentRecords(),
  };

  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Summary');
  console.log('═══════════════════════════════════════════════════\n');

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n✅ All tests passed! Stripe integration looks good.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

runAllTests().catch(console.error);

