// Supabase Edge Function: request-refund
// Called when a paid booking is cancelled (by customer or provider).
// Creates a refund_requests record and emails the admin team.
//
// Deploy with: supabase functions deploy request-refund

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY          = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAIL             = Deno.env.get('ADMIN_EMAIL') ?? 'admin@glamora.com'

interface RefundRequest {
  bookingId:   string
  cancelledBy: 'customer' | 'provider'
  reason?:     string
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: RefundRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { bookingId, cancelledBy, reason } = body

  if (!bookingId || !cancelledBy) {
    return new Response(JSON.stringify({ error: 'bookingId and cancelledBy are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Use service role so we can read all booking data regardless of RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 1. Fetch the booking — verify it was paid
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      provider_id,
      total_price,
      payment_status,
      payment_intent_id,
      scheduled_date,
      scheduled_time,
      services ( name )
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (booking.payment_status !== 'paid') {
    // Nothing to refund — booking was never charged
    return new Response(JSON.stringify({ refundRequired: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Guard against duplicate refund requests for the same booking
  const { data: existing } = await supabase
    .from('refund_requests')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (existing) {
    return new Response(
      JSON.stringify({ refundRequired: true, alreadyRequested: true, refundRequestId: existing.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 3. Insert refund request record (service_role bypasses RLS)
  const { data: refundRecord, error: insertError } = await supabase
    .from('refund_requests')
    .insert({
      booking_id:        bookingId,
      customer_id:       booking.customer_id,
      provider_id:       booking.provider_id,
      amount_cents:      booking.total_price,       // stored in cents
      payment_intent_id: booking.payment_intent_id,
      cancelled_by:      cancelledBy,
      reason:            reason ?? null,
      status:            'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[request-refund] Failed to insert refund_request:', insertError)
    return new Response(JSON.stringify({ error: 'Failed to log refund request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Fetch customer + provider display names for the admin email
  const [{ data: customerProfile }, { data: providerProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', booking.customer_id)
      .single(),
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', booking.provider_id)
      .single(),
  ])

  const customerName = customerProfile
    ? `${customerProfile.first_name} ${customerProfile.last_name}`
    : 'Unknown customer'
  const providerName = providerProfile
    ? `${providerProfile.first_name} ${providerProfile.last_name}`
    : 'Unknown provider'
  const serviceName  = (booking as any).services?.name ?? 'Service'
  const amountDollars = (booking.total_price / 100).toFixed(2)

  // 5. Email admin via Resend (best-effort — don't fail the request if email fails)
  if (RESEND_API_KEY) {
    const html = `
      <h2>Refund Request — Action Required</h2>
      <table cellpadding="8" style="border-collapse:collapse;width:100%">
        <tr><td><strong>Refund Request ID</strong></td><td>${refundRecord.id}</td></tr>
        <tr><td><strong>Booking ID</strong></td><td>${bookingId}</td></tr>
        <tr><td><strong>Date</strong></td><td>${booking.scheduled_date} ${booking.scheduled_time}</td></tr>
        <tr><td><strong>Service</strong></td><td>${serviceName}</td></tr>
        <tr><td><strong>Customer</strong></td><td>${customerName}${customerProfile?.email ? ` (${customerProfile.email})` : ''}</td></tr>
        <tr><td><strong>Provider</strong></td><td>${providerName}</td></tr>
        <tr><td><strong>Amount</strong></td><td>$${amountDollars}</td></tr>
        <tr><td><strong>RevenueCat TX ID</strong></td><td>${booking.payment_intent_id ?? '—'}</td></tr>
        <tr><td><strong>Cancelled by</strong></td><td>${cancelledBy}</td></tr>
        <tr><td><strong>Reason</strong></td><td>${reason ?? '—'}</td></tr>
      </table>
      <br>
      <p>
        To issue the refund, look up the transaction in the
        <a href="https://app.revenuecat.com">RevenueCat dashboard</a> or process via
        <a href="https://appstoreconnect.apple.com">App Store Connect</a>.
        Update the <code>refund_requests</code> row status to <code>approved</code> / <code>refunded</code>
        once actioned.
      </p>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Glamora <notifications@glamora.com>',
        to:      ADMIN_EMAIL,
        subject: `[Refund Request] ${customerName} — $${amountDollars} — ${serviceName}`,
        html,
      }),
    }).catch((emailErr) => {
      console.error('[request-refund] Admin email failed (non-fatal):', emailErr)
    })
  }

  return new Response(
    JSON.stringify({ refundRequired: true, refundRequestId: refundRecord.id }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
