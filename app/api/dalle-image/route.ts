import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Image Generation API using DALL-E 3
 * 
 * Using OpenAI's DALL-E 3 for high-quality text-to-image generation
 * 
 * Pricing Structure:
 * - DALL-E API Cost: ~5 credits per image (estimated)
 * - User Cost: 13 credits per image (60% markup)
 * - Profit Margin: 8 credits per image
 * 
 * Note: Credits are deducted by the frontend before calling this API
 */

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    try {
      // Get OpenAI API key from the database
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
          { error: 'Database not configured. Please check your Supabase setup.' },
          { status: 500 }
        )
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
      
      // Get the OpenAI API key from the database
      const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
        .from('api_keys')
        .select('encrypted_key')
        .eq('service_id', 'openai')
        .eq('is_active', true)
        .maybeSingle()
      
      if (apiKeyError || !apiKeyData) {
        return NextResponse.json(
          { error: 'OpenAI API key not found. Please add your OpenAI API key in the AI Settings page.' },
          { status: 500 }
        )
      }

      const openaiApiKey = apiKeyData.encrypted_key
      
      // Call OpenAI DALL-E 3 API for high-quality image generation
      const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "url"
        })
      })

      if (!dalleResponse.ok) {
        const errorData = await dalleResponse.json().catch(() => ({}))
        throw new Error(`DALL-E API error: ${errorData.error?.message || dalleResponse.statusText}`)
      }

      const dalleData = await dalleResponse.json()
      const imageUrl = dalleData.data?.[0]?.url
      
      if (!imageUrl) {
        throw new Error('No image URL received from DALL-E API')
      }

      return NextResponse.json({
        success: true,
        url: imageUrl,
        prompt: prompt,
        type: 'image',
        model: 'dall-e-3',
        message: 'Generated using DALL-E 3 - high-quality AI image generation.'
      })

    } catch (error: any) {
      console.error('Image generation API error:', error)
      return NextResponse.json(
        { 
          error: 'Image generation failed: ' + (error.message || 'Unknown error'),
          details: error.message
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

