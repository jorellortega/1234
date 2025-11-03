import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, selectedText, fullContent, sceneContext, contentType, service, apiKey } = body

    if (!prompt || !service) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, service' },
        { status: 400 }
      )
    }

    // Get actual API keys from environment variables or database
    let actualApiKey = apiKey
    if (apiKey === 'use_env_vars' || !apiKey) {
      if (service === 'openai') {
        // Try to get from database first
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
          
          // Try system-wide key first
          const { data: systemApiKey } = await supabase
            .from('api_keys')
            .select('encrypted_key')
            .is('user_id', null)
            .eq('service_id', 'openai')
            .eq('is_active', true)
            .maybeSingle()

          if (systemApiKey?.encrypted_key) {
            actualApiKey = systemApiKey.encrypted_key
          } else if (process.env.OPENAI_API_KEY) {
            actualApiKey = process.env.OPENAI_API_KEY
          }
        } else if (process.env.OPENAI_API_KEY) {
          actualApiKey = process.env.OPENAI_API_KEY
        }
      } else if (service === 'anthropic') {
        // Try to get from database first
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
          
          // Try system-wide key first
          const { data: systemApiKey } = await supabase
            .from('api_keys')
            .select('encrypted_key')
            .is('user_id', null)
            .eq('service_id', 'anthropic')
            .eq('is_active', true)
            .maybeSingle()

          if (systemApiKey?.encrypted_key) {
            actualApiKey = systemApiKey.encrypted_key
          } else if (process.env.ANTHROPIC_API_KEY) {
            actualApiKey = process.env.ANTHROPIC_API_KEY
          }
        } else if (process.env.ANTHROPIC_API_KEY) {
          actualApiKey = process.env.ANTHROPIC_API_KEY
        }
      }
    }

    if (!actualApiKey) {
      return NextResponse.json(
        { error: `API key not configured for ${service}` },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a professional screenwriter and editor. Your task is to modify a specific portion of text within a larger script or scene.

CONTEXT:
- Full Scene Content: ${fullContent || 'N/A'}
${sceneContext ? `- Scene Context: ${sceneContext}` : ''}
- Content Type: ${contentType || 'script'}

TASK:
- Original Selected Text: "${selectedText}"
- User Request: "${prompt}"

INSTRUCTIONS:
1. Generate ONLY the replacement text for the selected portion
2. Maintain consistency with the surrounding content and style
3. Ensure the new text flows naturally with the rest of the scene
4. Keep the same approximate length unless specifically requested otherwise
5. Preserve any formatting, dialogue tags, or script conventions
6. Do NOT include the full scene or surrounding text - only the replacement

RESPONSE FORMAT:
Return ONLY the new text that should replace the selected portion, nothing else.`

    const userPrompt = `Please modify this text: "${selectedText}"

User's request: ${prompt}

Generate only the replacement text:`

    let generatedText = ""

    if (service === 'openai') {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${actualApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}))
        throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`)
      }

      const result = await openaiResponse.json()
      generatedText = result.choices?.[0]?.message?.content || ''

    } else if (service === 'anthropic') {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': actualApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            { role: "user", content: `${systemPrompt}\n\n${userPrompt}` }
          ],
        }),
      })

      if (!anthropicResponse.ok) {
        const errorData = await anthropicResponse.json().catch(() => ({}))
        throw new Error(`Anthropic API error: ${errorData.error?.message || anthropicResponse.statusText}`)
      }

      const result = await anthropicResponse.json()
      generatedText = result.content?.[0]?.text || ''
    }

    if (!generatedText) {
      throw new Error('No text was generated from the AI service')
    }

    return NextResponse.json({ 
      success: true, 
      text: generatedText,
      service: service.toUpperCase()
    })

  } catch (error) {
    console.error('AI text generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

