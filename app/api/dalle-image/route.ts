import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Refund credits to user in case of image generation failure
async function refundCredits(userId: string, amount: number) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'Storage not configured' }
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    
    console.log(`💰 Refunding ${amount} credits to user ${userId}`)
    
    // Get current credits
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('credits')
      .eq('id', userId)
      .single()
    
    if (fetchError || !profile) {
      console.error('❌ Failed to fetch user profile for refund:', fetchError)
      return { success: false, error: fetchError }
    }
    
    const newCredits = (profile.credits || 0) + amount
    
    // Add credits back
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ credits: newCredits })
      .eq('id', userId)
    
    if (updateError) {
      console.error('❌ Failed to refund credits:', updateError)
      return { success: false, error: updateError }
    }
    
    console.log(`✅ Refunded ${amount} credits. New balance: ${newCredits}`)
    return { success: true, newBalance: newCredits }
  } catch (error) {
    console.error('❌ Refund error:', error)
    return { success: false, error }
  }
}

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
    const { prompt, model } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Determine which OpenAI image model to use
    const imageModel = model || 'dall-e-3' // Default to DALL-E 3
    const validModels = ['dall-e-3', 'dall-e-2', 'gpt-image-1']
    
    if (!validModels.includes(imageModel)) {
      return NextResponse.json(
        { error: `Invalid model. Must be one of: ${validModels.join(', ')}` },
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
      
      // Build request body based on model capabilities
      const requestBody: any = {
        model: imageModel,
        prompt: prompt,
        n: 1,
      }

      // DALL-E models support additional parameters
      if (imageModel === 'dall-e-3' || imageModel === 'dall-e-2') {
        requestBody.size = "1024x1024"
        requestBody.response_format = "url"
        
        // Only DALL-E 3 supports quality parameter
        if (imageModel === 'dall-e-3') {
          requestBody.quality = "standard"
        }
      }
      // GPT Image 1 uses simpler parameters (no size, quality, or response_format)
      
      // Call OpenAI Image Generation API
      const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      if (!dalleResponse.ok) {
        const errorData = await dalleResponse.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || dalleResponse.statusText
        
        // Check if it's a moderation error and provide a clearer message
        if (errorMessage && (
          errorMessage.toLowerCase().includes('moderation') || 
          errorMessage.toLowerCase().includes('did not pass') ||
          errorMessage.toLowerCase().includes('content policy')
        )) {
          throw new Error("Didn't pass copyright review. Remove copyrighted names/brands or explicit content and try again.")
        }
        
        // Remove any service/model names from the error message before showing to user
        const sanitizedError = errorMessage.replace(/OpenAI|DALL-E|dall-e/g, '').trim()
        throw new Error(`Image generation failed: ${sanitizedError || 'Unknown error'}`)
      }

      const dalleData = await dalleResponse.json()
      const imageUrl = dalleData.data?.[0]?.url
      
      if (!imageUrl) {
        throw new Error('No image URL received from image generation service')
      }

      // Model-specific messages
      const modelMessages: Record<string, string> = {
        'dall-e-3': 'Generated using DALL-E 3 - high-quality AI image generation.',
        'dall-e-2': 'Generated using DALL-E 2 - creative AI image generation.',
        'gpt-image-1': 'Generated using GPT Image 1 - advanced multimodal image generation.'
      }

      return NextResponse.json({
        success: true,
        url: imageUrl,
        prompt: prompt,
        type: 'image',
        model: imageModel,
        message: modelMessages[imageModel] || `Generated using ${imageModel}.`
      })

    } catch (error: any) {
      console.error('Image generation API error:', error)
      
      const errorMessage = error.message || 'Unknown error'
      const isModerationError = errorMessage && (
        errorMessage.toLowerCase().includes('moderation') || 
        errorMessage.toLowerCase().includes('did not pass') ||
        errorMessage.toLowerCase().includes('content policy')
      )
      
      // Refund credits if it's a moderation/copyright error
      if (isModerationError) {
        // Calculate credits to refund based on model
        const imageCredits: Record<string, number> = {
          'dall-e-3': 40,
          'dall-e-2': 40,
          'gpt-image-1': 40
        }
        const creditsToRefund = imageCredits[imageModel] || 40
        
        const refundResult = await refundCredits(user.id, creditsToRefund)
        
        if (refundResult.success) {
          console.log(`✅ Successfully refunded ${creditsToRefund} credits to user ${user.id}`)
        } else {
          console.error(`❌ Failed to refund credits to user ${user.id}`, refundResult.error)
        }
        
        return NextResponse.json(
          { 
            error: "Didn't pass copyright review. Remove copyrighted names/brands or explicit content and try again.",
            details: errorMessage,
            refunded: refundResult.success,
            refundAmount: creditsToRefund,
            newBalance: refundResult.newBalance
          },
          { status: 400 }
        )
      }
      
      // Sanitize error message to remove service/model names before returning to user
      let sanitizedError = errorMessage.replace(/OpenAI|DALL-E|dall-e/g, '').trim()
      if (!sanitizedError) sanitizedError = 'Image generation failed'
      
      return NextResponse.json(
        { 
          error: sanitizedError.startsWith('Image generation') ? sanitizedError : `Image generation failed: ${sanitizedError}`,
          details: error.message // Keep full details for logging
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

