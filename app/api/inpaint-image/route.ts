import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * Image Inpainting API
 * 
 * Uses OpenAI's image editing API for inpainting (filling masked areas)
 * 
 * Pricing Structure:
 * - OpenAI API Cost: ~$0.04 per image
 * - User Cost: 15 credits per inpainting (60% markup)
 */

// Refund credits helper
async function refundCredits(userId: string, amount: number, reason?: string) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'Storage not configured' }
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    
    console.log(`💰 Refunding ${amount} credits to user ${userId}`)
    
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('credits')
      .eq('id', userId)
      .single()
    
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    const oldCredits = profile.credits || 0
    
    const { error: refundError } = await supabaseAdmin.rpc('add_user_credits', {
      user_id: userId,
      credits_to_add: amount,
      transaction_type: 'refund',
      description: reason || 'Credit refund for failed inpainting',
      reference_id: `refund_${Date.now()}`
    })
    
    if (refundError) {
      console.error('❌ Failed to refund credits:', refundError)
      return { success: false, error: refundError }
    }
    
    const newCredits = oldCredits + amount
    console.log(`✅ Refunded ${amount} credits. New balance: ${newCredits}`)
    return { success: true, newBalance: newCredits }
  } catch (error) {
    console.error('❌ Refund error:', error)
    return { success: false, error }
  }
}

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
              // Server Component limitation
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
    console.log('[INPAINT API DEBUG] Request received:', {
      hasImageUrl: !!body.imageUrl,
      imageUrlType: typeof body.imageUrl,
      imageUrlPreview: body.imageUrl?.substring(0, 100),
      hasMaskDataUrl: !!body.maskDataUrl,
      maskDataUrlLength: body.maskDataUrl?.length,
      hasPrompt: !!body.prompt,
      prompt: body.prompt,
      model: body.model
    })
    
    const { imageUrl, maskDataUrl, prompt, model = 'dall-e-2' } = body

    if (!imageUrl || !maskDataUrl || !prompt) {
      console.error('[INPAINT API DEBUG] Missing required fields:', {
        imageUrl: !!imageUrl,
        maskDataUrl: !!maskDataUrl,
        prompt: !!prompt
      })
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, maskDataUrl, prompt' },
        { status: 400 }
      )
    }

    // Validate model - OpenAI image editing only supports dall-e-2
    const validModels = ['dall-e-2']
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { error: `Invalid model. Inpainting currently only supports: ${validModels.join(', ')}` },
        { status: 400 }
      )
    }

    try {
      // Get OpenAI API key
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
          { error: 'Database not configured' },
          { status: 500 }
        )
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
      
      const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
        .from('api_keys')
        .select('encrypted_key')
        .eq('service_id', 'openai')
        .eq('is_active', true)
        .maybeSingle()
      
      if (apiKeyError || !apiKeyData) {
        return NextResponse.json(
          { error: 'OpenAI API key not found' },
          { status: 500 }
        )
      }

      const openaiApiKey = apiKeyData.encrypted_key
      
      // Convert data URLs to files
      // For external URLs, fetch directly (server-side, no CORS issues)
      // For data URLs, convert to blob
      console.log('[INPAINT API DEBUG] Processing image URL:', imageUrl.substring(0, 100))
      let imageBlob: Blob
      if (imageUrl.startsWith('data:')) {
        console.log('[INPAINT API DEBUG] Image is data URL')
        // Data URL - convert to blob
        const response = await fetch(imageUrl)
        imageBlob = await response.blob()
        console.log('[INPAINT API DEBUG] Image blob created from data URL, size:', imageBlob.size)
      } else {
        console.log('[INPAINT API DEBUG] Image is external URL, fetching...')
        // External URL - fetch with proper headers
        const imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
          }
        })
        if (!imageResponse.ok) {
          console.error('[INPAINT API DEBUG] Failed to fetch image:', imageResponse.status, imageResponse.statusText)
          throw new Error(`Failed to fetch original image: ${imageResponse.statusText}`)
        }
        imageBlob = await imageResponse.blob()
        console.log('[INPAINT API DEBUG] Image blob created from external URL, size:', imageBlob.size)
      }
      
      // Mask is always a data URL
      console.log('[INPAINT API DEBUG] Processing mask data URL, length:', maskDataUrl.length)
      const maskResponse = await fetch(maskDataUrl)
      if (!maskResponse.ok) {
        console.error('[INPAINT API DEBUG] Failed to process mask:', maskResponse.status, maskResponse.statusText)
        throw new Error(`Failed to process mask: ${maskResponse.statusText}`)
      }
      const maskBlob = await maskResponse.blob()
      console.log('[INPAINT API DEBUG] Mask blob created, size:', maskBlob.size)
      
      // Create FormData for OpenAI image editing API
      console.log('[INPAINT API DEBUG] Creating FormData for OpenAI...')
      const formData = new FormData()
      formData.append('image', imageBlob, 'image.png')
      formData.append('mask', maskBlob, 'mask.png')
      formData.append('prompt', prompt)
      formData.append('n', '1')
      formData.append('size', '1024x1024')
      formData.append('response_format', 'url')
      console.log('[INPAINT API DEBUG] FormData created, calling OpenAI API...')
      
      // Call OpenAI Image Editing API
      const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: formData
      })

      console.log('[INPAINT API DEBUG] OpenAI response status:', editResponse.status, editResponse.statusText)

      if (!editResponse.ok) {
        const errorData = await editResponse.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || editResponse.statusText
        console.error('[INPAINT API DEBUG] OpenAI API error:', errorMessage, errorData)
        
        // Check if it's a moderation error
        if (errorMessage && (
          errorMessage.toLowerCase().includes('moderation') || 
          errorMessage.toLowerCase().includes('did not pass') ||
          errorMessage.toLowerCase().includes('content policy')
        )) {
          const creditsToRefund = 15
          const refundResult = await refundCredits(user.id, creditsToRefund, 'Inpainting moderation error')
          
          return NextResponse.json(
            { 
              error: "Didn't pass content review. Remove copyrighted names/brands or explicit content and try again.",
              refunded: refundResult.success,
              newBalance: refundResult.newBalance
            },
            { status: 400 }
          )
        }
        
        throw new Error(`Inpainting failed: ${errorMessage}`)
      }

      const editData = await editResponse.json()
      console.log('[INPAINT API DEBUG] OpenAI response data:', {
        hasData: !!editData.data,
        dataLength: editData.data?.length,
        firstItemUrl: editData.data?.[0]?.url
      })
      const inpaintedUrl = editData.data?.[0]?.url
      
      if (!inpaintedUrl) {
        console.error('[INPAINT API DEBUG] No image URL in OpenAI response:', editData)
        throw new Error('No image URL received from inpainting service')
      }

      console.log('[INPAINT API DEBUG] Inpainting successful! New image URL:', inpaintedUrl)
      const successResponse = {
        success: true,
        url: inpaintedUrl,
        prompt: prompt,
        model: model,
        message: 'Image inpainted successfully using DALL-E 2'
      }
      console.log('[INPAINT API DEBUG] Sending success response:', {
        success: successResponse.success,
        hasUrl: !!successResponse.url,
        url: successResponse.url.substring(0, 100)
      })
      
      return NextResponse.json(successResponse)

    } catch (error: any) {
      console.error('[INPAINT API DEBUG] Caught error in inpainting API:', error)
      console.error('[INPAINT API DEBUG] Error message:', error.message)
      console.error('[INPAINT API DEBUG] Error stack:', error.stack)
      
      const errorMessage = error.message || 'Unknown error'
      
      // Refund credits on error
      const creditsToRefund = 15
      await refundCredits(user.id, creditsToRefund, 'Inpainting error')
      
      return NextResponse.json(
        { 
          error: errorMessage,
          refunded: true,
          refundAmount: creditsToRefund
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

