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

// GET - Fetch all rules for the user (admin only)
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const ruleType = searchParams.get('rule_type')
    const isActive = searchParams.get('is_active')
    const pagePath = searchParams.get('page_path')

    let query = supabase
      .from('ai_manager_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (ruleType) {
      query = query.eq('rule_type', ruleType)
    }
    
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    
    if (pagePath) {
      query = query.or(`page_path.eq.${pagePath},scope.eq.global`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching rules:', error)
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
    }

    return NextResponse.json({ rules: data || [] })
  } catch (error) {
    console.error('Error in GET /api/ai-manager/rules:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create a new rule (admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      rule_name,
      rule_type,
      rule_content,
      description,
      scope = 'global',
      page_path,
      priority = 5,
      is_active = true,
      applies_to = ['all']
    } = body

    if (!rule_name || !rule_type || !rule_content) {
      return NextResponse.json({ 
        error: 'Missing required fields: rule_name, rule_type, rule_content' 
      }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data, error } = await supabase
      .from('ai_manager_rules')
      .insert({
        user_id: user.id,
        rule_name,
        rule_type,
        rule_content,
        description,
        scope,
        page_path,
        priority,
        is_active,
        applies_to
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating rule:', error)
      return NextResponse.json({ error: 'Failed to create rule', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ rule: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ai-manager/rules:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Update a rule (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // First verify the rule belongs to the user
    const { data: existingRule, error: fetchError } = await supabase
      .from('ai_manager_rules')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    if (existingRule.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('ai_manager_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating rule:', error)
      return NextResponse.json({ error: 'Failed to update rule', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('Error in PUT /api/ai-manager/rules:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Delete a rule (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Verify the rule belongs to the user
    const { data: existingRule, error: fetchError } = await supabase
      .from('ai_manager_rules')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    if (existingRule.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('ai_manager_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting rule:', error)
      return NextResponse.json({ error: 'Failed to delete rule', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ai-manager/rules:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

