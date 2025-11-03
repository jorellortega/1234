import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const files = formData.getAll('files') as File[];
    const cloneType = formData.get('clone_type') as string || 'instant'; // 'instant' or 'professional'

    if (!name || !files || files.length === 0) {
      return NextResponse.json({ error: "Name and audio files are required" }, { status: 400 });
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

    // Prepare form data for ElevenLabs
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('name', name);
    
    // Add files
    files.forEach((file) => {
      elevenLabsFormData.append('files', file);
    });

    // Call ElevenLabs voice cloning API
    const cloneEndpoint = cloneType === 'professional' 
      ? 'https://api.elevenlabs.io/v1/voice-cloning/create-voice-professional'
      : 'https://api.elevenlabs.io/v1/voice-cloning/add-voice';

    const response = await fetch(cloneEndpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || response.statusText}` 
      }, { status: response.status });
    }

    const voiceData = await response.json();
    
    return NextResponse.json({
      success: true,
      voice: voiceData,
      message: `Voice "${name}" cloned successfully!`
    });

  } catch (error) {
    console.error('Voice cloning error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to clone voice" 
    }, { status: 500 });
  }
}

