import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * OpenAI Sora 2 Video Generation API
 * 
 * Pricing Structure:
 * - Sora 2: 0.16 credits per second of video
 * 
 * Note: Credits are deducted by the frontend before calling this API
 * 
 * Features:
 * - Text-to-Video (T2V) - with optional starting image
 * - Image-to-Video (I2V) - with starting image
 * - Automatic synchronized audio generation (always included - ambient sounds, speech, sound effects)
 * - Audio can be guided through prompts (describe sounds, dialogue, etc.)
 * - Duration: 4, 8, or 12 seconds (max 12 seconds)
 * - Aspect ratios: 720:1280 (9:16 portrait), 1280:720 (16:9 landscape)
 * 
 * Note: Audio is automatically generated - no parameter needed. Guide audio through prompt descriptions.
 */

// Calculate credits based on duration (0.16 credits/second)
function calculateCredits(duration: number): number {
  return Math.ceil(duration * 0.16)
}

// Get OpenAI API key from database
async function getOpenAIApiKey(supabase: any, userId: string | null = null): Promise<string | null> {
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

// Refund credits to user in case of video generation failure
async function refundCredits(userId: string, amount: number, reason?: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log(`💰 Refunding ${amount} credits to user ${userId}`)
    
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('credits')
      .eq('id', userId)
      .single()
    
    if (fetchError || !profile) {
      console.error('❌ Failed to fetch user profile for refund:', fetchError)
      return { success: false, error: fetchError }
    }
    
    const oldCredits = profile.credits || 0
    
    const { error: refundError } = await supabaseAdmin.rpc('add_user_credits', {
      user_id: userId,
      credits_to_add: amount,
      transaction_type: 'refund',
      description: reason || 'Credit refund for failed Sora 2 generation',
      reference_id: `refund_sora2_${Date.now()}`
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

// Convert aspect ratio string to width and height
function parseAspectRatio(ratio: string): { width: number; height: number } {
  const [width, height] = ratio.split(':').map(Number)
  return { width, height }
}

export async function POST(req: NextRequest) {
  let parsedDuration = 4
  let userId: string | null = null
  
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

    userId = user.id

    // Parse form data
    const formData = await req.formData()
    const prompt = formData.get('prompt') as string
    const model = formData.get('model') as string
    parsedDuration = parseInt(formData.get('duration') as string) || 4
    const duration = parsedDuration
    const ratio = formData.get('ratio') as string || '720:1280'
    const audioEnabled = formData.get('audio_enabled') === 'true'
    
    const imageFile = formData.get('file') as File | null
    const cameoVideo = formData.get('cameo_video') as File | null

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (model !== 'sora2') {
      return NextResponse.json(
        { error: 'Only sora2 model is supported' },
        { status: 400 }
      )
    }

    // Validate duration - OpenAI Sora 2 API supports only 4, 8, or 12 seconds
    // Note: 15 seconds is available in the standalone app but NOT in the API
    if (![4, 8, 12].includes(duration)) {
      return NextResponse.json(
        { error: 'Duration must be 4, 8, or 12 seconds. Maximum duration is 12 seconds.' },
        { status: 400 }
      )
    }

    // Validate aspect ratio
    // Sora 2 only supports 720x1280 and 1280x720 (not the HD variants)
    const validRatios = ['720:1280', '1280:720']
    if (!validRatios.includes(ratio)) {
      return NextResponse.json(
        { error: `Invalid aspect ratio for Sora 2. Only 720:1280 (portrait) and 1280:720 (landscape) are supported.` },
        { status: 400 }
      )
    }

    // Get OpenAI API key
    const supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const apiKey = await getOpenAIApiKey(supabaseService, user.id)
    
    if (!apiKey) {
      const refundAmount = calculateCredits(duration)
      await refundCredits(user.id, refundAmount, 'OpenAI API key not found')
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Please contact an administrator.',
          refunded: true,
          newBalance: (await refundCredits(user.id, refundAmount)).newBalance
        },
        { status: 500 }
      )
    }

    // Parse aspect ratio
    const { width, height } = parseAspectRatio(ratio)

    console.log(`🎬 Starting Sora 2 generation for user ${user.id}`)
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`)
    console.log(`⏱️ Duration: ${duration}s, Size: ${width}x${height}`)
    console.log(`🔊 Audio: ${audioEnabled ? 'enabled' : 'disabled'}`)

    // OpenAI Sora API requires multipart/form-data when files are included
    // Use FormData if we have files, otherwise use JSON
    let requestBody: FormData | string
    let headers: HeadersInit = {
      'Authorization': `Bearer ${apiKey}`,
    }
    
    // Determine model to use (sora-2-pro for Cameo, sora-2 otherwise)
    const modelToUse = cameoVideo ? 'sora-2-pro' : 'sora-2'
    
    if (imageFile || cameoVideo) {
      // Use FormData for file uploads - OpenAI expects actual File objects
      const formData = new FormData()
      
      // Try sora-2-pro when Cameo is used (pro model might have Cameo support)
      formData.append('model', modelToUse)
      formData.append('prompt', prompt)
      formData.append('seconds', duration.toString())
      formData.append('size', `${width}x${height}`)
      
      if (cameoVideo) {
        console.log('🎭 Using sora-2-pro model for Cameo feature (pro model may have Cameo support)')
      }
      
      if (imageFile) {
        // Resize image to match exact dimensions required by OpenAI
        // Sora 2 requires images to match the requested size exactly
        console.log('📷 Resizing image to match requested dimensions:', `${width}x${height}`)
        
        try {
          // Dynamic import of sharp to avoid webpack bundling issues
          const sharp = (await import('sharp')).default
          
          const arrayBuffer = await imageFile.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          
          // Resize image to exact dimensions using sharp
          const resizedBuffer = await sharp(buffer)
            .resize(width, height, {
              fit: 'fill', // Fill exactly - may crop/stretch to match dimensions
            })
            .jpeg({ quality: 95 }) // Convert to JPEG for better compatibility
            .toBuffer()
          
          // Create a new File from the resized buffer
          const resizedBlob = new Blob([resizedBuffer], { type: 'image/jpeg' })
          const fileName = imageFile.name.replace(/\.[^/.]+$/, '') + '.jpg'
          const resizedFile = new File([resizedBlob], fileName, { type: 'image/jpeg' })
          
          formData.append('input_reference', resizedFile, fileName)
          console.log(`✅ Image resized to ${width}x${height} pixels and converted to JPEG`)
        } catch (sharpError: any) {
          console.error('❌ Sharp import/resize error:', sharpError.message)
          // Return error instead of sending incorrect dimensions
          const refundAmount = calculateCredits(duration)
          await refundCredits(user.id, refundAmount, 'Image resize failed - please ensure image dimensions match exactly')
          return NextResponse.json(
            {
              error: `Failed to resize image. Please ensure your image is exactly ${width}x${height} pixels, or try installing sharp: npm install sharp`,
              refunded: true,
              newBalance: (await refundCredits(user.id, refundAmount)).newBalance
            },
            { status: 500 }
          )
        }
      }
      
      if (cameoVideo) {
        // Sora 2 Cameo feature: Upload a video of a person to insert their likeness/voice
        // Trying multiple parameter names to find the correct one OpenAI uses
        
        console.log('🎭 ========== Cameo Video Debug Info ==========')
        console.log('🎭 Video file name:', cameoVideo.name)
        console.log('🎭 Video file size:', (cameoVideo.size / 1024 / 1024).toFixed(2), 'MB')
        console.log('🎭 Video file type:', cameoVideo.type)
        
        // Check file size - might be too large (OpenAI typically has limits)
        const fileSizeMB = cameoVideo.size / 1024 / 1024
        if (fileSizeMB > 100) {
          console.warn(`⚠️ WARNING: Cameo video is ${fileSizeMB.toFixed(2)} MB - OpenAI may have file size limits. Consider compressing the video.`)
        }
        
        // List of parameter names to try (in order of likelihood)
        // Based on OpenAI's naming conventions, trying most common patterns
        const cameoParameterNames = [
          'cameo',            // Simplest form - try this first now
          'cameo_video',      // Full form
          'reference_video',  // Reference pattern (common in AI APIs)
          'character_video',  // Character pattern
          'person_video',     // Person pattern
          'cameo_reference',  // Combined
          'voice_reference',  // Voice pattern
          'character_reference', // Character reference
        ]
        
        // Try 'cameo' first (simplest, most likely)
        const currentParamName = 'cameo'
        console.log('🎭 Attempting parameter name:', `"${currentParamName}"`)
        console.log('🎭 Available alternatives if this fails:', cameoParameterNames.slice(1).map(n => `"${n}"`).join(', '))
        
        formData.append(currentParamName, cameoVideo, cameoVideo.name)
        console.log('🎭 FormData keys being sent:', Array.from(formData.keys()))
        console.log('🎭 ============================================')
      }
      
      requestBody = formData
      // Don't set Content-Type - FormData sets it automatically with boundary
    } else if (cameoVideo && !imageFile) {
      // Text-to-video WITH Cameo (no starting image) - still use FormData for cameo video
      const formData = new FormData()
      
      // Use sora-2-pro for Cameo (pro model may have Cameo support)
      formData.append('model', 'sora-2-pro')
      formData.append('prompt', prompt)
      formData.append('seconds', duration.toString())
      formData.append('size', `${width}x${height}`)
      
      console.log('🎭 Text-to-video with Cameo (no starting image)')
      console.log('🎭 Using sora-2-pro model for Cameo feature')
      console.log('🔍 Trying parameter name: "cameo"')
      
      // Try 'cameo' parameter name (simplest form)
      formData.append('cameo', cameoVideo, cameoVideo.name)
      console.log('🎭 FormData keys:', Array.from(formData.keys()))
      
      requestBody = formData
    } else {
      // Use JSON for text-to-video (no files, no cameo)
      requestBody = JSON.stringify({
        model: 'sora-2',
        prompt: prompt,
        seconds: duration.toString(),
        size: `${width}x${height}`,
      })
      headers['Content-Type'] = 'application/json'
    }

    // Call OpenAI Sora API
    // Endpoint: v1/videos (launched at OpenAI DevDay October 2025)
    // Supports sora-2 and sora-2-pro models
    console.log('🚀 ========== OpenAI API Request Debug ==========')
    console.log('🚀 Endpoint: https://api.openai.com/v1/videos')
    console.log('🚀 Method: POST')
    console.log('🚀 Headers:', Object.keys(headers))
    if (requestBody instanceof FormData) {
      console.log('🚀 Body type: FormData')
      console.log('🚀 FormData keys:', Array.from((requestBody as FormData).keys()))
    } else {
      console.log('🚀 Body type: JSON')
      console.log('🚀 Body preview:', typeof requestBody === 'string' ? requestBody.substring(0, 200) : 'Not string')
    }
    console.log('🚀 ================================================')
    
    const openaiResponse = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: headers,
      body: requestBody,
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({ error: { message: openaiResponse.statusText } }))
      const refundAmount = calculateCredits(duration)
      const refundResult = await refundCredits(user.id, refundAmount, `OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)

      // Comprehensive debugging
      console.error('❌ ========== OpenAI API Error Details ==========')
      console.error('❌ Response status:', openaiResponse.status)
      console.error('❌ Error code:', errorData.error?.code)
      console.error('❌ Error type:', errorData.error?.type)
      console.error('❌ Error message:', errorData.error?.message)
      console.error('❌ Error param:', errorData.error?.param)
      console.error('❌ Full error object:', JSON.stringify(errorData, null, 2))
      console.error('❌ Response headers:', Object.fromEntries(openaiResponse.headers.entries()))
      console.error('❌ Request had cameo video:', !!cameoVideo)
      if (cameoVideo) {
        console.error('❌ Cameo video name:', cameoVideo.name)
        console.error('❌ Cameo video size:', (cameoVideo.size / 1024 / 1024).toFixed(2), 'MB')
      }
      console.error('❌ Request had image:', !!imageFile)
      console.error('❌ Model:', model)
      console.error('❌ Prompt length:', prompt?.length)
      console.error('❌ ================================================')
      
      // Handle unknown parameter errors - detailed debugging
      if (errorData.error?.code === 'unknown_parameter' && (errorData.error?.param?.includes('cameo') || errorData.error?.param?.includes('video') || errorData.error?.param?.includes('character') || errorData.error?.param?.includes('reference'))) {
        console.error(`⚠️ DEBUG: Unknown parameter detected: "${errorData.error?.param}"`)
        console.error(`⚠️ DEBUG: We tried parameter name: "${errorData.error?.param}"`)
        console.error(`⚠️ DEBUG: Model used: ${modelToUse || model}`)
        
        const alternativeParams = ['character_video', 'person_video', 'reference_video', 'cameo_video', 'cameo_reference', 'voice_reference', 'character_reference']
        console.error(`⚠️ DEBUG: Suggested alternatives to try:`, alternativeParams.map(p => `"${p}"`).join(', '))
        console.error(`⚠️ DEBUG: Note: The Cameo feature might require a different API endpoint, model version (sora-2-pro?), or may not be available in the API yet.`)
        console.error(`⚠️ DEBUG: Full error details:`, JSON.stringify(errorData, null, 2))
        
        // Check if we used pro model
        const usedProModel = modelToUse === 'sora-2-pro' || model === 'sora-2-pro'
        const modelInfo = usedProModel ? ' (tried with sora-2-pro model)' : ' (tried with sora-2 model - maybe try sora-2-pro?)'
        
        // Return helpful error - based on OpenAI docs, Cameo is NOT in the API
        return NextResponse.json(
          {
            error: `The Cameo feature (cloning yourself) is not available in the Sora 2 API. According to OpenAI's official documentation, the API only supports: (1) Text-to-video with prompts, (2) Image references using "input_reference" parameter, and (3) Remixing existing videos. The Cameo feature is exclusively available in the Sora standalone app (iOS/Android). To use Cameo, please download the Sora app from the App Store.`,
            error_code: 'cameo_not_available_in_api',
            tried_parameter: errorData.error?.param,
            tried_model: modelToUse || model,
            available_api_features: [
              'Text-to-video generation',
              'Image references (input_reference parameter)',
              'Video remixing (remix_video_id parameter)'
            ],
            cameo_location: 'Sora standalone app (iOS/Android only)',
            refunded: true,
            newBalance: refundResult.newBalance,
            full_error: errorData
          },
          { status: 400 }
        )
      }
      
      // Handle specific error cases
      if (openaiResponse.status === 404) {
        return NextResponse.json(
          {
            error: 'The v1/videos endpoint may not be available for your API key yet, or requires API access. Please check OpenAI documentation or try again later. Using other video models (RunwayML, Kling AI) as an alternative.',
            refunded: true,
            newBalance: refundResult.newBalance,
            apiNotAvailable: true,
            actualError: errorData
          },
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        {
          error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}`,
          refunded: true,
          newBalance: refundResult.newBalance
        },
        { status: openaiResponse.status }
      )
    }

    let result
    try {
      const text = await openaiResponse.text()
      result = text ? JSON.parse(text) : {}
      console.log('📦 OpenAI initial response:', JSON.stringify(result, null, 2))
    } catch (parseError) {
      const refundAmount = calculateCredits(duration)
      await refundCredits(user.id, refundAmount, 'Failed to parse OpenAI response')
      return NextResponse.json(
        {
          error: 'Failed to parse OpenAI API response',
          refunded: true,
          newBalance: (await refundCredits(user.id, refundAmount)).newBalance
        },
        { status: 500 }
      )
    }
    
    // Handle async video generation - OpenAI may return a task ID
    // Poll for completion if needed
    let videoUrl = result.video_url || result.url || result.video?.url || null
    let taskId = result.id || result.task_id || null
    
    console.log(`📋 Task info - ID: ${taskId}, Video URL: ${videoUrl}, Status: ${result.status}`)

    // If task ID is returned, poll for completion
    if (taskId && !videoUrl) {
      console.log(`⏳ Polling for video completion. Task ID: ${taskId}`)
      
      let attempts = 0
      const maxAttempts = 120 // 10 minutes max (5 second intervals)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        
        try {
          // Try different endpoint formats
          let statusResponse
          try {
            statusResponse = await fetch(`https://api.openai.com/v1/videos/${taskId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
              },
            })
          } catch (fetchError) {
            console.error('❌ Fetch error:', fetchError)
            throw fetchError
          }

          if (!statusResponse.ok) {
            const errorText = await statusResponse.text()
            let errorData
            try {
              errorData = errorText ? JSON.parse(errorText) : { error: { message: statusResponse.statusText } }
            } catch {
              errorData = { error: { message: `HTTP ${statusResponse.status}: ${errorText.substring(0, 200)}` } }
            }
            
            console.error('❌ Status check error:', errorData)
            
            // If it's a 404, the endpoint format might be wrong - try without polling
            if (statusResponse.status === 404) {
              console.log('⚠️  Status endpoint returned 404, video might be ready immediately')
              // Break and return the original result - maybe video is already available
              break
            }
            
            const refundAmount = calculateCredits(duration)
            const refundResult = await refundCredits(user.id, refundAmount, `Status check error: ${errorData.error?.message}`)
            
            return NextResponse.json(
              {
                error: `Failed to check status: ${errorData.error?.message}`,
                refunded: true,
                newBalance: refundResult.newBalance
              },
              { status: statusResponse.status }
            )
          }

          const statusText = await statusResponse.text()
          let statusData
          try {
            statusData = statusText ? JSON.parse(statusText) : {}
          } catch (parseError) {
            console.error('❌ Failed to parse status response:', statusText.substring(0, 200))
            throw new Error('Invalid status response format')
          }
          
          console.log(`📊 Status check ${attempts + 1}:`, JSON.stringify(statusData, null, 2))
          
          // Check for completion - OpenAI might use different field names
          if (statusData.status === 'completed' || statusData.status === 'succeeded') {
            // According to OpenAI docs, when status is 'completed', we need to download the video
            // using GET /videos/{video_id}/content - the video content is not in the status response
            console.log(`✅ Video generation completed! Downloading video content...`)
            
            // Download the video content from the content endpoint
            try {
              const contentResponse = await fetch(`https://api.openai.com/v1/videos/${taskId}/content`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                },
              })
              
              if (!contentResponse.ok) {
                const errorText = await contentResponse.text()
                console.error('❌ Failed to download video content:', errorText.substring(0, 200))
                throw new Error(`Failed to download video: ${contentResponse.status} ${contentResponse.statusText}`)
              }
              
              // Get the video as a blob
              const videoBlob = await contentResponse.blob()
              const arrayBuffer = await videoBlob.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              const videoSizeMB = buffer.length / 1024 / 1024
              
              console.log(`📥 Video downloaded from OpenAI (${videoSizeMB.toFixed(2)} MB)`)
              
              // Upload to Supabase storage for permanent storage
              try {
                const fileName = `sora2_${taskId}_${Date.now()}.mp4`
                const filePath = `${user.id}/Infinito-Video-${Date.now()}.mp4`
                
                // Try 'media-files' bucket first (matches other uploads in codebase)
                const storageBucket = 'media-files'
                
                const { data: uploadData, error: uploadError } = await supabaseService
                  .storage
                  .from(storageBucket)
                  .upload(filePath, buffer, {
                    contentType: 'video/mp4',
                    upsert: false
                  })
                
                if (uploadError) {
                  console.error('❌ Supabase upload error:', uploadError)
                  // If media-files doesn't exist, try generations bucket
                  if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
                    console.log('⚠️ media-files bucket not found, trying generations bucket...')
                    const { data: altUploadData, error: altUploadError } = await supabaseService
                      .storage
                      .from('generations')
                      .upload(filePath, buffer, {
                        contentType: 'video/mp4',
                        upsert: false
                      })
                    
                    if (altUploadError) {
                      throw altUploadError
                    }
                    
                    const { data: altUrlData } = supabaseService
                      .storage
                      .from('generations')
                      .getPublicUrl(filePath)
                    
                    videoUrl = altUrlData.publicUrl
                    console.log(`✅ Video uploaded to generations bucket: ${videoUrl}`)
                  } else {
                    throw uploadError
                  }
                } else {
                  // Get public URL
                  const { data: urlData } = supabaseService
                    .storage
                    .from(storageBucket)
                    .getPublicUrl(filePath)
                  
                  videoUrl = urlData.publicUrl
                  console.log(`✅ Video uploaded to storage: ${videoUrl}`)
                }
              } catch (storageError: any) {
                console.error('❌ Storage upload failed:', storageError)
                // Fallback: Return the content endpoint URL as a temporary solution
                // The frontend can fetch it directly, but it will expire after 1 hour
                videoUrl = `https://api.openai.com/v1/videos/${taskId}/content`
                console.log(`⚠️ Using temporary OpenAI content URL (expires in 1 hour): ${videoUrl}`)
                console.log(`⚠️ Note: You may need to set up Supabase storage bucket 'media-files' for permanent storage`)
              }
            } catch (downloadError: any) {
              console.error('❌ Video download error:', downloadError)
              const refundAmount = calculateCredits(duration)
              const refundResult = await refundCredits(user.id, refundAmount, `Video download failed: ${downloadError.message}`)
              return NextResponse.json(
                {
                  error: `Video generation completed but download failed: ${downloadError.message}`,
                  refunded: true,
                  newBalance: refundResult.newBalance
                },
                { status: 500 }
              )
            }
            
            break
          } else if (statusData.video_url || statusData.video?.url || statusData.url) {
            // Fallback: if URL is directly in response (shouldn't happen per docs, but just in case)
            videoUrl = statusData.video_url || statusData.video?.url || statusData.url || null
            console.log(`✅ Video ready! URL: ${videoUrl}`)
            break
          } else if (statusData.status === 'failed' || statusData.status === 'error') {
            const refundAmount = calculateCredits(duration)
            const errorMessage = statusData.error?.message || 'Video generation failed'
            const errorCode = statusData.error?.code || 'unknown_error'
            
            // Handle moderation blocks specially
            const refundResult = await refundCredits(user.id, refundAmount, `Video generation failed: ${errorMessage}`)
            
            let userFriendlyMessage = errorMessage
            if (errorCode === 'moderation_blocked') {
              // More helpful message for moderation blocks
              // Note: OpenAI's moderation can block false positives, especially with images of people
              userFriendlyMessage = `Content moderation blocked your request. OpenAI's moderation system can sometimes be overly strict and may block images of people or certain prompts. Suggestions: (1) Try text-to-video without an image first, (2) Use a different prompt, (3) If using an image, try a different one.`
              console.log(`⚠️ Moderation block - Prompt: "${prompt.substring(0, 100)}" | Had image: ${!!imageFile}`)
            }
            
            return NextResponse.json(
              {
                error: userFriendlyMessage,
                error_code: errorCode,
                refunded: true,
                newBalance: refundResult.newBalance
              },
              { status: 400 } // Use 400 for moderation/content errors
            )
          }

          attempts++
          console.log(`⏳ Still processing... (${attempts}/${maxAttempts}) - Status: ${statusData.status || 'unknown'}`)
        } catch (pollError: any) {
          console.error('❌ Polling error:', pollError)
          const refundAmount = calculateCredits(duration)
          const refundResult = await refundCredits(user.id, refundAmount, `Polling error: ${pollError.message}`)
          
          return NextResponse.json(
            {
              error: `Error during video generation: ${pollError.message}`,
              refunded: true,
              newBalance: refundResult.newBalance
            },
            { status: 500 }
          )
        }
      }

      if (!videoUrl) {
        const refundAmount = calculateCredits(duration)
        const refundResult = await refundCredits(user.id, refundAmount, 'Video generation timeout')
        
        return NextResponse.json(
          {
            error: 'Video generation timed out. Please try again.',
            refunded: true,
            newBalance: refundResult.newBalance
          },
          { status: 504 }
        )
      }
    }

    if (!videoUrl) {
      const refundAmount = calculateCredits(duration)
      await refundCredits(user.id, refundAmount, 'No video URL returned')
      
      return NextResponse.json(
        {
          error: 'No video URL returned from OpenAI',
          refunded: true,
          newBalance: (await refundCredits(user.id, refundAmount)).newBalance
        },
        { status: 500 }
      )
    }

    console.log(`✅ Video generated successfully: ${videoUrl}`)

    return NextResponse.json({
      success: true,
      video_url: videoUrl,
      duration: duration,
      ratio: ratio,
      model: 'sora2'
    })

  } catch (error: any) {
    console.error('❌ Sora 2 generation error:', error)
    
    // Try to refund credits using stored duration and userId
    try {
      if (userId && parsedDuration) {
        const refundAmount = calculateCredits(parsedDuration)
        await refundCredits(userId, refundAmount, `Unexpected error: ${error.message}`)
      }
    } catch (refundError) {
      console.error('Failed to refund on error:', refundError)
    }

    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

