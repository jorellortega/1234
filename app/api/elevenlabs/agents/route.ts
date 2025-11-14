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

    // Get ElevenLabs API key - prioritize user's API key
    let apiKeyData = null;
    let usingUserKey = false;
    
    const { data: userApiKey } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('service_id', 'elevenlabs')
      .eq('is_active', true)
      .maybeSingle();

    if (userApiKey) {
      apiKeyData = userApiKey;
      usingUserKey = true;
      console.log(`Using user's ElevenLabs API key for user ${user.id}`);
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
        console.log('Using system ElevenLabs API key');
      }
    }

    if (!apiKeyData) {
      return NextResponse.json({ 
        error: "ElevenLabs API key not found. Please configure it in AI Settings." 
      }, { status: 400 });
    }

    const elevenLabsApiKey = apiKeyData.encrypted_key;

    // Get agents from ElevenLabs API
    // Try different possible endpoints
    const endpoints = [
      'https://api.elevenlabs.io/v1/agents',
      'https://api.elevenlabs.io/v1/convai/agents',
      'https://api.elevenlabs.io/v1/convai',
    ];
    
    let response: Response | null = null;
    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        response = await fetch(endpoint, {
          headers: {
            'xi-api-key': elevenLabsApiKey,
          }
        });
        
        if (response.ok) {
          console.log(`Success with endpoint: ${endpoint}`);
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log(`Endpoint ${endpoint} returned ${response.status}:`, errorData);
          lastError = errorData;
          response = null;
        }
      } catch (err) {
        console.log(`Error with endpoint ${endpoint}:`, err);
        lastError = err;
        response = null;
      }
    }

    if (!response || !response.ok) {
      const errorData = lastError || {};
      // If endpoint doesn't exist yet, return empty array
      if (response?.status === 404 || response?.status === 501) {
        console.log('Agents API endpoint not found (404/501)');
        return NextResponse.json({
          success: true,
          agents: [],
          message: "Agents API endpoint may not be available yet. Please check ElevenLabs documentation for updates."
        });
      }
      return NextResponse.json({ 
        error: `ElevenLabs API error: ${errorData.detail?.message || errorData.message || response?.statusText || 'Unknown error'}` 
      }, { status: response?.status || 500 });
    }

    const agentsData = await response.json();
    
    // Log the response structure for debugging
    console.log('=== ElevenLabs Agents API Response ===');
    console.log('Status:', response.status);
    console.log('Response (raw):', JSON.stringify(agentsData, null, 2));
    console.log('Response type:', typeof agentsData);
    console.log('Is array?', Array.isArray(agentsData));
    if (!Array.isArray(agentsData) && typeof agentsData === 'object' && agentsData !== null) {
      console.log('Response keys:', Object.keys(agentsData));
      console.log('Response values:', Object.values(agentsData).map(v => typeof v));
    }
    console.log('Using user API key:', usingUserKey);
    console.log('User ID:', user.id);
    console.log('=====================================');
    
    // Handle different response structures
    // The API might return: { agents: [...] } or directly an array [...]
    let agents = [];
    if (Array.isArray(agentsData)) {
      agents = agentsData;
      console.log('Response is direct array');
    } else if (agentsData && typeof agentsData === 'object') {
      // Try common property names
      if (Array.isArray(agentsData.agents)) {
        agents = agentsData.agents;
        console.log('Found agents in .agents property');
      } else if (Array.isArray(agentsData.data)) {
        agents = agentsData.data;
        console.log('Found agents in .data property');
      } else if (Array.isArray(agentsData.results)) {
        agents = agentsData.results;
        console.log('Found agents in .results property');
      } else if (Array.isArray(agentsData.items)) {
        agents = agentsData.items;
        console.log('Found agents in .items property');
      } else {
        console.log('No agents array found in response object');
        // If response has agent_id or id, it might be a single agent
        if (agentsData.agent_id || agentsData.id) {
          agents = [agentsData];
          console.log('Treating response as single agent');
        }
      }
    }
    
    console.log(`Found ${agents.length} agents for user ${user.id} (using ${usingUserKey ? 'user' : 'system'} API key)`);
    
    // Log agent IDs for debugging
    if (agents.length > 0) {
      console.log('Agent IDs:', agents.map(a => a.agent_id || a.id || 'unknown'));
    }
    
    return NextResponse.json({
      success: true,
      agents: agents,
      usingUserKey: usingUserKey,
      totalCount: agents.length
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

