import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Update agent settings
export async function PUT(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agentId = params.agentId;
    const body = await req.json();
    const {
      system_prompt,
      voice_id,
      language,
      model_id,
      tools,
      knowledge_base,
      conversation_flow,
      personalization
    } = body;

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

    // Build update payload
    const updatePayload: any = {};
    if (system_prompt !== undefined) updatePayload.system_prompt = system_prompt;
    if (voice_id !== undefined) updatePayload.voice_id = voice_id;
    if (language !== undefined) updatePayload.language = language;
    if (model_id !== undefined) updatePayload.model_id = model_id;
    if (tools !== undefined) updatePayload.tools = tools;
    if (knowledge_base !== undefined) updatePayload.knowledge_base = knowledge_base;
    if (conversation_flow !== undefined) updatePayload.conversation_flow = conversation_flow;
    if (personalization !== undefined) updatePayload.personalization = personalization;

    // Update agent settings via ElevenLabs API
    // Note: Actual endpoint structure may vary
    const response = await fetch(`https://api.elevenlabs.io/v1/agents/${agentId}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle case where API might not be available yet
      if (response.status === 404 || response.status === 501) {
        return NextResponse.json({ 
          error: "Agent settings API is not yet publicly available. Please update settings in the ElevenLabs dashboard." 
        }, { status: 503 });
      }
      
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || response.statusText}` 
      }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: "Agent settings updated successfully",
      ...data
    });

  } catch (error) {
    console.error('Agent settings update error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update agent settings" 
    }, { status: 500 });
  }
}

