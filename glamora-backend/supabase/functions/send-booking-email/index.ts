// Supabase Edge Function: send-booking-email
// Sends transactional booking emails via Resend.
//
// Supported types:
//   booking_confirmed  → to customer  (after payment)
//   booking_received   → to provider  (new booking received)
//   provider_cancelled → to customer  (provider cancelled their booking)
//   customer_cancelled → to provider  (customer cancelled their booking)
//   reminder_24h       → to customer  (called by pg_cron 24h before appointment)
//
// Deploy with: supabase functions deploy send-booking-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY           = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL               = 'Glamora <notifications@glamora.app>'

type EmailType =
  | 'booking_confirmed'
  | 'booking_received'
  | 'provider_cancelled'
  | 'customer_cancelled'
  | 'reminder_24h'

interface SendBookingEmailRequest {
  bookingId: string
  type: EmailType
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

// ─── email templates ─────────────────────────────────────────────────────────

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1a1a2e;padding:28px 40px;text-align:center;">
            <span style="font-size:26px;font-weight:700;color:#fff;letter-spacing:.5px;">Glamora</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 32px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;font-size:13px;color:#999;">
              © ${new Date().getFullYear()} Glamora · You are receiving this email because of a booking action on our platform.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function bookingConfirmedEmail(data: {
  customerName: string
  providerName: string
  serviceName: string
  date: string
  time: string
}): string {
  return wrap('Booking Confirmed – Glamora', `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">You're all set! ✅</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#555;">Hi ${data.customerName}, your booking is confirmed.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7ff;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Service</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.serviceName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Provider</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.providerName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Date &amp; Time</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${formatDate(data.date)} at ${formatTime(data.time)}</span>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#777;">We'll remind you 24 hours before your appointment. See you soon!</p>
  `)
}

function bookingReceivedEmail(data: {
  providerName: string
  customerName: string
  serviceName: string
  date: string
  time: string
}): string {
  return wrap('New Booking – Glamora', `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">New booking received 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#555;">Hi ${data.providerName}, you have a new confirmed booking.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7ff;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Service</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.serviceName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Customer</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.customerName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Date &amp; Time</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${formatDate(data.date)} at ${formatTime(data.time)}</span>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#777;">Open the Glamora app to view and manage your appointments.</p>
  `)
}

function reminder24hEmail(data: {
  customerName: string
  providerName: string
  serviceName: string
  date: string
  time: string
}): string {
  return wrap('Appointment Tomorrow – Glamora', `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">Your appointment is tomorrow ⏰</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#555;">Hi ${data.customerName}, just a reminder about your upcoming appointment.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7ff;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Service</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.serviceName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Provider</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.providerName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Date &amp; Time</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${formatDate(data.date)} at ${formatTime(data.time)}</span>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#777;">See you tomorrow! Open the Glamora app if you need to make any changes.</p>
  `)
}

function providerCancelledEmail(data: {
  customerName: string
  providerName: string
  serviceName: string
  date: string
  time: string
  wasPaid: boolean
}): string {
  const refundNote = data.wasPaid
    ? '<p style="margin:16px 0 0;font-size:14px;color:#c0392b;background:#fff5f5;border-radius:6px;padding:12px 16px;">A refund request has been logged. Our team will review it and be in touch shortly.</p>'
    : ''
  return wrap('Booking Cancelled – Glamora', `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">Booking cancelled</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#555;">Hi ${data.customerName}, unfortunately your booking has been cancelled by the provider.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7ff;border-radius:8px;padding:20px 24px;margin-bottom:4px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Service</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.serviceName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Provider</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.providerName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Was Scheduled For</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${formatDate(data.date)} at ${formatTime(data.time)}</span>
      </td></tr>
    </table>
    ${refundNote}
    <p style="margin:20px 0 0;font-size:14px;color:#777;">We're sorry for the inconvenience. Open the Glamora app to find and book another provider.</p>
  `)
}

function customerCancelledEmail(data: {
  providerName: string
  customerName: string
  serviceName: string
  date: string
  time: string
}): string {
  return wrap('Booking Cancelled by Customer – Glamora', `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">Booking cancelled</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#555;">Hi ${data.providerName}, a customer has cancelled their booking.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7ff;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Service</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.serviceName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Customer</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${data.customerName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Was Scheduled For</span><br/>
        <span style="font-size:16px;font-weight:600;color:#1a1a2e;">${formatDate(data.date)} at ${formatTime(data.time)}</span>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#777;">That time slot is now free. Open the Glamora app to update your availability if needed.</p>
  `)
}

// ─── main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: SendBookingEmailRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const { bookingId, type } = body
  if (!bookingId || !type) {
    return new Response(JSON.stringify({ error: 'bookingId and type are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Fetch all booking data we need
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      provider_id,
      scheduled_date,
      scheduled_time,
      payment_status,
      services ( name ),
      customer_profiles:profiles!customer_id ( id, email, first_name, last_name ),
      provider_profiles ( id, business_name ),
      provider_profile_email:profiles!provider_id ( id, email, first_name )
    `)
    .eq('id', bookingId)
    .single()

  if (bookingErr || !booking) {
    console.error('[send-booking-email] Booking not found:', bookingErr)
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    })
  }

  const customerProfile  = (booking as any).customer_profiles
  const providerProfile  = (booking as any).provider_profiles
  const providerEmail    = (booking as any).provider_profile_email

  const customerName     = `${customerProfile?.first_name ?? ''} ${customerProfile?.last_name ?? ''}`.trim() || 'there'
  const providerName     = providerProfile?.business_name ?? providerEmail?.first_name ?? 'your provider'
  const serviceName      = (booking as any).services?.name ?? 'your service'
  const date             = booking.scheduled_date as string
  const time             = booking.scheduled_time as string

  try {
    switch (type) {
      case 'booking_confirmed': {
        if (!customerProfile?.email) throw new Error('No customer email')
        await sendEmail(
          customerProfile.email,
          `Booking Confirmed – ${serviceName} with ${providerName}`,
          bookingConfirmedEmail({ customerName, providerName, serviceName, date, time })
        )
        break
      }

      case 'booking_received': {
        if (!providerEmail?.email) throw new Error('No provider email')
        await sendEmail(
          providerEmail.email,
          `New Booking: ${serviceName} with ${customerName}`,
          bookingReceivedEmail({ providerName, customerName, serviceName, date, time })
        )
        break
      }

      case 'reminder_24h': {
        if (!customerProfile?.email) throw new Error('No customer email')
        await sendEmail(
          customerProfile.email,
          `Reminder: ${serviceName} with ${providerName} is tomorrow`,
          reminder24hEmail({ customerName, providerName, serviceName, date, time })
        )
        break
      }

      case 'provider_cancelled': {
        if (!customerProfile?.email) throw new Error('No customer email')
        const wasPaid = booking.payment_status === 'paid'
        await sendEmail(
          customerProfile.email,
          `Your booking for ${serviceName} has been cancelled`,
          providerCancelledEmail({ customerName, providerName, serviceName, date, time, wasPaid })
        )
        break
      }

      case 'customer_cancelled': {
        if (!providerEmail?.email) throw new Error('No provider email')
        await sendEmail(
          providerEmail.email,
          `Booking Cancelled: ${serviceName} with ${customerName}`,
          customerCancelledEmail({ providerName, customerName, serviceName, date, time })
        )
        break
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify({ sent: true, type, bookingId }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(`[send-booking-email] Failed to send ${type}:`, err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
