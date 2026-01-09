// Supabase Edge Function for creating Grok Realtime sessions
// This securely creates ephemeral session tokens without exposing API keys

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SessionRequest {
  model?: string;
  voice?: string;
  instructions?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get API key from environment (never exposed to client)
    const XAI_API_KEY = Deno.env.get('XAI_API_KEY');

    if (!XAI_API_KEY || XAI_API_KEY === 'your_xai_api_key_here') {
      console.error('XAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: SessionRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine, use defaults
    }

    const requestedVoice = body.voice;
    const voice = (requestedVoice === 'Ara' || requestedVoice === 'Sal' || requestedVoice === 'Eve')
      ? requestedVoice
      : 'Ara';
    const instructions = body.instructions || `You are Talksy, a friendly and helpful AI voice assistant. 
You are conversational, warm, and helpful. Keep responses concise but informative.
When users ask questions, provide clear and accurate answers.
Be natural in your responses as if having a real conversation.`;

    // Create ephemeral token with xAI Realtime API
    // Endpoint: POST https://api.x.ai/v1/realtime/client_secrets
    const sessionResponse = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 }, // Token expires after 5 minutes
      }),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('xAI API error:', sessionResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to create realtime session',
          details: errorText
        }),
        { status: sessionResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionData = await sessionResponse.json();
    console.log('xAI API response:', JSON.stringify(sessionData));

    // xAI returns { value: "token", expires_at: timestamp } directly
    // We need to check for the 'value' field which contains the token
    const tokenValue = sessionData.value || sessionData.client_secret?.value;
    
    if (!tokenValue) {
      console.error('No token value in xAI response:', sessionData);
      return new Response(
        JSON.stringify({
          error: 'No token received from xAI API',
          details: JSON.stringify(sessionData)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Ephemeral token created successfully');

    // Return ephemeral token along with voice/instruction config
    // Wrap in client_secret format for client compatibility
    return new Response(
      JSON.stringify({
        client_secret: {
          value: tokenValue,
          expires_at: sessionData.expires_at,
        },
        voice,
        instructions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
