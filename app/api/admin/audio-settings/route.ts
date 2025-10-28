import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    // Get audio settings from admin_preferences
    const { data: settings, error: settingsError } = await supabase
      .from('admin_preferences')
      .select(`
        elevenlabs_voice_id,
        elevenlabs_model_id,
        elevenlabs_stability,
        elevenlabs_similarity_boost,
        elevenlabs_style,
        elevenlabs_use_speaker_boost,
        audio_output_format,
        audio_optimize_streaming_latency
      `)
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (settingsError) {
      console.error('Error fetching audio settings:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Audio settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate settings
    const {
      elevenlabs_voice_id,
      elevenlabs_model_id,
      elevenlabs_stability,
      elevenlabs_similarity_boost,
      elevenlabs_style,
      elevenlabs_use_speaker_boost,
      audio_output_format,
      audio_optimize_streaming_latency,
    } = body

    // Update audio settings
    const { error: updateError } = await supabase
      .from('admin_preferences')
      .update({
        elevenlabs_voice_id,
        elevenlabs_model_id,
        elevenlabs_stability,
        elevenlabs_similarity_boost,
        elevenlabs_style,
        elevenlabs_use_speaker_boost,
        audio_output_format,
        audio_optimize_streaming_latency,
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')

    if (updateError) {
      console.error('Error updating audio settings:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Audio settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

