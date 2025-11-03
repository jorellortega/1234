import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Get individual agent details
export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agentId = params.agentId;

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

    // Get agent details from ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/agents/${agentId}`, {
      headers: {
        'xi-api-key': elevenLabsApiKey,
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // If endpoint doesn't exist yet, return agent ID as placeholder
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          agent_id: agentId,
          message: "Agent details endpoint not yet available. Using default settings."
        });
      }
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || response.statusText}` 
      }, { status: response.status });
    }

    const agentData = await response.json();
    
    return NextResponse.json({
      success: true,
      ...agentData
    });

  } catch (error) {
    console.error('Agent fetch error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch agent" 
    }, { status: 500 });
  }
}

