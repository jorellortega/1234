import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper function to check authentication
async function checkAuth(request: NextRequest) {
  try {
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { user: null, error: "Authorization header required" }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token)
    
    if (userError || !user) {
      return { user: null, error: "Authentication required" }
    }

    return { user, error: null }
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get available voices for users (filtered by admin settings)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await checkAuth(request)
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get admin audio settings
    const { data: adminSettings, error: adminError } = await supabase
      .from('admin_preferences')
      .select(`
        available_voice_ids,
        default_voice_id,
        allow_custom_voices,
        voice_selection_enabled
      `)
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (adminError) {
      console.error('Error fetching admin settings:', adminError)
      return NextResponse.json({ error: 'Failed to fetch voice settings' }, { status: 500 })
    }

    // If voice selection is disabled, return empty array
    if (!adminSettings.voice_selection_enabled) {
      return NextResponse.json({ 
        voices: [],
        default_voice_id: adminSettings.default_voice_id,
        voice_selection_enabled: false
      })
    }

    const availableVoices = []
    const defaultVoices = [
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft, professional female voice', category: 'premade' },
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, young female voice', category: 'premade' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong, confident female voice', category: 'premade' },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded male voice', category: 'premade' },
      { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Emotional, young female voice', category: 'premade' },
      { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep, young male voice', category: 'premade' },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp, middle-aged male voice', category: 'premade' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, middle-aged male voice', category: 'premade' },
      { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Raspy, young male voice', category: 'premade' },
      { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual, Australian male voice', category: 'premade' }
    ]

    console.log('🎵 Admin available_voice_ids:', adminSettings.available_voice_ids)

    // First, try to fetch custom voices from ElevenLabs if they're allowed
    let customVoicesFromAPI = []
    if (adminSettings.allow_custom_voices) {
      try {
        console.log('🎵 Fetching custom voices from ElevenLabs...')
        // Get ElevenLabs API key
        const { data: apiKeyData, error: apiKeyError } = await supabase
          .from('api_keys')
          .select('encrypted_key')
          .eq('service_id', 'elevenlabs')
          .eq('is_active', true)
          .maybeSingle()

        if (apiKeyData && !apiKeyError) {
          const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: {
              'xi-api-key': apiKeyData.encrypted_key,
            }
          })

          if (elevenLabsResponse.ok) {
            const voicesData = await elevenLabsResponse.json()
            console.log('🎵 ElevenLabs voices fetched:', voicesData.voices?.length || 0)
            customVoicesFromAPI = voicesData.voices || []
          } else {
            console.error('🎵 ElevenLabs API error:', elevenLabsResponse.status)
          }
        } else {
          console.log('🎵 No ElevenLabs API key found')
        }
      } catch (error) {
        console.error('🎵 Error fetching custom voices:', error)
      }
    }

    // Now filter voices based on admin's allowed list
    if (adminSettings.available_voice_ids && adminSettings.available_voice_ids.length > 0) {
      console.log('🎵 Filtering voices based on admin selection:', adminSettings.available_voice_ids)
      
      // Add default voices that are in the allowed list
      for (const voice of defaultVoices) {
        if (adminSettings.available_voice_ids.includes(voice.id)) {
          availableVoices.push(voice)
        }
      }
      
      // Add custom voices that are in the allowed list
      for (const voice of customVoicesFromAPI) {
        if (adminSettings.available_voice_ids.includes(voice.voice_id)) {
          availableVoices.push(voice)
        }
      }
    } else {
      // If no voices are specifically selected, add all default voices as fallback
      console.log('🎵 No voices selected, adding all default voices as fallback')
      availableVoices.push(...defaultVoices)
    }


    console.log('🎵 Final available voices:', availableVoices.length)

    return NextResponse.json({
      voices: availableVoices,
      default_voice_id: adminSettings.default_voice_id,
      voice_selection_enabled: adminSettings.voice_selection_enabled,
      admin_default_voice: adminSettings.default_voice_id
    })
  } catch (error) {
    console.error('Available voices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
