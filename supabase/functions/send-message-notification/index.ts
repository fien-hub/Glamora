// Supabase Edge Function to send push notifications for new messages
// Deploy with: supabase functions deploy send-message-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessagePayload {
  message_id: string;
  booking_id?: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  image_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const payload: MessagePayload = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.sender_id !== user.id) {
      return new Response(JSON.stringify({ error: 'sender_id does not match authenticated user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get sender profile by auth user_id first, fallback to direct profile id
    let senderProfile: any = null;

    const { data: senderByUserId } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', payload.sender_id)
      .maybeSingle();

    senderProfile = senderByUserId;

    if (!senderProfile) {
      const { data: senderByProfileId } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', payload.sender_id)
        .maybeSingle();
      senderProfile = senderByProfileId;
    }

    if (!senderProfile) {
      return new Response(JSON.stringify({ error: 'Sender not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Receiver ID in messages is auth user id; fallback supports profile id by resolving user_id
    let receiverUserId = payload.receiver_id;

    const { data: receiverByProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', payload.receiver_id)
      .maybeSingle();

    if (receiverByProfile?.user_id) {
      receiverUserId = receiverByProfile.user_id;
    }

    // Get receiver active device tokens
    const { data: receiverTokens } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', receiverUserId)
      .eq('is_active', true);

    const tokens = (receiverTokens || []).map((row: any) => row.token).filter(Boolean);

    if (!tokens.length) {
      return new Response(
        JSON.stringify({ message: 'Receiver has no active push token' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare notification message
    const messagePreview = payload.image_url
      ? '📷 Sent an image'
      : payload.message.length > 50
      ? payload.message.substring(0, 50) + '...'
      : payload.message;

    // Send push notifications to all active device tokens
    const pushMessages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: `New message from ${senderProfile.full_name || 'Someone'}`,
      body: messagePreview,
      data: {
        type: 'message',
        bookingId: payload.booking_id,
        messageId: payload.message_id,
        senderId: payload.sender_id,
      },
      priority: 'high',
      channelId: 'default',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessages),
    });

    const result = await response.json();

    // Deactivate invalid tokens
    if (Array.isArray(result?.data)) {
      const invalidTokenIndexes: number[] = [];

      result.data.forEach((ticket: any, index: number) => {
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

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

