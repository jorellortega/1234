import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Create a new agent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      system_prompt,
      voice_id,
      language,
      model_id,
      tools,
      knowledge_base,
      conversation_flow,
      personalization
    } = body;

    if (!name || !system_prompt) {
      return NextResponse.json({ 
        error: "Agent name and system prompt are required" 
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

    // Build create payload
    const createPayload: any = {
      name,
      system_prompt
    };
    
    if (voice_id) createPayload.voice_id = voice_id;
    if (language) createPayload.language = language;
    if (model_id) createPayload.model_id = model_id;
    if (tools) createPayload.tools = tools;
    if (knowledge_base) createPayload.knowledge_base = knowledge_base;
    if (conversation_flow) createPayload.conversation_flow = conversation_flow;
    if (personalization) createPayload.personalization = personalization;

    console.log('Creating agent with payload:', JSON.stringify(createPayload, null, 2));
    console.log('Using user API key:', !!userApiKey);

    // Try different possible endpoints for creating agents
    // Note: Agent creation might only be available through the dashboard
    // The API might not support programmatic agent creation yet
    const endpoints = [
      'https://api.elevenlabs.io/v1/convai/agents',
      'https://api.elevenlabs.io/v1/agents',
      'https://api.elevenlabs.io/v1/convai',
    ];
    
    let response: Response | null = null;
    let lastError: any = null;
    let lastStatus: number | null = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to create agent at: ${endpoint}`);
        const fetchResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey,
          },
          body: JSON.stringify(createPayload),
        });
        
        if (fetchResponse.ok) {
          console.log(`Success creating agent at: ${endpoint}`);
          response = fetchResponse;
          break;
        } else {
          // Read the error response before moving on
          let errorData: any = {};
          let errorText = '';
          
          try {
            errorText = await fetchResponse.text();
            console.log(`Endpoint ${endpoint} returned ${fetchResponse.status}, response text:`, errorText);
            
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText, raw: errorText };
            }
          } catch (err) {
            console.log('Error reading response body:', err);
            errorData = { message: fetchResponse.statusText };
          }
          
          console.log(`Endpoint ${endpoint} error data:`, JSON.stringify(errorData, null, 2));
          lastError = errorData;
          lastStatus = fetchResponse.status;
        }
      } catch (err) {
        console.log(`Error creating agent at ${endpoint}:`, err);
        lastError = err instanceof Error ? { message: err.message, error: err } : err;
        lastStatus = null;
      }
    }

    if (!response || !response.ok) {
      const errorData = lastError || {};
      const errorMessage = 
        errorData.detail?.message || 
        errorData.detail?.error ||
        errorData.message || 
        errorData.error || 
        (typeof errorData === 'string' ? errorData : '') ||
        (lastError instanceof Error ? lastError.message : '') ||
        'Unknown error';
      
      console.error('=== Failed to create agent ===');
      console.error('Status:', lastStatus);
      console.error('Error message:', errorMessage);
      console.error('Full error data:', JSON.stringify(errorData, null, 2));
      console.error('============================');
      
      // Provide more helpful error messages
      if (lastStatus === 405) {
        return NextResponse.json({ 
          error: "Agent creation via API is not currently supported. Please create agents in the ElevenLabs dashboard at https://elevenlabs.io/app/agents. Once created, they will appear in the agent list.",
          code: 'METHOD_NOT_ALLOWED',
          details: errorData
        }, { status: 405 });
      }
      
      if (lastStatus === 404 || lastStatus === 501) {
        return NextResponse.json({ 
          error: `Agent creation endpoint not found (${lastStatus}). The API endpoint may have changed. Error: ${errorMessage}` 
        }, { status: lastStatus });
      }
      
      if (lastStatus === 401 || lastStatus === 403) {
        return NextResponse.json({ 
          error: `Authentication failed. Please check your ElevenLabs API key. Error: ${errorMessage}` 
        }, { status: lastStatus });
      }
      
      if (lastStatus === 400) {
        return NextResponse.json({ 
          error: `Invalid request: ${errorMessage}`,
          details: errorData
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Failed to create agent: ${errorMessage}`,
        details: errorData,
        status: lastStatus
      }, { status: lastStatus || 500 });
    }

    const data = await response.json();
    
    console.log('Agent creation response:', JSON.stringify(data, null, 2));
    
    // Extract agent ID from various possible response structures
    const agentId = data.agent_id || data.id || data.agent?.agent_id || data.agent?.id || data.data?.agent_id || data.data?.id;
    
    return NextResponse.json({
      success: true,
      message: "Agent created successfully",
      agent: data.agent || data.data || data,
      agent_id: agentId
    });

  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create agent" 
    }, { status: 500 });
  }
}

