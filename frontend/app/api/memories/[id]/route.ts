import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = supabaseServer()
    
    const { data: memory, error } = await supabase
      .from('memories')
      .select('*')
      .eq('id', id)
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

    const supabase = supabaseServer()
    
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
    const supabase = supabaseServer()
    
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)

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




