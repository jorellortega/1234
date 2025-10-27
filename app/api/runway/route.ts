import { NextRequest, NextResponse } from 'next/server'
import Runway from '@runwayml/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * RunwayML Video Generation API
 * 
 * Pricing Structure:
 * - RunwayML API Cost: 10 credits per video
 * - User Cost: 26 credits per video (60% markup)
 * - Profit Margin: 16 credits per video
 * 
 * Note: Credits are deducted by the frontend before calling this API
 */

// Initialize Runway client with API key from environment
const getRunwayClient = () => {
  const apiKey = process.env.RUNWAYML_API_SECRET
  if (!apiKey) {
    throw new Error('RUNWAYML_API_SECRET environment variable is not set')
  }
  return new Runway({ apiKey })
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

    // Parse form data
    const formData = await req.formData()
    const prompt = formData.get('prompt') as string
    const model = formData.get('model') as string
    const duration = parseInt(formData.get('duration') as string) || 5
    const file = formData.get('file') as File | null
    const ratio = formData.get('ratio') as string || '1280:768'

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

    // Handle different model types
    try {
      switch (model) {
        case 'gen4_turbo':
        case 'gen3a_turbo':
          // These models require an image
          if (!imageBase64) {
            return NextResponse.json(
              { error: `${model} requires an image input` },
              { status: 400 }
            )
          }
          result = await runway.imageToVideo.create({
            model: model as 'gen4_turbo' | 'gen3a_turbo',
            promptImage: imageBase64,
            promptText: prompt,
            duration: duration as 5 | 10,
            ratio: ratio as any,
          })
          break

        case 'gen4_aleph':
          // Gen4 Aleph can work with or without image
          if (imageBase64) {
            result = await runway.imageToVideo.create({
              model: 'gen4_aleph',
              promptImage: imageBase64,
              promptText: prompt,
              duration: duration as 5 | 10,
              ratio: ratio as any,
            })
          } else {
            // Text-to-video
            result = await runway.imageToVideo.create({
              model: 'gen4_aleph',
              promptText: prompt,
              duration: duration as 5 | 10,
              ratio: ratio as any,
            })
          }
          break

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
      const maxAttempts = 120 // 10 minutes (5 seconds per attempt)

      while (attempts < maxAttempts) {
        const task = await runway.tasks.retrieve(taskId)
        
        if (task.status === 'SUCCEEDED') {
          videoUrl = task.output?.[0]
          break
        } else if (task.status === 'FAILED') {
          throw new Error('Video generation failed: ' + (task.failure || 'Unknown error'))
        }
        
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000))
        attempts++
      }

      if (!videoUrl) {
        throw new Error('Video generation timed out')
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
      })

    } catch (error: any) {
      console.error('RunwayML API error:', error)
      return NextResponse.json(
        { 
          error: 'Video generation failed: ' + (error.message || 'Unknown error'),
          details: error.response?.data || error.message
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

