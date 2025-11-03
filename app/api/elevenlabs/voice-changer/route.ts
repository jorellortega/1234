import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const voice_id = formData.get('voice_id') as string;
    const model_id = formData.get('model_id') as string || 'eleven_multilingual_sts_v2';
    const stability = parseFloat(formData.get('stability') as string) || 1.0;
    const style = parseFloat(formData.get('style') as string) || 0.0;
    const remove_background_noise = formData.get('remove_background_noise') === 'true';

    if (!audioFile || !voice_id) {
      return NextResponse.json({ 
        error: "Audio file and voice ID are required" 
      }, { status: 400 });
    }

    // Validate file size (max ~50MB as a reasonable limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({ 
        error: "Audio file is too large. Maximum size is 50MB." 
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

    // Prepare form data for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('audio', audioFile);
    elevenLabsFormData.append('voice_id', voice_id);
    elevenLabsFormData.append('model_id', model_id);
    elevenLabsFormData.append('voice_settings', JSON.stringify({
      stability: stability,
      style: style,
      similarity_boost: 0.75,
      use_speaker_boost: true
    }));
    
    if (remove_background_noise) {
      elevenLabsFormData.append('remove_background_noise', 'true');
    }

    // Call ElevenLabs speech-to-speech API
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-speech', {
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

    // Get the converted audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Upload to Supabase Storage
    const fileName = `Infinito-VoiceChanged-${Date.now()}.mp3`;
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
      audio: publicUrl,
      voice_id: voice_id,
      model_id: model_id,
      message: "Voice changed successfully!"
    });

  } catch (error) {
    console.error('Voice changer error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to change voice" 
    }, { status: 500 });
  }
}

