import { NextRequest, NextResponse } from 'next/server'
import Runway from '@runwayml/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * RunwayML Video Generation API
 * 
 * Pricing Structure (60% markup on RunwayML API cost):
 * - Gen4 Turbo: 40 credits (RunwayML: 25)
 * - Gen3a Turbo: 80 credits (RunwayML: 50)
 * - VEO 3.1: 320 credits (RunwayML: 200)
 * - VEO 3.1 Fast: 160 credits (RunwayML: 100)
 * - VEO 3: 512 credits (RunwayML: 320, 8 seconds)
 * - Gen4 Aleph: 120 credits (RunwayML: 75)
 * - Act Two: 40 credits (RunwayML: 25)
 * 
 * Note: Credits are deducted by the frontend before calling this API
 */

// Video model credit costs (60% markup on RunwayML API cost)
const VIDEO_CREDITS: Record<string, number> = {
  'gen4_turbo': 40,
  'gen3a_turbo': 80,
  'veo3.1': 320,
  'veo3.1_fast': 160,
  'veo3': 512,
  'gen4_aleph': 120,
  'act_two': 40
}

// Initialize Runway client with API key from environment
const getRunwayClient = () => {
  const apiKey = process.env.RUNWAYML_API_SECRET
  if (!apiKey) {
    throw new Error('RUNWAYML_API_SECRET environment variable is not set')
  }
  return new Runway({ apiKey })
}

// Refund credits to user in case of video generation failure
async function refundCredits(userId: string, amount: number, reason?: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log(`💰 Refunding ${amount} credits to user ${userId}`)
    
    // Get current credits before refund
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
    
    // Use add_user_credits function which also logs the transaction
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
    const characterFile = formData.get('character_file') as File | null
    const referenceFile = formData.get('reference_file') as File | null
    const ratio = formData.get('ratio') as string || '768:1280' // Default to portrait

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

    // Initialize Runway client
    const runway = getRunwayClient()

    let result: any

    // Convert file to base64 if provided
    let imageBase64: string | undefined
    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      imageBase64 = `data:${file.type};base64,${buffer.toString('base64')}`
    }

    // Convert Act Two files to base64 if provided
    let characterBase64: string | undefined
    let referenceBase64: string | undefined
    if (characterFile) {
      const arrayBuffer = await characterFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      characterBase64 = `data:${characterFile.type};base64,${buffer.toString('base64')}`
    }
    if (referenceFile) {
      const arrayBuffer = await referenceFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      referenceBase64 = `data:${referenceFile.type};base64,${buffer.toString('base64')}`
    }

    // Handle different model types
    try {
      switch (model) {
        case 'gen4_turbo':
        case 'gen3a_turbo':
          // These models REQUIRE an image (image-to-video only)
          if (!imageBase64) {
            return NextResponse.json(
              { error: `${model} requires an image input for video generation` },
              { status: 400 }
            )
          }
          
          // Handle duration requirements
          let validDuration = duration
          if (model === 'gen3a_turbo') {
            // gen3a_turbo requires 5 or 10 seconds
            validDuration = duration === 10 ? 10 : 5
          } else if (model === 'gen4_turbo') {
            // gen4_turbo allows 2-10 seconds
            validDuration = Math.max(2, Math.min(10, duration))
          }
          
          result = await runway.imageToVideo.create({
            model: model as 'gen4_turbo' | 'gen3a_turbo',
            promptImage: imageBase64,
            promptText: prompt,
            duration: validDuration as any,
            ratio: ratio as any,
          })
          break

        case 'veo3.1':
        case 'veo3.1_fast':
        case 'veo3':
          // VEO models support BOTH text-to-video AND image-to-video
          
          // Handle duration requirements for VEO models
          let veoDuration = duration
          if (model === 'veo3') {
            veoDuration = 8 // veo3 requires 8 seconds
          } else if (model === 'veo3.1' || model === 'veo3.1_fast') {
            // veo3.1 and veo3.1_fast require 4, 6, or 8 seconds
            if (![4, 6, 8].includes(duration)) {
              veoDuration = 6 // default to 6 seconds
            }
          }
          
          // VEO models have reversed aspect ratio behavior - swap them
          const veoRatioMap: Record<string, string> = {
            '1280:720': '720:1280',
            '720:1280': '1280:720',
            '1920:1080': '1080:1920',
            '1080:1920': '1920:1080'
          }
          const veoRatio = veoRatioMap[ratio] || ratio
          
          if (imageBase64) {
            // Image-to-Video mode
            result = await runway.imageToVideo.create({
              model: model as 'veo3.1' | 'veo3.1_fast' | 'veo3',
              promptImage: imageBase64,
              promptText: prompt,
              duration: veoDuration as any,
              ratio: veoRatio as any,
            })
          } else {
            // Text-to-Video mode (no image required!)
            result = await runway.textToVideo.create({
              model: model as 'veo3.1' | 'veo3.1_fast' | 'veo3',
              promptText: prompt,
              duration: veoDuration as any,
              ratio: veoRatio as any,
            })
          }
          break

        case 'act_two':
          // Act Two model - character animation with character image/video + reference
          if (!characterBase64) {
            return NextResponse.json(
              { error: 'act_two requires a character image input' },
              { status: 400 }
            )
          }
          
          // Use reference video if provided, otherwise use character image as reference
          const referenceUri = referenceBase64 || characterBase64
          const referenceType = referenceBase64 ? 'video' : 'image'
          
          result = await runway.tasks.create({
            model: 'act_two',
            inputs: {
              character: {
                type: 'image',
                uri: characterBase64,
              },
              reference: {
                type: referenceType,
                uri: referenceUri,
              },
              bodyControl: false,
              ratio: ratio as any,
            },
          })
          break

        case 'gen4_aleph':
          // Video to Video model - requires a video input (not currently supported in this endpoint)
          return NextResponse.json(
            { error: 'gen4_aleph (video-to-video) is not yet supported. Please use image-to-video models.' },
            { status: 400 }
          )

        default:
          return NextResponse.json(
            { error: `Unsupported model: ${model}` },
            { status: 400 }
          )
      }

      // Wait for the video to be generated
      // Poll the API until the video is ready
      let taskId = result.id
      let videoUrl = null
      let attempts = 0
      // VEO models need more time (up to 30+ minutes), others are faster
      const maxAttempts = model.startsWith('veo') ? 600 : 240 // 50 minutes for VEO, 20 minutes for others

      console.log(`🎬 Video generation started with task ID: ${taskId}`)
      console.log(`📝 Model: ${model}, Duration: ${duration}s, Ratio: ${ratio}`)
      console.log(`⏰ Max wait time: ${maxAttempts * 5 / 60} minutes`)

      let throttledAttempts = 0
      const maxThrottledAttempts = 60 // 5 minutes of throttled status before giving up

      while (attempts < maxAttempts) {
        const task = await runway.tasks.retrieve(taskId)
        
        console.log(`🔄 Attempt ${attempts + 1}/${maxAttempts}: Status = ${task.status}`)
        
        if (task.status === 'SUCCEEDED') {
          videoUrl = task.output?.[0]
          console.log('✅ Video generation succeeded! URL:', videoUrl)
          // Log full task object to see what resolution info is available
          console.log('📊 Full task object:', JSON.stringify(task, null, 2))
          console.log('📐 Requested ratio:', ratio)
          console.log('🎬 Actual video output:', task.output)
          break
        } else if (task.status === 'FAILED') {
          console.error('❌ Video generation failed:', task.failure)
          throw new Error('Video generation failed: ' + (task.failure || 'Unknown error'))
        } else if (task.status === 'THROTTLED') {
          throttledAttempts++
          if (throttledAttempts >= maxThrottledAttempts) {
            console.error('🚦 Request stuck in THROTTLED state for 5+ minutes')
            
            // Different messages for admin vs regular users
            const errorMessage = isAdmin
              ? 'Video generation is currently throttled by RunwayML. Their API might be experiencing high demand. Please try again later or try a different model (Gen3a Turbo or Gen4 Turbo).'
              : 'Video generation is temporarily unavailable due to high demand. Please try again in a few minutes.'
            
            throw new Error(errorMessage)
          }
          if (throttledAttempts % 12 === 0) {
            console.log(`🚦 Still throttled... ${throttledAttempts * 5 / 60} minutes in queue`)
          }
        } else {
          // Reset throttled counter if status changes to PENDING or RUNNING
          throttledAttempts = 0
        }
        
        // Log progress every minute (12 attempts)
        if (attempts > 0 && attempts % 12 === 0) {
          console.log(`⏳ Still processing... ${attempts * 5 / 60} minutes elapsed (Status: ${task.status})`)
        }
        
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000))
        attempts++
      }

      if (!videoUrl) {
        console.error('⏰ Video generation timed out after', attempts * 5 / 60, 'minutes')
        
        // Different messages for admin vs regular users
        const timeoutMessage = isAdmin
          ? `Video generation timed out after ${maxAttempts * 5 / 60} minutes. Please try again or use a shorter duration.`
          : 'Video generation took too long and timed out. Please try again.'
        
        throw new Error(timeoutMessage)
      }

      // Note: Credits are already deducted by the frontend before calling this API
      // No need to deduct again here

      return NextResponse.json({
        success: true,
        url: videoUrl,
        taskId: taskId,
        model: model,
        prompt: prompt,
        duration: duration,
        ratio: ratio, // Include requested ratio in response
      })

    } catch (error: any) {
      console.error('RunwayML API error:', error)
      
      // Refund credits for failed video generation based on model used
      const REFUND_AMOUNT = VIDEO_CREDITS[model] || 40 // Default to gen4_turbo pricing if unknown
      const refundResult = await refundCredits(user.id, REFUND_AMOUNT)
      
      if (refundResult.success) {
        console.log(`✅ Successfully refunded ${REFUND_AMOUNT} credits to user ${user.id}`)
      } else {
        console.error(`❌ Failed to refund credits to user ${user.id}`, refundResult.error)
      }
      
      // Check if it's a RunwayML insufficient credits error
      if (error.message && error.message.includes('You do not have enough credits')) {
        // Different messages for admin vs regular users
        const creditsErrorMessage = isAdmin
          ? `Insufficient RunwayML API credits. Your ${REFUND_AMOUNT} INFINITO credits have been refunded. Please add credits to your RunwayML account at https://app.runwayml.com/billing or try a cheaper model (Gen4 Turbo uses only 25 RunwayML credits vs 200 for VEO 3).`
          : 'INFINITO is having trouble processing your request right now. We\'re working on it. Your credits have been refunded. Please check back later.'
        
        return NextResponse.json(
          { 
            error: creditsErrorMessage,
            details: isAdmin ? 'RunwayML account credit balance too low' : 'Service temporarily unavailable',
            runwaymlError: true,
            refunded: refundResult.success,
            newBalance: refundResult.newBalance
          },
          { status: 402 } // 402 Payment Required
        )
      }
      
      // General error message - hide technical details from regular users
      const generalErrorMessage = isAdmin
        ? 'Video generation failed: ' + (error.message || 'Unknown error')
        : 'INFINITO is having trouble processing your request right now. We\'re working on it. Your credits have been refunded. Please check back later.'
      
      return NextResponse.json(
        { 
          error: generalErrorMessage,
          details: isAdmin ? (error.response?.data || error.message) : 'Service temporarily unavailable',
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

// GET endpoint to check status of a video generation task
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    const runway = getRunwayClient()
    const task = await runway.tasks.retrieve(taskId)

    return NextResponse.json({
      status: task.status,
      output: task.output,
      progress: task.progress,
      failure: task.failure,
    })

  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status: ' + error.message },
      { status: 500 }
    )
  }
}

