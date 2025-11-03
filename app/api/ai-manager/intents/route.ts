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

// GET - Fetch intents for the user (admin only)
export async function GET(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('ai_manager_intents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (category) {
      query = query.eq('intent_category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching intents:', error)
      return NextResponse.json({ error: 'Failed to fetch intents' }, { status: 500 })
    }

    return NextResponse.json({ intents: data || [] })
  } catch (error) {
    console.error('Error in GET /api/ai-manager/intents:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create a new intent (detect intent from user prompt) (admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      user_prompt,
      page_context,
      session_id
    } = body

    if (!user_prompt) {
      return NextResponse.json({ error: 'user_prompt is required' }, { status: 400 })
    }

    // TODO: Use AI to detect intent - for now, basic keyword detection
    const detectedIntent = detectIntentFromPrompt(user_prompt)
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data, error } = await supabase
      .from('ai_manager_intents')
      .insert({
        user_id: user.id,
        user_prompt,
        detected_intent: detectedIntent.intent,
        intent_category: detectedIntent.category,
        confidence_score: detectedIntent.confidence,
        extracted_params: detectedIntent.params,
        page_context: page_context || null,
        session_id: session_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating intent:', error)
      return NextResponse.json({ error: 'Failed to create intent', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ intent: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ai-manager/intents:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Basic intent detection function (can be enhanced with AI later)
function detectIntentFromPrompt(prompt: string): {
  intent: string
  category: string
  confidence: number
  params: Record<string, any>
} {
  const lowerPrompt = prompt.toLowerCase()
  const params: Record<string, any> = {}

  // Image generation
  if (
    lowerPrompt.includes('image') || 
    lowerPrompt.includes('picture') || 
    lowerPrompt.includes('photo') ||
    lowerPrompt.includes('draw') ||
    lowerPrompt.includes('create image') ||
    lowerPrompt.includes('generate image')
  ) {
    // Extract count if mentioned
    const countMatch = lowerPrompt.match(/(\d+)\s*(?:images?|pictures?|photos?)/)
    if (countMatch) {
      params.count = parseInt(countMatch[1])
    }

    return {
      intent: 'generate_image',
      category: 'image',
      confidence: 0.85,
      params
    }
  }

  // Video generation - only if explicitly mentioned
  // Don't assume "skit" means video - skits are usually text/scripts first
  if (
    (lowerPrompt.includes('video') && (lowerPrompt.includes('create') || lowerPrompt.includes('generate') || lowerPrompt.includes('make'))) ||
    lowerPrompt.includes('create video') ||
    lowerPrompt.includes('generate video') ||
    lowerPrompt.includes('make a video') ||
    lowerPrompt.includes('produce video')
  ) {
    const countMatch = lowerPrompt.match(/(\d+)\s*videos?/)
    if (countMatch) {
      params.count = parseInt(countMatch[1])
    }

    return {
      intent: 'generate_video',
      category: 'video',
      confidence: 0.85,
      params
    }
  }

  // "Skit" is ambiguous - could be text, script, or video concept
  // Default to text unless video is explicitly mentioned
  if (lowerPrompt.includes('skit') && !lowerPrompt.includes('video') && !lowerPrompt.includes('create video')) {
    return {
      intent: 'generate_text',
      category: 'text',
      confidence: 0.70,
      params: { ...params, needs_clarification: true, clarification_reason: 'skit could be text, script, or video' }
    }
  }

  // Audio generation
  if (
    lowerPrompt.includes('audio') ||
    lowerPrompt.includes('voice') ||
    lowerPrompt.includes('speech') ||
    lowerPrompt.includes('text to speech') ||
    lowerPrompt.includes('tts')
  ) {
    return {
      intent: 'generate_audio',
      category: 'audio',
      confidence: 0.85,
      params
    }
  }

  // Text generation or question
  if (
    lowerPrompt.startsWith('what') ||
    lowerPrompt.startsWith('how') ||
    lowerPrompt.startsWith('why') ||
    lowerPrompt.startsWith('when') ||
    lowerPrompt.startsWith('where') ||
    lowerPrompt.startsWith('explain') ||
    lowerPrompt.startsWith('tell me')
  ) {
    return {
      intent: 'ask_question',
      category: 'text',
      confidence: 0.80,
      params
    }
  }

  // Complex multi-step task
  if (
    lowerPrompt.includes('start a company') ||
    lowerPrompt.includes('create a company') ||
    lowerPrompt.includes('and then') ||
    lowerPrompt.includes('then create') ||
    (lowerPrompt.split(' ').length > 20 && (
      lowerPrompt.includes('create') ||
      lowerPrompt.includes('make') ||
      lowerPrompt.includes('generate')
    ))
  ) {
    return {
      intent: 'complex_task',
      category: 'multi_step',
      confidence: 0.75,
      params
    }
  }

  // Default: general text generation
  return {
    intent: 'generate_text',
    category: 'text',
    confidence: 0.60,
    params
  }
}

