import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const bodyParams = await req.json();
    const { text } = bodyParams;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Create Supabase client with anon key for user authentication
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }

    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Get admin preferences for audio settings
    const { data: adminPrefs } = await supabase
      .from('admin_preferences')
      .select(`
        elevenlabs_voice_id,
        elevenlabs_model_id,
        elevenlabs_stability,
        elevenlabs_similarity_boost,
        elevenlabs_style,
        elevenlabs_use_speaker_boost,
        audio_output_format,
        audio_optimize_streaming_latency
      `)
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    // Use body params if provided, otherwise use admin preferences, otherwise use defaults
    const voice_id = bodyParams.voice_id || adminPrefs?.elevenlabs_voice_id || "EXAVITQu4vr4xnSDxMaL";
    const model_id = bodyParams.model_id || adminPrefs?.elevenlabs_model_id || "eleven_multilingual_v2";
    const stability = bodyParams.stability ?? adminPrefs?.elevenlabs_stability ?? 0.50;
    const similarity_boost = bodyParams.similarity_boost ?? adminPrefs?.elevenlabs_similarity_boost ?? 0.75;
    const style = bodyParams.style ?? adminPrefs?.elevenlabs_style ?? 0.00;
    const use_speaker_boost = bodyParams.use_speaker_boost ?? adminPrefs?.elevenlabs_use_speaker_boost ?? true;
    const output_format = bodyParams.output_format || adminPrefs?.audio_output_format || "mp3_44100_128";
    const optimize_streaming_latency = bodyParams.optimize_streaming_latency ?? adminPrefs?.audio_optimize_streaming_latency ?? 0;

    // Get ElevenLabs API key - first try user's personal key, then system-wide key
    let apiKeyData = null;
    
    // First, try to get user's personal API key
    const { data: userApiKey, error: userApiKeyError } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('service_id', 'elevenlabs')
      .eq('is_active', true)
      .maybeSingle();

    if (userApiKey && !userApiKeyError) {
      apiKeyData = userApiKey;
    } else {
      // If no user key, try system-wide key
      const { data: systemApiKey, error: systemApiKeyError } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .is('user_id', null)
        .eq('service_id', 'elevenlabs')
        .eq('is_active', true)
        .maybeSingle();

      if (systemApiKey && !systemApiKeyError) {
        apiKeyData = systemApiKey;
      }
    }

    if (!apiKeyData) {
      return NextResponse.json({ 
        error: "ElevenLabs API key not found. Please configure it in AI Settings or contact admin to set system-wide key." 
      }, { status: 400 });
    }

    const elevenLabsApiKey = apiKeyData.encrypted_key;

    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: model_id,
        voice_settings: {
          stability: stability,
          similarity_boost: similarity_boost,
          style: style,
          use_speaker_boost: use_speaker_boost
        },
        output_format: output_format,
        optimize_streaming_latency: optimize_streaming_latency
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || response.statusText}` 
      }, { status: response.status });
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Upload to Supabase Storage
    const fileName = `Infinito-Audio-${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('media-files')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Fall back to base64 if upload fails
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      return NextResponse.json({
        success: true,
        audio: `data:audio/mpeg;base64,${audioBase64}`,
        text: text,
        voice_id: voice_id,
        model_id: model_id
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('media-files')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
      audio: publicUrl, // Legacy support
      text: text,
      voice_id: voice_id,
      model_id: model_id
    });

  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to generate speech" 
    }, { status: 500 });
  }
}

// Get available voices
export async function GET(req: NextRequest) {
  try {
    // Create Supabase client with anon key for user authentication
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }

    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Get ElevenLabs API key - first try user's personal key, then system-wide key
    let apiKeyData = null;
    
    // First, try to get user's personal API key
    const { data: userApiKey, error: userApiKeyError } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('service_id', 'elevenlabs')
      .eq('is_active', true)
      .maybeSingle();

    if (userApiKey && !userApiKeyError) {
      apiKeyData = userApiKey;
    } else {
      // If no user key, try system-wide key
      const { data: systemApiKey, error: systemApiKeyError } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .is('user_id', null)
        .eq('service_id', 'elevenlabs')
        .eq('is_active', true)
        .maybeSingle();

      if (systemApiKey && !systemApiKeyError) {
        apiKeyData = systemApiKey;
      }
    }

    if (!apiKeyData) {
      return NextResponse.json({ 
        error: "ElevenLabs API key not found. Please configure it in AI Settings or contact admin to set system-wide key." 
      }, { status: 400 });
    }

    const elevenLabsApiKey = apiKeyData.encrypted_key;

    // Get available voices from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': elevenLabsApiKey,
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || response.statusText}` 
      }, { status: response.status });
    }

    const voicesData = await response.json();
    
    return NextResponse.json({
      success: true,
      voices: voicesData.voices || []
    });

  } catch (error) {
    console.error('Voices Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch voices" 
    }, { status: 500 });
  }
}
