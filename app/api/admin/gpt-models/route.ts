import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Fetch GPT model preferences
    const { data: preferences, error } = await supabase
      .from('gpt_model_preferences')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      console.error('Error fetching GPT model preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ models: preferences || [] })
  } catch (error) {
    console.error('Error in GET /api/admin/gpt-models:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { models } = await request.json()

    if (!models || !Array.isArray(models)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Delete all existing preferences
    await supabase.from('gpt_model_preferences').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert new preferences
    const { error: insertError } = await supabase
      .from('gpt_model_preferences')
      .insert(models.map(model => ({
        model_id: model.id,
        model_name: model.name,
        input_cost: model.inputCost,
        output_cost: model.outputCost,
        cached_input_cost: model.cachedInputCost || null,
        enabled: model.enabled,
        category: model.category,
        description: model.description || null
      })))

    if (insertError) {
      console.error('Error saving GPT model preferences:', insertError)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Model preferences saved successfully' })
  } catch (error) {
    console.error('Error in POST /api/admin/gpt-models:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

