import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Kling AI Video Generation API
 * 
 * Official API Documentation: https://klingai.com/global/dev/model/video
 * 
 * Supported Endpoints:
 * - Text-to-Video: https://api-singapore.klingai.com/v1/videos/text2video
 * - Image-to-Video: https://api-singapore.klingai.com/v1/videos/image2video
 * 
 * This API uses an asynchronous task-based model:
 * 1. Create a task with POST to appropriate endpoint (auto-detected based on image presence)
 * 2. Poll task status with GET using the same endpoint type
 * 3. Retrieve video URL when task status is "succeed"
 * 
 * Features:
 * - Auto-detection of T2V vs I2V based on image upload
 * - Pro mode for highest quality output
 * - Proper base64 handling (removes data URI prefix)
 * - Correct status polling for both endpoint types
 * 
 * Pricing Structure:
 * - Kling AI: 50 credits per video generation
 * 
 * Note: Credits are deducted by the frontend before calling this API
 * 
 * Future Enhancements:
 * - Start/end frame control (image_tail parameter)
 * - Static and dynamic motion masks
 * - Camera control parameters
 * - Model version selection (model_name parameter)
 */

// Video model credit costs
const VIDEO_CREDITS: Record<string, number> = {
  'kling': 50 // Placeholder - adjust based on actual pricing
}

// Generate JWT token for Kling AI authentication
function generateKlingToken() {
  const accessKey = process.env.KLING_ACCESS_KEY
  const secretKey = process.env.KLING_SECRET_KEY

  if (!accessKey || !secretKey) {
    throw new Error('KLING_ACCESS_KEY and KLING_SECRET_KEY environment variables are not set')
  }

  const payload = {
    iss: accessKey,
    exp: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    nbf: Math.floor(Date.now() / 1000) - 5 // 5 seconds ago
  }

  const token = jwt.sign(payload, secretKey, { algorithm: 'HS256' })
  return token
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
      description: reason || 'Credit refund for failed generation',
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin'

    // Parse form data
    const formData = await req.formData()
    const prompt = formData.get('prompt') as string
    const model = formData.get('model') as string
    const duration = parseInt(formData.get('duration') as string) || 5
    const file = formData.get('file') as File | null
    const startFrame = formData.get('start_frame') as File | null
    const endFrame = formData.get('end_frame') as File | null
    const ratio = formData.get('ratio') as string || '16:9'

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      )
    }

    // Convert files to base64 if provided
    let imageBase64: string | undefined
    let imageTailBase64: string | undefined
    
    // Handle Kling-specific start/end frames
    if (startFrame) {
      const arrayBuffer = await startFrame.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      imageBase64 = `data:${startFrame.type};base64,${buffer.toString('base64')}`
    } else if (file) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      imageBase64 = `data:${file.type};base64,${buffer.toString('base64')}`
    }
    
    if (endFrame) {
      const arrayBuffer = await endFrame.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      imageTailBase64 = `data:${endFrame.type};base64,${buffer.toString('base64')}`
    }

    // Generate JWT token for Kling AI
    const authToken = generateKlingToken()

    // Call Kling AI API
    try {
      // Convert aspect ratio to Kling AI format (16:9, 9:16, 1:1)
      let klingAspectRatio = '16:9' // default
      const ratioMap: Record<string, string> = {
        '1280:720': '16:9',
        '1920:1080': '16:9',
        '720:1280': '9:16',
        '1080:1920': '9:16',
        '960:960': '1:1',
        '768:1280': '9:16', // Portrait
        '832:1104': '3:4', // Portrait alternative
      }
      
      // Try to find matching ratio
      if (ratio in ratioMap) {
        klingAspectRatio = ratioMap[ratio]
      } else if (ratio === '1280:768' || ratio === '1104:832' || ratio === '1584:672') {
        klingAspectRatio = '16:9' // Landscape variants
      } else {
        // Try to calculate aspect ratio from dimensions
        const [w, h] = ratio.split(':').map(Number)
        if (w && h) {
          const aspect = w / h
          if (aspect > 1.5) klingAspectRatio = '16:9'
          else if (aspect < 0.6) klingAspectRatio = '9:16'
          else klingAspectRatio = '1:1'
        }
      }

      // Determine endpoint based on model type and whether image is provided
      // Text-to-Video: /v1/videos/text2video
      // Image-to-Video: /v1/videos/image2video
      let endpoint: string
      
      if (model === 'kling_t2v') {
        // Explicit T2V model - always use text2video endpoint
        endpoint = 'https://api-singapore.klingai.com/v1/videos/text2video'
      } else if (model === 'kling_i2v' && imageBase64) {
        // Explicit I2V model with image - use image2video endpoint
        endpoint = 'https://api-singapore.klingai.com/v1/videos/image2video'
      } else if (imageBase64) {
        // Legacy: auto-detect based on image presence
        endpoint = 'https://api-singapore.klingai.com/v1/videos/image2video'
      } else {
        // No image - use text2video
        endpoint = 'https://api-singapore.klingai.com/v1/videos/text2video'
      }

      // Prepare request body according to official Kling AI API documentation
      const requestBody: any = {
        prompt: prompt,
        duration: duration.toString(), // Duration must be string: "5" or "10"
        aspect_ratio: klingAspectRatio,
        mode: 'pro', // Use pro mode for highest quality
      }

      // Add images if provided for Image-to-Video or frame control
      if (imageBase64) {
        // Remove data URI prefix for Kling AI (they only want the base64 string)
        requestBody.image = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      }
      
      if (imageTailBase64) {
        // End frame control for precise animation
        requestBody.image_tail = imageTailBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      }

      console.log('🎬 Calling Kling AI API with:', { 
        endpoint, 
        prompt, 
        duration, 
        ratio, 
        hasStartFrame: !!imageBase64,
        hasEndFrame: !!imageTailBase64,
        mode: 'pro'
      })
      
      console.log(`🔄 Calling Kling AI endpoint: ${endpoint}`)
      const createResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('❌ Kling AI create task error:', createResponse.status, errorText)
        throw new Error(`Kling AI API error: ${createResponse.status} - ${errorText}`)
      }

      const createData = await createResponse.json()
      console.log('✅ Kling AI task created:', createData)

      // Check if task creation was successful
      if (createData.code !== 0 || !createData.data?.task_id) {
        throw new Error(`Kling AI task creation failed: ${createData.message || 'Unknown error'}`)
      }

      const taskId = createData.data.task_id
      console.log(`📋 Task created successfully. Task ID: ${taskId}`)

      // Poll for task completion
      const maxAttempts = 60 // Try for up to 5 minutes (5s intervals)
      let attempts = 0
      let videoUrl: string | null = null

      // Use the same endpoint type for polling
      const statusEndpoint = endpoint.includes('image2video')
        ? `https://api-singapore.klingai.com/v1/videos/image2video/${taskId}`
        : `https://api-singapore.klingai.com/v1/videos/text2video/${taskId}`

      while (attempts < maxAttempts) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

        console.log(`🔄 Polling task status (attempt ${attempts}/${maxAttempts})...`)
        
        const statusResponse = await fetch(statusEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!statusResponse.ok) {
          console.log(`⚠️ Status check failed: ${statusResponse.status}`)
          continue
        }

        const statusData = await statusResponse.json()
        console.log(`📊 Task status: ${statusData.data?.task_status}`)

        if (statusData.data?.task_status === 'succeed') {
          // Task completed successfully
          videoUrl = statusData.data.task_result?.videos?.[0]?.url
          if (videoUrl) {
            console.log('✅ Video generated successfully!')
            break
          }
        } else if (statusData.data?.task_status === 'failed') {
          throw new Error(`Video generation failed: ${statusData.data?.task_status_msg || 'Unknown error'}`)
        }
        // If status is 'submitted' or 'processing', continue polling
      }

      if (!videoUrl) {
        throw new Error('Video generation timed out after maximum polling attempts')
      }

      return NextResponse.json({
        success: true,
        url: videoUrl,
        model: model,
        prompt: prompt,
        duration: duration,
        ratio: ratio,
      })

    } catch (error: any) {
      console.error('Kling AI API error:', error)
      
      // Refund credits for failed video generation
      const REFUND_AMOUNT = VIDEO_CREDITS[model] || 50
      const refundResult = await refundCredits(user.id, REFUND_AMOUNT)
      
      if (refundResult.success) {
        console.log(`✅ Successfully refunded ${REFUND_AMOUNT} credits to user ${user.id}`)
      } else {
        console.error(`❌ Failed to refund credits to user ${user.id}`, refundResult.error)
      }
      
      // Check for specific Kling AI error codes
      let errorMessage = ''
      if (error.message?.includes('Account balance not enough')) {
        errorMessage = isAdmin 
          ? 'Kling AI account has insufficient credits. Please top up your Kling AI account.'
          : 'Video generation service is temporarily unavailable. Your credits have been refunded. Please try again later.'
      } else {
        errorMessage = isAdmin
          ? 'Kling AI video generation failed: ' + (error.message || 'Unknown error')
          : 'INFINITO is having trouble processing your request right now. We\'re working on it. Your credits have been refunded. Please check back later.'
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: isAdmin ? (error.message) : 'Service temporarily unavailable',
          refunded: refundResult.success,
          newBalance: refundResult.newBalance
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

