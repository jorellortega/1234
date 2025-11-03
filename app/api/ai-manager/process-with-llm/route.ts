import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper to check if user is admin
async function checkAdminRole(request: NextRequest) {
  try {
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { isAdmin: false, user: null, error: 'Authorization header required' }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token)
    
    if (userError || !user) {
      return { isAdmin: false, user: null, error: 'Authentication required' }
    }

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Check user role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { isAdmin: false, user, error: 'User profile not found' }
    }

    return { 
      isAdmin: userProfile.role === 'admin', 
      user, 
      error: null 
    }
  } catch (error) {
    console.error('Error checking admin role:', error)
    return { 
      isAdmin: false, 
      user: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Get OpenAI API key from database
async function getOpenAIApiKey(supabase: any, userId: string | null = null) {
  // First try system-wide key
  const { data: systemApiKey } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .is('user_id', null)
    .eq('service_id', 'openai')
    .eq('is_active', true)
    .maybeSingle()

  if (systemApiKey?.encrypted_key) {
    return systemApiKey.encrypted_key
  }

  // Then try user-specific key if userId provided
  if (userId) {
    const { data: userApiKey } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('service_id', 'openai')
      .eq('is_active', true)
      .maybeSingle()

    if (userApiKey?.encrypted_key) {
      return userApiKey.encrypted_key
    }
  }

  // Fallback to environment variable
  return process.env.OPENAI_API_KEY || null
}

// Map model names to OpenAI model IDs
function getModelId(modelName: string): string {
  const modelMap: Record<string, string> = {
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4-turbo': 'gpt-4-turbo',
    'gpt-4': 'gpt-4',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
    'o1': 'o1',
    'o1-mini': 'o1-mini',
    'o1-preview': 'o1-preview',
    'openai': 'gpt-3.5-turbo',
    'gpt': 'gpt-4'
  }
  return modelMap[modelName] || 'gpt-4o'
}

// POST - Process prompt with LLM to generate intelligent tasks (admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { user_prompt, llm_model, rules, context } = body

    if (!user_prompt) {
      return NextResponse.json({ error: 'user_prompt is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get OpenAI API key
    const apiKey = await getOpenAIApiKey(supabase, user.id)
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not found. Please add your API key in AI Settings.' 
      }, { status: 400 })
    }

    // Get model ID
    const modelId = getModelId(llm_model || 'gpt-4o')

    // Build system prompt with rules and context
    let systemPrompt = `You are an AI Manager that helps users organize and execute complex tasks. 
Your job is to:
1. Understand the user's intent from their prompt
2. Break down the request into actionable tasks
3. Apply any rules and guidelines provided
4. Consider user preferences and context

Generate a JSON response with this structure:
{
  "detected_intent": "string (generate_image, generate_video, generate_text, generate_audio, complex_task)",
  "intent_category": "string (image, video, text, audio, multi_step)",
  "confidence_score": number (0.0-1.0),
  "tasks": [
    {
      "task_title": "string",
      "task_description": "string",
      "task_type": "generate_image|generate_video|generate_text|generate_audio|process_data|other",
      "ai_service": "string (openai, runway, elevenlabs, etc.)",
      "ai_model": "string (specific model name)",
      "task_params": {
        "prompt": "processed prompt with rules applied",
        "count": number
      },
      "priority": number (1-10),
      "order_index": number
    }
  ],
  "processed_prompt": "string (original prompt with rules applied)"
}`

    // Add rules to system prompt
    if (rules && rules.length > 0) {
      const activeRules = rules.filter((r: any) => r.is_active)
      if (activeRules.length > 0) {
        systemPrompt += '\n\n## Rules and Guidelines:\n'
        activeRules.forEach((rule: any, index: number) => {
          systemPrompt += `${index + 1}. [${rule.rule_type.toUpperCase()}] ${rule.rule_content}\n`
          if (rule.description) {
            systemPrompt += `   Note: ${rule.description}\n`
          }
        })
        systemPrompt += '\nIMPORTANT: Apply these rules when processing prompts. Replace words, exclude terms, or follow guidelines as specified.'
      }
    }

    // Add context to system prompt
    if (context && context.length > 0) {
      const applicableContext = context.filter((c: any) => 
        c.scope === 'global' && (!c.expires_at || new Date(c.expires_at) > new Date())
      )
      if (applicableContext.length > 0) {
        systemPrompt += '\n\n## User Context and Preferences:\n'
        applicableContext.forEach((ctx: any) => {
          const ctxValue = typeof ctx.context_value === 'string' 
            ? ctx.context_value 
            : JSON.stringify(ctx.context_value)
          systemPrompt += `- ${ctx.context_key}: ${ctxValue}\n`
        })
        systemPrompt += '\nConsider these preferences when generating tasks.'
      }
    }

    // Build user message
    const userMessage = `User Request: "${user_prompt}"\n\nAnalyze this request and generate appropriate tasks. Apply all rules and consider user context.`

    // Call OpenAI API
    let response
    try {
      if (modelId.startsWith('o1')) {
        // O1 models use different endpoint
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        })

        if (!openaiResponse.ok) {
          const errorData = await openaiResponse.json().catch(() => ({}))
          throw new Error(`OpenAI API error: ${openaiResponse.status} - ${JSON.stringify(errorData)}`)
        }

        response = await openaiResponse.json()
      } else {
        // Standard GPT models
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: 'json_object' }
          })
        })

        if (!openaiResponse.ok) {
          const errorData = await openaiResponse.json().catch(() => ({}))
          throw new Error(`OpenAI API error: ${openaiResponse.status} - ${JSON.stringify(errorData)}`)
        }

        response = await openaiResponse.json()
      }
    } catch (error: any) {
      console.error('OpenAI API error:', error)
      return NextResponse.json({ 
        error: 'Failed to process with LLM',
        details: error.message 
      }, { status: 500 })
    }

    // Parse response
    const content = response.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ 
        error: 'No response from LLM' 
      }, { status: 500 })
    }

    // Try to parse JSON from response
    let parsedResponse
    try {
      // Extract JSON from response if it's wrapped in markdown or text
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        parsedResponse = JSON.parse(content)
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract key information manually
      console.error('Failed to parse LLM response as JSON:', parseError)
      return NextResponse.json({ 
        error: 'Failed to parse LLM response',
        raw_response: content 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      result: parsedResponse,
      model_used: modelId,
      raw_response: content
    })
  } catch (error) {
    console.error('Error in POST /api/ai-manager/process-with-llm:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

