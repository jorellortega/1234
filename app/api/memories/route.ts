import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const parentId = searchParams.get('parent_id')
    const hierarchyLevel = searchParams.get('hierarchy_level')
    
    // Create Supabase client with anon key for user authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }
    
    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    let query = supabase.from('memories').select('*').eq('user_id', user.id)
    
    // Filter by category if specified
    if (category) {
      query = query.eq('memory_category', category)
    }
    
    // Filter by parent (for sub-memories)
    if (parentId === 'null') {
      // Get only root memories (no parent)
      query = query.is('parent_id', null)
    } else if (parentId) {
      // Get sub-memories of a specific parent
      query = query.eq('parent_id', parentId)
    }
    
    // Filter by hierarchy level
    if (hierarchyLevel) {
      query = query.eq('hierarchy_level', parseInt(hierarchyLevel))
    }
    
    // Order by hierarchy level, then sort order (descending so newest first), then salience, then created_at
    const { data: memories, error } = await query
      .order('hierarchy_level', { ascending: true })
      .order('sort_order', { ascending: false })
      .order('salience', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching memories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      )
    }

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      concept, 
      data, 
      salience, 
      connections, 
      memory_type, 
      priority,
      parent_id,
      memory_category,
      hierarchy_level,
      sort_order
    } = body

    // Validate required fields
    if (!concept || !data || salience === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: concept, data, salience' },
        { status: 400 }
      )
    }

    // Validate salience range
    if (salience < 0 || salience > 1) {
      return NextResponse.json(
        { error: 'Salience must be between 0 and 1' },
        { status: 400 }
      )
    }

    // Create Supabase client with anon key for user authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }
    
    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // If this is a sub-memory, calculate hierarchy level
    let finalHierarchyLevel = hierarchy_level || 0
    let finalSortOrder = sort_order || 0
    
    if (parent_id) {
      // Get parent memory to determine hierarchy level
      const { data: parentMemory } = await supabase
        .from('memories')
        .select('hierarchy_level')
        .eq('id', parent_id)
        .single()
      
      if (parentMemory) {
        finalHierarchyLevel = parentMemory.hierarchy_level + 1
      }
      
      // Get the next sort order for this parent
      const { data: siblings } = await supabase
        .from('memories')
        .select('sort_order')
        .eq('parent_id', parent_id)
        .order('sort_order', { ascending: false })
        .limit(1)
      
      if (siblings && siblings.length > 0) {
        finalSortOrder = siblings[0].sort_order + 1
      }
    }
    
    const { data: newMemory, error } = await supabase
      .from('memories')
      .insert({
        concept,
        data,
        salience,
        connections: connections || [],
        memory_type: memory_type || 'core',
        priority: priority || 1,
        parent_id: parent_id || null,
        memory_category: memory_category || 'general',
        hierarchy_level: finalHierarchyLevel,
        sort_order: finalSortOrder,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating memory:', error)
      return NextResponse.json(
        { error: 'Failed to create memory' },
        { status: 500 }
      )
    }

    return NextResponse.json({ memory: newMemory }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
