import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PushType = 'booking' | 'message' | 'review' | 'payment' | 'system';

interface PushPayload {
  target_user_id: string;
  title: string;
  body: string;
  type?: PushType;
  data?: Record<string, unknown>;
}

const pushEnabledForType = (preferences: any, type?: PushType): boolean => {
  if (!type) return true;

  switch (type) {
    case 'booking':
      return Boolean(preferences?.push_new_booking ?? true);
    case 'message':
      return Boolean(preferences?.push_new_message ?? true);
    case 'review':
      return Boolean(preferences?.push_new_review ?? true);
    case 'payment':
      return Boolean(preferences?.push_payment_received ?? true);
    case 'system':
    default:
      return true;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as PushPayload;

    if (!payload?.target_user_id || !payload?.title || !payload?.body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.type !== 'booking') {
      return new Response(JSON.stringify({ error: 'Only booking notifications are allowed via this endpoint' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bookingId = String(payload.data?.bookingId || '');
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId is required for booking push notifications' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: actorProfile, error: actorProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (actorProfileError || !actorProfile) {
      return new Response(JSON.stringify({ error: 'Actor profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, provider_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (actorProfile.id !== booking.customer_id && actorProfile.id !== booking.provider_id) {
      return new Response(JSON.stringify({ error: 'Not authorized for this booking' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const counterpartProfileId =
      actorProfile.id === booking.customer_id ? booking.provider_id : booking.customer_id;

    const { data: counterpartProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', counterpartProfileId)
      .single();

    if (!counterpartProfile?.user_id || counterpartProfile.user_id !== payload.target_user_id) {
      return new Response(JSON.stringify({ error: 'Target user does not match booking counterpart' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.target_user_id)
      .maybeSingle();

    if (!pushEnabledForType(prefs, payload.type)) {
      return new Response(JSON.stringify({ success: true, skipped: 'preferences_disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokenRows, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', payload.target_user_id)
      .eq('is_active', true);

    if (tokenError) {
      return new Response(JSON.stringify({ error: tokenError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokens = (tokenRows || []).map((row: any) => row.token).filter(Boolean);

    if (!tokens.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: 'no_tokens' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: 'high',
      channelId: 'default',
    }));

    const expoResp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoJson = await expoResp.json();

    if (Array.isArray(expoJson?.data)) {
      const invalidTokenIndexes: number[] = [];

      expoJson.data.forEach((ticket: any, index: number) => {
        if (
          ticket?.status === 'error' &&
          ticket?.details?.error === 'DeviceNotRegistered'
        ) {
          invalidTokenIndexes.push(index);
        }
      });

      if (invalidTokenIndexes.length > 0) {
        const invalidTokens = invalidTokenIndexes.map((index) => tokens[index]).filter(Boolean);
        if (invalidTokens.length > 0) {
          await supabase
            .from('device_tokens')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in('token', invalidTokens);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: tokens.length, expo: expoJson }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
