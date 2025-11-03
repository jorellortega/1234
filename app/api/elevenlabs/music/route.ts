import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, duration, vocals, instrumental, language } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ 
        error: "Prompt is required" 
      }, { status: 400 });
    }

    // Validate duration (10 seconds to 5 minutes)
    const durationSeconds = duration || 60; // Default 60 seconds
    if (durationSeconds < 10 || durationSeconds > 300) {
      return NextResponse.json({ 
        error: "Duration must be between 10 and 300 seconds (5 minutes)" 
      }, { status: 400 });
    }

    // Create Supabase client for authentication
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Create service role client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Get ElevenLabs API key
    let apiKeyData = null;
    const { data: userApiKey } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('service_id', 'elevenlabs')
      .eq('is_active', true)
      .maybeSingle();

    if (userApiKey) {
      apiKeyData = userApiKey;
    } else {
      const { data: systemApiKey } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .is('user_id', null)
        .eq('service_id', 'elevenlabs')
        .eq('is_active', true)
        .maybeSingle();

      if (systemApiKey) {
        apiKeyData = systemApiKey;
      }
    }

    if (!apiKeyData) {
      return NextResponse.json({ 
        error: "ElevenLabs API key not found. Please configure it in AI Settings." 
      }, { status: 400 });
    }

    const elevenLabsApiKey = apiKeyData.encrypted_key;

    // Build request body for ElevenLabs Music API
    const requestBody: any = {
      prompt: prompt,
      duration: durationSeconds,
    };

    // Add optional parameters
    if (vocals !== undefined) {
      requestBody.vocals = vocals;
    }
    if (instrumental !== undefined) {
      requestBody.instrumental = instrumental;
    }
    if (language) {
      requestBody.language = language;
    }

    // Call ElevenLabs Music API
    // Note: This endpoint may not be publicly available yet according to docs
    // Using the expected API structure based on ElevenLabs patterns
    const response = await fetch('https://api.elevenlabs.io/v1/music/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle case where API might not be available yet
      if (response.status === 404 || response.status === 501) {
        return NextResponse.json({ 
          error: "Eleven Music API is not yet publicly available. Please check ElevenLabs documentation for updates." 
        }, { status: 503 });
      }
      
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || response.statusText}` 
      }, { status: response.status });
    }

    // Get the audio data (assuming it returns audio/mpeg)
    const audioBuffer = await response.arrayBuffer();
    
    // Upload to Supabase Storage
    const fileName = `Infinito-Music-${Date.now()}.mp3`;
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
        prompt: prompt,
        duration: durationSeconds,
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
      audio: publicUrl,
      prompt: prompt,
      duration: durationSeconds,
      message: "Music generated successfully!"
    });

  } catch (error) {
    console.error('Music generation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to generate music" 
    }, { status: 500 });
  }
}

