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

// Get user's audio preferences
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

    // Get user's audio preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_audio_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (prefError && prefError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching user audio preferences:', prefError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          preferred_voice_id: 'EXAVITQu4vr4xnSDxMaL',
          preferred_model_id: 'eleven_multilingual_v2',
          stability: 0.50,
          similarity_boost: 0.75,
          style: 0.00,
          use_speaker_boost: true,
          output_format: 'mp3_44100_128',
          optimize_streaming_latency: 0
        }
      })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('User audio preferences GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update user's audio preferences
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await checkAuth(request)
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const body = await request.json()
    const {
      preferred_voice_id,
      preferred_model_id,
      stability,
      similarity_boost,
      style,
      use_speaker_boost,
      output_format,
      optimize_streaming_latency
    } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Upsert user preferences (update if exists, insert if not)
    const { data, error: upsertError } = await supabase
      .from('user_audio_preferences')
      .upsert({
        user_id: user.id,
        preferred_voice_id,
        preferred_model_id,
        stability,
        similarity_boost,
        style,
        use_speaker_boost,
        output_format,
        optimize_streaming_latency
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error updating user audio preferences:', upsertError)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      preferences: data 
    })
  } catch (error) {
    console.error('User audio preferences PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
