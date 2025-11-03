import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper to check if user is admin
async function checkAdminRole(request: NextRequest) {
  try {
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { isAdmin: false, user: null, error: 'Authorization header required' }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token)
    
    if (userError || !user) {
      return { isAdmin: false, user: null, error: 'Authentication required' }
    }

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Check user role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return { isAdmin: false, user, error: 'User profile not found' }
    }

    return { 
      isAdmin: userProfile.role === 'admin', 
      user, 
      error: null 
    }
  } catch (error) {
    console.error('Error checking admin role:', error)
    return { 
      isAdmin: false, 
      user: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// GET - Fetch context for the user (admin only)
export async function GET(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { searchParams } = new URL(request.url)
    const contextKey = searchParams.get('context_key')
    const contextType = searchParams.get('context_type')
    const scope = searchParams.get('scope')
    const pagePath = searchParams.get('page_path')
    const sessionId = searchParams.get('session_id')

    let query = supabase
      .from('ai_manager_context')
      .select('*')
      .eq('user_id', user.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })

    if (contextKey) {
      query = query.eq('context_key', contextKey)
    }

    if (contextType) {
      query = query.eq('context_type', contextType)
    }

    if (scope) {
      query = query.eq('scope', scope)
    }

    if (pagePath) {
      query = query.eq('page_path', pagePath)
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    // Filter out expired context
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    const { data, error } = await query

    if (error) {
      console.error('Error fetching context:', error)
      return NextResponse.json({ error: 'Failed to fetch context' }, { status: 500 })
    }

    return NextResponse.json({ context: data || [] })
  } catch (error) {
    console.error('Error in GET /api/ai-manager/context:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create or update context (admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      context_key,
      context_value,
      context_type,
      scope = 'global',
      page_path,
      session_id,
      expires_at,
      importance = 5
    } = body

    if (!context_key || !context_value || !context_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: context_key, context_value, context_type' 
      }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Check if context already exists (using the same logic as the unique index)
    let query = supabase
      .from('ai_manager_context')
      .select('id')
      .eq('user_id', user.id)
      .eq('context_key', context_key)
      .eq('scope', scope)

    if (page_path) {
      query = query.eq('page_path', page_path)
    } else {
      query = query.is('page_path', null)
    }

    if (session_id) {
      query = query.eq('session_id', session_id)
    } else {
      query = query.is('session_id', null)
    }

    const { data: existing } = await query.maybeSingle()

    const contextData = {
      user_id: user.id,
      context_key,
      context_value,
      context_type,
      scope,
      page_path: page_path || null,
      session_id: session_id || null,
      expires_at: expires_at || null,
      importance,
      updated_at: new Date().toISOString()
    }

    let data, error

    if (existing) {
      // Update existing context
      const result = await supabase
        .from('ai_manager_context')
        .update(contextData)
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Insert new context
      const result = await supabase
        .from('ai_manager_context')
        .insert(contextData)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Error saving context:', error)
      return NextResponse.json({ error: 'Failed to save context', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ context: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ai-manager/context:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Delete context (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const contextKey = searchParams.get('context_key')

    if (!id && !contextKey) {
      return NextResponse.json({ error: 'ID or context_key is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    let query = supabase
      .from('ai_manager_context')
      .delete()
      .eq('user_id', user.id)

    if (id) {
      query = query.eq('id', id)
    } else if (contextKey) {
      query = query.eq('context_key', contextKey)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting context:', error)
      return NextResponse.json({ error: 'Failed to delete context', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ai-manager/context:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

