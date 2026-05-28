import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushPayload {
  target_user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type?: 'booking' | 'message' | 'review' | 'payment' | 'system';
}

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
    const payload: PushPayload = await req.json();
    const { target_user_id, title, body, data = {}, type = 'system' } = payload;

    if (!target_user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch all active device tokens for this user
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', target_user_id);

    if (tokensError) {
      console.error('[send-push-notification] Error fetching tokens:', tokensError);
    }

    const expoTokens = (tokens || [])
      .map((t: { token: string }) => t.token)
      .filter((t: string) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['));

    // 2. Send via Expo Push API if we have tokens
    let pushResults: unknown[] = [];
    if (expoTokens.length > 0) {
      const messages = expoTokens.map((expoPushToken: string) => ({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: { ...data, type },
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
      console.log('[send-push-notification] Expo response:', JSON.stringify(expoData));

      // Remove invalid tokens (DeviceNotRegistered)
      const resultsArray = Array.isArray(pushResults) ? pushResults : [pushResults];
      for (let i = 0; i < resultsArray.length; i++) {
        const result = resultsArray[i] as { status?: string; details?: { error?: string } };
        if (
          result?.status === 'error' &&
          result?.details?.error === 'DeviceNotRegistered'
        ) {
          const badToken = expoTokens[i];
          if (badToken) {
            await supabase
              .from('device_tokens')
              .delete()
              .eq('token', badToken);
            console.log('[send-push-notification] Removed stale token:', badToken);
          }
        }
      }
    } else {
      console.log('[send-push-notification] No Expo tokens found for user:', target_user_id);
    }

    // 3. Always write a row to the notifications table so the in-app screen shows it
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: target_user_id,
        type,
        title,
        message: body,
        is_read: false,
        related_id: (data?.bookingId as string) || (data?.providerId as string) || null,
      });

    if (notifError) {
      console.error('[send-push-notification] Error inserting notification row:', notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tokens_found: expoTokens.length,
        push_results: pushResults,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    console.error('[send-push-notification] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
