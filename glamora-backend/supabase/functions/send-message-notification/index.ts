import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { message_id, booking_id, sender_id, receiver_id, message, image_url } = await req.json();

    if (!sender_id || !receiver_id) {
      return new Response(JSON.stringify({ error: 'Missing sender_id or receiver_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Get sender's display name from profiles
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', sender_id)
      .single();

    const senderName = senderProfile
      ? `${senderProfile.first_name} ${senderProfile.last_name}`.trim()
      : 'Someone';

    const notifTitle = senderName;
    const notifBody = image_url ? '📷 Sent a photo' : (message || '');

    // 2. Fetch all active device tokens for the receiver
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', receiver_id);

    if (tokensError) {
      console.error('[send-message-notification] Error fetching tokens:', tokensError);
    }

    const expoTokens = (tokens || [])
      .map((t: { token: string }) => t.token)
      .filter((t: string) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['));

    // 3. Send push via Expo if tokens exist
    let pushResults: unknown[] = [];
    if (expoTokens.length > 0) {
      const messages = expoTokens.map((expoPushToken: string) => ({
        to: expoPushToken,
        sound: 'default',
        title: notifTitle,
        body: notifBody,
        data: {
          type: 'message',
          messageId: message_id,
          bookingId: booking_id,
          senderId: sender_id,
        },
      }));

      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      const expoData = await expoRes.json();
      pushResults = expoData?.data || [];
      console.log('[send-message-notification] Expo response:', JSON.stringify(expoData));

      // Remove stale tokens
      const resultsArray = Array.isArray(pushResults) ? pushResults : [pushResults];
      for (let i = 0; i < resultsArray.length; i++) {
        const result = resultsArray[i] as { status?: string; details?: { error?: string } };
        if (result?.status === 'error' && result?.details?.error === 'DeviceNotRegistered') {
          const badToken = expoTokens[i];
          if (badToken) {
            await supabase.from('device_tokens').delete().eq('token', badToken);
            console.log('[send-message-notification] Removed stale token:', badToken);
          }
        }
      }
    } else {
      console.log('[send-message-notification] No Expo tokens found for receiver:', receiver_id);
    }

    // 4. Insert in-app notification row for the receiver
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type: 'message',
        title: notifTitle,
        message: notifBody,
        is_read: false,
        related_id: booking_id || null,
      });

    if (notifError) {
      console.error('[send-message-notification] Error inserting notification row:', notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tokens_found: expoTokens.length,
        push_results: pushResults,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-message-notification] Unhandled error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
