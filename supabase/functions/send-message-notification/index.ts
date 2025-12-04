// Supabase Edge Function to send push notifications for new messages
// Deploy with: supabase functions deploy send-message-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface MessagePayload {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  image_url?: string;
}

serve(async (req) => {
  try {
    // Parse request body
    const payload: MessagePayload = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get sender's name
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payload.sender_id)
      .single();

    if (!senderProfile) {
      return new Response(JSON.stringify({ error: 'Sender not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get receiver's push token
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', payload.receiver_id)
      .single();

    if (!receiverProfile || !receiverProfile.push_token) {
      return new Response(
        JSON.stringify({ message: 'Receiver has no push token' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare notification message
    const messagePreview = payload.image_url
      ? '📷 Sent an image'
      : payload.message.length > 50
      ? payload.message.substring(0, 50) + '...'
      : payload.message;

    // Send push notification
    const pushMessage = {
      to: receiverProfile.push_token,
      sound: 'default',
      title: `New message from ${senderProfile.full_name}`,
      body: messagePreview,
      data: {
        type: 'message',
        messageId: payload.message_id,
        senderId: payload.sender_id,
      },
      priority: 'high',
      channelId: 'default',
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessage),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

