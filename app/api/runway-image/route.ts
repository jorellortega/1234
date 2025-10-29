import { NextRequest, NextResponse } from 'next/server'
import Runway from '@runwayml/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * RunwayML Text-to-Image Generation API
 * 
 * Using RunwayML Gen-4 Image for text-to-image generation
 * 
 * Pricing Structure:
 * - RunwayML API Cost: ~10 credits per image
 * - User Cost: 16 credits per image (60% markup)
 * - Profit Margin: 6 credits per image
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

    // Parse request body
    const body = await req.json()
    const { prompt, model = 'gen4_image' } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Validate model
    const validModels = ['gen4_image', 'gen4_image_turbo', 'gemini_2.5_flash', 'runway_image']
    const modelToUse = validModels.includes(model) ? model : 'gen4_image'

    // Initialize Runway client
    const runway = getRunwayClient()

    try {
      // Map frontend model names to RunwayML API model names
      let runwayModelName: 'gen4_image' | 'gen4_image_turbo' | 'gemini_2.5_flash' = 'gen4_image'
      if (modelToUse === 'gen4_image_turbo') {
        runwayModelName = 'gen4_image_turbo'
      } else if (modelToUse === 'gemini_2.5_flash') {
        runwayModelName = 'gemini_2.5_flash'
      } else if (modelToUse === 'runway_image') {
        // Legacy model - map to gen4_image
        runwayModelName = 'gen4_image'
      }

      // Use RunwayML text-to-image generation
      const result = await runway.textToImage.create({
        model: runwayModelName,
        promptText: prompt,
        ratio: '1024:1024', // Square format for images
      })

      // Wait for the generation to complete
      let taskId = result.id
      let outputUrl = null
      let attempts = 0
      const maxAttempts = 120 // 10 minutes (5 seconds per attempt)

      while (attempts < maxAttempts) {
        const task = await runway.tasks.retrieve(taskId)
        
        if (task.status === 'SUCCEEDED') {
          outputUrl = task.output?.[0]
          break
        } else if (task.status === 'FAILED') {
          throw new Error('Image generation failed: ' + (task.failure || 'Unknown error'))
        }
        
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000))
        attempts++
      }

      if (!outputUrl) {
        throw new Error('Image generation timed out')
      }

      // Create model-specific messages
      const modelMessages = {
        'gen4_image': 'Generated using RunwayML Gen4 Image - High-quality AI image generation.',
        'gen4_image_turbo': 'Generated using RunwayML Gen4 Image Turbo - Fast, high-quality AI image generation.',
        'gemini_2.5_flash': 'Generated using Gemini 2.5 Flash - Advanced AI image generation.',
        'runway_image': 'Generated using RunwayML Gen4 Image - High-quality AI image generation.'
      }

      return NextResponse.json({
        success: true,
        url: outputUrl,
        taskId: taskId,
        prompt: prompt,
        type: 'image',
        model: modelToUse,
        message: modelMessages[modelToUse as keyof typeof modelMessages] || modelMessages['gen4_image']
      })

    } catch (error: any) {
      console.error('RunwayML Image API error:', error)
      return NextResponse.json(
        { 
          error: 'Image generation failed: ' + (error.message || 'Unknown error'),
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

