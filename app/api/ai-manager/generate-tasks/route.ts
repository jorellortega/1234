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

// POST - Generate task list from user prompt and intent (admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { intent_id, user_prompt, use_llm = false, llm_model = 'gpt-4o', answers, allow_questions = true } = body

    if (!intent_id && !user_prompt) {
      return NextResponse.json({ error: 'intent_id or user_prompt is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    let intent
    if (intent_id) {
      // Fetch existing intent
      const { data: intentData, error: intentError } = await supabase
        .from('ai_manager_intents')
        .select('*')
        .eq('id', intent_id)
        .eq('user_id', user.id)
        .single()

      if (intentError || !intentData) {
        return NextResponse.json({ error: 'Intent not found' }, { status: 404 })
      }

      intent = intentData
    } else {
      // Create new intent from prompt
      // This is a simplified version - in production, you'd use AI to detect intent
      const detectedIntent = detectIntentFromPrompt(user_prompt)
      
      const { data: newIntent, error: intentError } = await supabase
        .from('ai_manager_intents')
        .insert({
          user_id: user.id,
          user_prompt,
          detected_intent: detectedIntent.intent,
          intent_category: detectedIntent.category,
          confidence_score: detectedIntent.confidence,
          extracted_params: detectedIntent.params
        })
        .select()
        .single()

      if (intentError) {
        return NextResponse.json({ error: 'Failed to create intent', details: intentError.message }, { status: 500 })
      }

      intent = newIntent
    }

    // Fetch user's rules and context to inform task generation
    const { data: rules } = await supabase
      .from('ai_manager_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const { data: context } = await supabase
      .from('ai_manager_context')
      .select('*')
      .eq('user_id', user.id)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    let tasks: any[] = []
    let processedPrompt = intent.user_prompt

    // If LLM processing is enabled, use AI to generate tasks
    if (use_llm) {
      try {
        // Build enhanced prompt with answers if provided
        let enhancedPrompt = intent.user_prompt
        if (answers && Array.isArray(answers) && answers.length > 0) {
          const answerText = answers.map((a: any) => `${a.field}: ${a.value}`).join(', ')
          enhancedPrompt += ` [Additional context: ${answerText}]`
        }
        
        // Call LLM processing function directly
        const llmResult = await processWithLLM(
          enhancedPrompt,
          llm_model,
          rules || [],
          context || [],
          user.id,
          supabase,
          allow_questions
        )

        if (llmResult && llmResult.result) {
          // Use LLM-generated tasks
          processedPrompt = llmResult.result.processed_prompt || intent.user_prompt
          
          // Update intent with LLM results
          if (llmResult.result.detected_intent) {
            await supabase
              .from('ai_manager_intents')
              .update({
                detected_intent: llmResult.result.detected_intent,
                intent_category: llmResult.result.intent_category,
                confidence_score: llmResult.result.confidence_score || intent.confidence_score,
                user_prompt: processedPrompt,
                extracted_params: { 
                  ...intent.extracted_params, 
                  llm_processed: true, 
                  model_used: llm_model,
                  needs_clarification: llmResult.result.needs_clarification || false
                }
              })
              .eq('id', intent.id)
            
            intent.detected_intent = llmResult.result.detected_intent
            intent.intent_category = llmResult.result.intent_category
            intent.confidence_score = llmResult.result.confidence_score || intent.confidence_score
            intent.user_prompt = processedPrompt
          }

          // If LLM says clarification is needed AND questions are allowed, save questions instead of tasks
          if (allow_questions && llmResult.result.needs_clarification && llmResult.result.questions && llmResult.result.questions.length > 0) {
            const questionsToInsert = llmResult.result.questions.map((q: any) => ({
              user_id: user.id,
              intent_id: intent.id,
              question_text: q.question_text || q.question,
              question_type: q.question_type || 'clarification',
              is_required: q.is_required !== undefined ? q.is_required : true,
              related_field: q.related_field || null,
              priority: q.priority || 5,
              status: 'pending'
            }))

            const { data: insertedQuestions, error: questionsError } = await supabase
              .from('ai_manager_questions')
              .insert(questionsToInsert)
              .select()

            if (questionsError) {
              console.error('Error inserting questions:', questionsError)
            }

            // Return early with questions (with actual database IDs), no tasks yet
            return NextResponse.json({ 
              intent,
              needs_clarification: true,
              questions: insertedQuestions || questionsToInsert,
              tasks: []
            }, { status: 201 })
          }

          // Convert LLM tasks to our format
          tasks = (llmResult.result.tasks || []).map((task: any, index: number) => ({
            task_title: task.task_title || `Task ${index + 1}`,
            task_description: task.task_description || task.task_params?.prompt || processedPrompt,
            task_type: task.task_type || 'other',
            ai_service: task.ai_service || null,
            ai_model: task.ai_model || null,
            task_params: task.task_params || { prompt: processedPrompt },
            status: 'pending',
            priority: task.priority || 5,
            order_index: task.order_index !== undefined ? task.order_index : index
          }))
        }
      } catch (llmError) {
        console.error('LLM processing error, falling back to basic processing:', llmError)
        // Fall through to basic processing
      }
    }

    // If LLM didn't generate tasks, use basic processing
    if (tasks.length === 0) {
      // Apply rules to modify the prompt before generating tasks
      if (rules && rules.length > 0) {
        processedPrompt = applyRulesToPrompt(processedPrompt, rules)
        // Update intent with processed prompt if it was modified
        if (processedPrompt !== intent.user_prompt) {
          await supabase
            .from('ai_manager_intents')
            .update({ 
              user_prompt: processedPrompt,
              extracted_params: { ...intent.extracted_params, original_prompt: intent.user_prompt, processed: true }
            })
            .eq('id', intent.id)
          intent.user_prompt = processedPrompt
        }
      }

      // Generate tasks based on intent
      tasks = generateTasksFromIntent(intent, rules || [], context || [])
    }

    // Save tasks to database
    const tasksWithIntent = tasks.map((task: any) => ({
      ...task,
      intent_id: intent.id
    }))

    const { data: savedTasks, error: tasksError } = await supabase
      .from('ai_manager_tasks')
      .insert(tasksWithIntent)
      .select()

    if (tasksError) {
      console.error('Error saving tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to save tasks', details: tasksError.message }, { status: 500 })
    }

    // Check if there are pending questions for this intent
    const { data: pendingQuestions } = await supabase
      .from('ai_manager_questions')
      .select('*')
      .eq('intent_id', intent.id)
      .eq('status', 'pending')
      .order('priority', { ascending: false })

    return NextResponse.json({ 
      intent,
      tasks: savedTasks || tasks,
      needs_clarification: (pendingQuestions && pendingQuestions.length > 0) || false,
      questions: pendingQuestions || []
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ai-manager/generate-tasks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to process with LLM (extracted from process-with-llm route)
async function processWithLLM(
  user_prompt: string,
  llm_model: string,
  rules: any[],
  context: any[],
  userId: string,
  supabase: any,
  allow_questions: boolean = true
): Promise<any> {
  // Get OpenAI API key
  let apiKey = null
  
  // Try system-wide key
  const { data: systemApiKey } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .is('user_id', null)
    .eq('service_id', 'openai')
    .eq('is_active', true)
    .maybeSingle()

  if (systemApiKey?.encrypted_key) {
    apiKey = systemApiKey.encrypted_key
  } else {
    // Try user-specific key
    const { data: userApiKey } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('service_id', 'openai')
      .eq('is_active', true)
      .maybeSingle()

    if (userApiKey?.encrypted_key) {
      apiKey = userApiKey.encrypted_key
    } else {
      apiKey = process.env.OPENAI_API_KEY || null
    }
  }

  if (!apiKey) {
    throw new Error('OpenAI API key not found')
  }

  // Get model ID
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
  const modelId = modelMap[llm_model] || 'gpt-4o'

  // Build system prompt
  let questionModeText = ''
  if (allow_questions) {
    questionModeText = `
2. If the user's request is missing critical information (like dates, names, specific details), set "needs_clarification" to true and generate questions to ask. For ambiguous requests like "skit", "story", "script" - ask if they want it as text, video, or audio before assuming. Only generate tasks if you have enough information, otherwise ask questions first.
3. For ambiguous requests like "skit", "story", "script" - ask if they want it as text, video, or audio before assuming.
4. Only generate tasks if you have enough information, otherwise ask questions first.

Example: "I want a birthday skit" should:
- Ask: "Do you want this as a text script, video content, or audio?" (if not clear)
- Ask: "When is the birthday?"
- Ask: "What style/theme do you want?"
- NOT assume video unless user explicitly says "video" or "create video" or "make a video"`;
  } else {
    questionModeText = `
2. If information is missing, make reasonable assumptions and proceed with task generation. Do not ask questions - just generate tasks with best available information. Set "needs_clarification" to false.
3. For ambiguous requests like "skit", "story", "script" - default to text generation unless video is explicitly mentioned.
4. Generate tasks even with limited information - make best guesses when needed.

Example: "I want a birthday skit" should:
- Default to text/script generation
- Use reasonable defaults for missing information (e.g., generic birthday date)
- Generate tasks based on available context
- Do NOT set needs_clarification to true`;
  }
  
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
  "needs_clarification": boolean (${allow_questions ? 'true if missing information prevents task generation' : 'should always be false'}),
  "questions": [
    {
      "question_text": "string (the question to ask)",
      "question_type": "clarification|missing_info|preference|confirmation|context",
      "is_required": boolean (true if answer is needed before proceeding),
      "related_field": "string (what information this is about, e.g., 'birthday_date', 'company_name')",
      "priority": number (1-10)
    }
  ],
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
}

IMPORTANT RULES:
1. Be careful with intent detection - don't assume video unless explicitly requested. 
2. If the user explicitly says "script" or "text" or "text script", they want TEXT GENERATION - do NOT ask about format. Only ask about format if the request is ambiguous.
3. "Skit" with "script" mentioned = text generation. "Skit" alone = might need clarification unless context is clear.
4. ${questionModeText}`

  // Add rules
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

  // Add context
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

  const userMessage = `User Request: "${user_prompt}"\n\nAnalyze this request and generate appropriate tasks. Apply all rules and consider user context.`

  // Call OpenAI
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
      ...(modelId.startsWith('o1') ? {} : { response_format: { type: 'json_object' } })
    })
  })

  if (!openaiResponse.ok) {
    const errorData = await openaiResponse.json().catch(() => ({}))
    throw new Error(`OpenAI API error: ${openaiResponse.status} - ${JSON.stringify(errorData)}`)
  }

  const response = await openaiResponse.json()
  const content = response.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('No response from LLM')
  }

  // Parse JSON
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
    return { result: parsedResponse }
  } catch (parseError) {
    throw new Error(`Failed to parse LLM response: ${parseError}`)
  }
}

// Basic intent detection (same as in intents route)
function detectIntentFromPrompt(prompt: string): {
  intent: string
  category: string
  confidence: number
  params: Record<string, any>
} {
  const lowerPrompt = prompt.toLowerCase()
  const params: Record<string, any> = {}

  // Check for explicit video requests first (more specific)
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

  // Check for explicit image requests
  if (
    lowerPrompt.includes('image') || 
    lowerPrompt.includes('picture') || 
    lowerPrompt.includes('photo') ||
    (lowerPrompt.includes('create') && (lowerPrompt.includes('image') || lowerPrompt.includes('picture'))) ||
    (lowerPrompt.includes('generate') && (lowerPrompt.includes('image') || lowerPrompt.includes('picture')))
  ) {
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

  // "Skit" with "script" explicitly mentioned should be treated as text generation
  if (lowerPrompt.includes('skit') && (lowerPrompt.includes('script') || lowerPrompt.includes('text script'))) {
    return {
      intent: 'generate_text',
      category: 'text',
      confidence: 0.90,
      params
    }
  }

  // "Skit" without explicit script/text/video is ambiguous - default to text
  if (lowerPrompt.includes('skit') && !lowerPrompt.includes('video') && !lowerPrompt.includes('create video') && !lowerPrompt.includes('script') && !lowerPrompt.includes('text')) {
    // Skit is ambiguous - could be text, script, or video concept
    // Default to text generation unless video is explicitly mentioned
    return {
      intent: 'generate_text',
      category: 'text',
      confidence: 0.70,
      params: { ...params, needs_clarification: true, clarification_reason: 'skit could be text, script, or video' }
    }
  }

  if (lowerPrompt.includes('audio') || lowerPrompt.includes('voice') || lowerPrompt.includes('speech')) {
    return {
      intent: 'generate_audio',
      category: 'audio',
      confidence: 0.85,
      params
    }
  }

  if (
    lowerPrompt.includes('start a company') ||
    lowerPrompt.includes('create a company') ||
    (lowerPrompt.includes('and then') && lowerPrompt.split(' ').length > 15)
  ) {
    return {
      intent: 'complex_task',
      category: 'multi_step',
      confidence: 0.75,
      params
    }
  }

  return {
    intent: 'generate_text',
    category: 'text',
    confidence: 0.60,
    params
  }
}

// Apply rules to prompt (word replacements, exclusions, etc.)
function applyRulesToPrompt(prompt: string, rules: any[]): string {
  let processedPrompt = prompt
  const activeRules = rules.filter(r => r.is_active)
  
  // Sort rules by priority (higher priority first)
  activeRules.sort((a, b) => b.priority - a.priority)
  
  for (const rule of activeRules) {
    const ruleContent = rule.rule_content.toLowerCase()
    const ruleType = rule.rule_type
    
    // Word replacement rules
    if (ruleType === 'guideline' || ruleType === 'user_preference') {
      // Check if rule contains replacement pattern like "don't use X use Y instead"
      const replacePattern = /(?:don't|dont|do not|never)\s+use\s+(?:the\s+word\s+)?["']?([^"']+)["']?\s+(?:use|replace\s+with|replace\s+it\s+with)\s+(?:the\s+word\s+)?["']?([^"']+)["']?/gi
      const match = ruleContent.match(replacePattern)
      if (match) {
        const fullMatch = match[0]
        const wordMatch = fullMatch.match(/(?:don't|dont|do not|never)\s+use\s+(?:the\s+word\s+)?["']?([^"']+)["']?\s+(?:use|replace\s+with|replace\s+it\s+with)\s+(?:the\s+word\s+)?["']?([^"']+)["']?/i)
        if (wordMatch && wordMatch.length >= 3) {
          const oldWord = wordMatch[1].trim()
          const newWord = wordMatch[2].trim()
          // Replace all occurrences (case-insensitive)
          const regex = new RegExp(`\\b${oldWord}\\b`, 'gi')
          processedPrompt = processedPrompt.replace(regex, newWord)
        }
      }
      
      // Also check rule content for direct "word to word" patterns
      const directReplace = ruleContent.match(/(["']?)(\w+)\1\s+(?:to|->|→)\s+(\w+)/i)
      if (directReplace) {
        const oldWord = directReplace[2]
        const newWord = directReplace[3]
        const regex = new RegExp(`\\b${oldWord}\\b`, 'gi')
        processedPrompt = processedPrompt.replace(regex, newWord)
      }
    }
    
    // Exclusion rules - check if prompt contains excluded words
    if (ruleType === 'exclusion') {
      const excludePattern = /(?:don't|dont|do not|never)\s+use\s+["']?([^"']+)["']?/gi
      const excludeMatch = ruleContent.match(excludePattern)
      if (excludeMatch) {
        const excludeWords = excludeMatch.map(m => {
          const wordMatch = m.match(/(?:don't|dont|do not|never)\s+use\s+["']?([^"']+)["']?/i)
          return wordMatch ? wordMatch[1].trim() : null
        }).filter(Boolean)
        
        for (const word of excludeWords) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi')
          if (processedPrompt.match(regex)) {
            // Remove excluded word
            processedPrompt = processedPrompt.replace(regex, '')
            // Clean up extra spaces
            processedPrompt = processedPrompt.replace(/\s+/g, ' ').trim()
          }
        }
      }
    }
  }
  
  return processedPrompt
}

// Generate tasks from intent, considering rules and context
function generateTasksFromIntent(
  intent: any,
  rules: any[],
  context: any[]
): any[] {
  const tasks: any[] = []
  const intentCategory = intent.intent_category
  const extractedParams = intent.extracted_params || {}
  
  // Get processed prompt (rules should have been applied earlier, but use it if available)
  let taskPrompt = intent.user_prompt

  // Apply rules and context
  const applicableRules = rules.filter(r => 
    r.is_active && (r.applies_to.includes(intentCategory) || r.applies_to.includes('all'))
  )

  const applicableContext = context.filter(c =>
    (c.scope === 'global' || c.scope === 'task_specific') && 
    (!c.expires_at || new Date(c.expires_at) > new Date())
  )
  
  // Apply context preferences to modify prompt
  for (const ctx of applicableContext) {
    if (ctx.context_type === 'preference' || ctx.context_type === 'instruction') {
      const ctxValue = typeof ctx.context_value === 'string' 
        ? ctx.context_value 
        : JSON.stringify(ctx.context_value)
      
      // If context mentions style, tone, or specific requirements, append to prompt
      if (ctxValue && !ctxValue.includes('model') && !ctxValue.includes('service')) {
        taskPrompt += ` (${ctxValue})`
      }
    }
    
    // Apply exclusions from context
    if (ctx.context_type === 'exclusion') {
      const excludeWords = typeof ctx.context_value === 'string'
        ? ctx.context_value.split(',').map(w => w.trim())
        : ctx.context_value
      
      if (Array.isArray(excludeWords)) {
        for (const word of excludeWords) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi')
          taskPrompt = taskPrompt.replace(regex, '').replace(/\s+/g, ' ').trim()
        }
      }
    }
  }

  // Generate tasks based on intent type
  switch (intent.detected_intent) {
    case 'generate_image':
      tasks.push({
        task_title: 'Generate Image',
        task_description: taskPrompt, // Use processed prompt
        task_type: 'generate_image',
        ai_service: 'openai', // Default, can be overridden by rules
        ai_model: 'dall-e-3',
        task_params: {
          prompt: taskPrompt, // Use processed prompt
          count: extractedParams.count || 1
        },
        status: 'pending',
        priority: 7,
        order_index: 0
      })
      break

    case 'generate_video':
      tasks.push({
        task_title: 'Generate Video',
        task_description: taskPrompt, // Use processed prompt
        task_type: 'generate_video',
        ai_service: 'runway',
        ai_model: 'gen4-turbo',
        task_params: {
          prompt: taskPrompt, // Use processed prompt
          count: extractedParams.count || 1
        },
        status: 'pending',
        priority: 7,
        order_index: 0
      })
      break

    case 'complex_task':
      // Parse complex prompts like "start a company, create a logo, make 5 flyers"
      const prompt = taskPrompt.toLowerCase()
      
      // Extract logo task
      if (prompt.includes('logo')) {
        tasks.push({
          task_title: 'Create Logo',
          task_description: 'Generate logo for the company',
          task_type: 'generate_image',
          ai_service: 'openai',
          ai_model: 'dall-e-3',
          task_params: { prompt: 'Create a professional company logo' },
          status: 'pending',
          priority: 8,
          order_index: 0
        })
      }

      // Extract flyer task
      const flyerMatch = prompt.match(/(\d+)\s*flyers?/)
      if (flyerMatch) {
        const count = parseInt(flyerMatch[1])
        for (let i = 0; i < count; i++) {
          tasks.push({
            task_title: `Create Flyer ${i + 1}`,
            task_description: 'Generate promotional flyer',
            task_type: 'generate_image',
            ai_service: 'openai',
            ai_model: 'dall-e-3',
            task_params: { prompt: 'Create a professional promotional flyer' },
            status: 'pending',
            priority: 7,
            order_index: tasks.length
          })
        }
      }

      // Extract video task
      const videoMatch = prompt.match(/(\d+)\s*videos?/)
      if (videoMatch) {
        const count = parseInt(videoMatch[1])
        for (let i = 0; i < count; i++) {
          tasks.push({
            task_title: `Create Video ${i + 1}`,
            task_description: 'Generate promotional video',
            task_type: 'generate_video',
            ai_service: 'runway',
            ai_model: 'gen4-turbo',
            task_params: { prompt: 'Create a professional promotional video' },
            status: 'pending',
            priority: 7,
            order_index: tasks.length
          })
        }
      }

      // Extract audio/text-to-speech task
      if (prompt.includes('audio') || prompt.includes('voice') || prompt.includes('paragraphs')) {
        tasks.push({
          task_title: 'Generate Audio from Text',
          task_description: 'Convert text to speech',
          task_type: 'generate_audio',
          ai_service: 'elevenlabs',
          task_params: { text: 'Generated promotional content' },
          status: 'pending',
          priority: 6,
          order_index: tasks.length
        })
      }

      break

    default:
      // Default: simple text generation
      tasks.push({
        task_title: 'Process Request',
        task_description: taskPrompt, // Use processed prompt
        task_type: 'generate_text',
        task_params: { prompt: taskPrompt }, // Use processed prompt
        status: 'pending',
        priority: 5,
        order_index: 0
      })
  }

  // Apply user preferences from context
  applicableContext.forEach(ctx => {
    if (ctx.context_type === 'preference' && ctx.context_key.includes('model')) {
      // Override default models with user preferences
      tasks.forEach(task => {
        if (ctx.context_value.model) {
          task.ai_model = ctx.context_value.model
        }
        if (ctx.context_value.service) {
          task.ai_service = ctx.context_value.service
        }
      })
    }
  })

  return tasks
}

