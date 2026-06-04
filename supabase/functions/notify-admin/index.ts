// Supabase Edge Function — send push notifications to all admin users
// Deploy with: supabase functions deploy notify-admin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AdminEventType = 'provider_signup' | 'service_added';

interface AdminNotifyPayload {
  title: string;
  body: string;
  event_type: AdminEventType;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: AdminNotifyPayload = await req.json();

    if (!payload?.title || !payload?.body || !payload?.event_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: title, body, event_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller is an authenticated Supabase user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role so RLS doesn't block reading other users' rows
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find all admin user IDs
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error querying admin users:', adminError.message);
      return new Response(JSON.stringify({ error: 'Failed to query admin users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!adminUsers?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: 'no_admins_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminUserIds = adminUsers.map((u: any) => u.id);

    // Fetch all active device tokens for admin users
    const { data: tokenRows, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token')
      .in('user_id', adminUserIds)
      .eq('is_active', true);

    if (tokenError) {
      console.error('Error fetching admin tokens:', tokenError.message);
    }

    const tokens = (tokenRows || []).map((row: any) => row.token).filter(Boolean);

    if (!tokens.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: 'no_admin_device_tokens' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = tokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, type: 'admin', event_type: payload.event_type },
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

    // Mark invalid tokens as inactive
    if (Array.isArray(expoJson?.data)) {
      const invalidTokens: string[] = [];
      expoJson.data.forEach((ticket: any, index: number) => {
        if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(tokens[index]);
        }
      });
      if (invalidTokens.length) {
        await supabase
          .from('device_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('token', invalidTokens);
      }
    }

    return new Response(JSON.stringify({ success: true, sent: tokens.length, expo: expoJson }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('notify-admin error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
