import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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
    
    const { data: memory, error } = await supabase
      .from('memories')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Memory not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching memory:', error)
      return NextResponse.json(
        { error: 'Failed to fetch memory' },
        { status: 500 }
      )
    }

    return NextResponse.json({ memory })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { concept, data, salience, connections, memory_type, priority } = body

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
    
    // Verify the memory exists and belongs to the user
    const { data: memory, error: fetchError } = await supabase
      .from('memories')
      .select('id, user_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }
    
    // Verify ownership
    if (memory.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own memories' },
        { status: 403 }
      )
    }
    
    const { data: updatedMemory, error } = await supabase
      .from('memories')
      .update({
        concept,
        data,
        salience,
        connections: connections || [],
        memory_type: memory_type || 'core',
        priority: priority || 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Memory not found' },
          { status: 404 }
        )
      }
      console.error('Error updating memory:', error)
      return NextResponse.json(
        { error: 'Failed to update memory' },
        { status: 500 }
      )
    }

    return NextResponse.json({ memory: updatedMemory })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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
    
    // Verify the memory exists and belongs to the user
    const { data: memory, error: fetchError } = await supabase
      .from('memories')
      .select('id, user_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }
    
    // Verify ownership
    if (memory.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own memories' },
        { status: 403 }
      )
    }
    
    // Delete the memory
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting memory:', error)
      return NextResponse.json(
        { error: 'Failed to delete memory' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Memory deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




