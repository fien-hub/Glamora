// Supabase Edge Function for sending custom service approval/rejection emails
// Deploy with: supabase functions deploy send-custom-service-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface EmailRequest {
  serviceId: string
  type: 'approved' | 'rejected'
  rejectionReason?: string
}

serve(async (req) => {
  try {
    // Parse request
    const { serviceId, type, rejectionReason }: EmailRequest = await req.json()

    // Validate
    if (!serviceId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1) Fetch service details (provider_id)
    const { data: service, error: serviceError } = await supabase
      .from('provider_services')
      .select('id, custom_service_name, price, provider_id')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: 'Service not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2) Fetch provider's contact email from profiles via provider_id
    const { data: providerProfile, error: providerProfileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', service.provider_id)
      .single()

    if (providerProfileError || !providerProfile) {
      return new Response(
        JSON.stringify({ error: 'Provider profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get email template
    const emailTemplate = type === 'approved' 
      ? getApprovedTemplate(service, rejectionReason)
      : getRejectedTemplate(service, rejectionReason)

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Glamora <notifications@glamora.com>',
        to: providerProfile.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    })

    if (!emailResponse.ok) {
      const error = await emailResponse.text()
      console.error('Resend API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const emailData = await emailResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailData.id,
        message: `Email sent to ${providerProfile.email}` 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function getApprovedTemplate(service: any, _rejectionReason?: string) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom Service Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #F4B5A4 0%, #D4C5E8 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 32px; color: #FFFFFF; font-weight: 700;">✨ Glamora</h1>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px;">
                            <div style="width: 80px; height: 80px; background-color: #D1FAE5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                <span style="font-size: 40px;">✅</span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <h2 style="margin: 0 0 16px; font-size: 24px; color: #1F2937; font-weight: 600; text-align: center;">
                                Your Custom Service Has Been Approved!
                            </h2>
                            <p style="margin: 0 0 24px; font-size: 16px; color: #6B7280; line-height: 1.6; text-align: center;">
                                Great news! Your custom service has been reviewed and approved. It's now visible to customers on the Glamora platform.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px; font-size: 18px; color: #1F2937; font-weight: 600;">
                                            ${service.custom_service_name}
                                        </h3>
                                        <p style="margin: 0; font-size: 14px; color: #6B7280;">
                                            <strong>Price:</strong> $${service.price.toFixed(2)}<br>
                                            <strong>Duration:</strong> ${service.duration} min<br>
                                            <strong>Status:</strong> <span style="color: #10B981;">Active</span>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 40px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                                © 2024 Glamora. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `

  return {
    subject: `✅ Your custom service "${service.custom_service_name}" has been approved!`,
    html
  }
}

function getRejectedTemplate(service: any, rejectionReason?: string) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom Service Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #F4B5A4 0%, #D4C5E8 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 32px; color: #FFFFFF; font-weight: 700;">✨ Glamora</h1>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px;">
                            <div style="width: 80px; height: 80px; background-color: #FEF3C7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                <span style="font-size: 40px;">ℹ️</span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <h2 style="margin: 0 0 16px; font-size: 24px; color: #1F2937; font-weight: 600; text-align: center;">
                                Update on Your Custom Service
                            </h2>
                            <p style="margin: 0 0 24px; font-size: 16px; color: #6B7280; line-height: 1.6; text-align: center;">
                                Thank you for submitting a custom service. After review, we're unable to approve it at this time.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <h3 style="margin: 0 0 16px; font-size: 18px; color: #1F2937; font-weight: 600;">
                                            ${service.custom_service_name}
                                        </h3>
                                        <p style="margin: 0; font-size: 14px; color: #6B7280;">
                                            <strong>Price:</strong> $${service.price.toFixed(2)}<br>
                                            <strong>Duration:</strong> ${service.duration} min<br>
                                            <strong>Status:</strong> <span style="color: #EF4444;">Not Approved</span>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            ${rejectionReason ? `
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0 0 8px; font-size: 14px; color: #92400E; font-weight: 600;">Reason:</p>
                                        <p style="margin: 0; font-size: 14px; color: #92400E; line-height: 1.6;">${rejectionReason}</p>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 40px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                                © 2024 Glamora. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `

  return {
    subject: `Update on your custom service "${service.custom_service_name}"`,
    html
  }
}

