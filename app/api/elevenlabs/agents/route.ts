import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Get available agents
export async function GET(req: NextRequest) {
  try {
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

    // Get agents from ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/agents', {
      headers: {
        'xi-api-key': elevenLabsApiKey,
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // If endpoint doesn't exist yet, return empty array
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          agents: [],
          message: "Agents API not yet available. Please check ElevenLabs documentation for updates."
        });
      }
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || response.statusText}` 
      }, { status: response.status });
    }

    const agentsData = await response.json();
    
    return NextResponse.json({
      success: true,
      agents: agentsData.agents || agentsData || []
    });

  } catch (error) {
    console.error('Agents fetch error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch agents" 
    }, { status: 500 });
  }
}

// Create or start conversation with agent
export async function POST(req: NextRequest) {
  try {
    // Check if request has FormData (for audio) or JSON
    const contentType = req.headers.get('content-type') || '';
    let agent_id: string;
    let message: string | null = null;
    let conversation_id: string | null = null;
    let audio: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      agent_id = formData.get('agent_id')?.toString() || '';
      message = formData.get('message')?.toString() || null;
      conversation_id = formData.get('conversation_id')?.toString() || null;
      audio = formData.get('audio') as File | null;
    } else {
      const body = await req.json();
      agent_id = body.agent_id || '';
      message = body.message || null;
      conversation_id = body.conversation_id || null;
      // Note: audio in JSON would be base64, which we'll handle differently if needed
    }

    if (!agent_id) {
      return NextResponse.json({ 
        error: "Agent ID is required" 
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

    // Start conversation or send message
    // Note: This is a placeholder - actual API endpoint structure may vary
    const endpoint = conversation_id 
      ? `https://api.elevenlabs.io/v1/agents/${agent_id}/conversations/${conversation_id}/messages`
      : `https://api.elevenlabs.io/v1/agents/${agent_id}/conversations`;

    let response: Response;
    
    // Handle audio file or text message
    if (audio && audio instanceof File) {
      // Send as FormData for audio
      const formData = new FormData();
      if (message) {
        formData.append('message', message);
      }
      formData.append('audio', audio);
      
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
        body: formData,
      });
    } else {
      // Send as JSON for text
      const requestBody: any = {};
      if (message) {
        requestBody.message = message;
      }
      
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify(requestBody),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle case where API might not be available yet
      if (response.status === 404 || response.status === 501) {
        return NextResponse.json({ 
          error: "Agents Platform API is not yet publicly available. Please check ElevenLabs documentation for updates." 
        }, { status: 503 });
      }
      
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || response.statusText}` 
      }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      conversation_id: data.conversation_id || conversation_id,
      response: data.response || data.message,
      audio: data.audio,
      ...data
    });

  } catch (error) {
    console.error('Agent conversation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to interact with agent" 
    }, { status: 500 });
  }
}

