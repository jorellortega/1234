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

// GET - Fetch tasks for the user (admin only)
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
    const intentId = searchParams.get('intent_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('ai_manager_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })

    if (intentId) {
      query = query.eq('intent_id', intentId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({ tasks: data || [] })
  } catch (error) {
    console.error('Error in GET /api/ai-manager/tasks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create a new task or multiple tasks (admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { tasks, task } = body

    // Support both single task and array of tasks
    const tasksToInsert = tasks || (task ? [task] : [])

    if (tasksToInsert.length === 0) {
      return NextResponse.json({ error: 'No tasks provided' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Validate and prepare tasks
    const preparedTasks = tasksToInsert.map((t: any, index: number) => ({
      user_id: user.id,
      intent_id: t.intent_id || null,
      task_title: t.task_title || t.title,
      task_description: t.task_description || t.description || null,
      task_type: t.task_type || 'other',
      ai_service: t.ai_service || null,
      ai_model: t.ai_model || null,
      task_params: t.task_params || t.params || {},
      status: t.status || 'pending',
      priority: t.priority || 5,
      order_index: t.order_index !== undefined ? t.order_index : index,
      depends_on_task_id: t.depends_on_task_id || null
    }))

    // Validate required fields
    for (const task of preparedTasks) {
      if (!task.task_title) {
        return NextResponse.json({ error: 'task_title is required for all tasks' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('ai_manager_tasks')
      .insert(preparedTasks)
      .select()

    if (error) {
      console.error('Error creating tasks:', error)
      return NextResponse.json({ error: 'Failed to create tasks', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ai-manager/tasks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Update a task (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Verify the task belongs to the user
    const { data: existingTask, error: fetchError } = await supabase
      .from('ai_manager_tasks')
      .select('user_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update timestamps based on status changes
    if (updates.status) {
      if (updates.status === 'in_progress' && existingTask.status === 'pending') {
        updates.started_at = new Date().toISOString()
      }
      if (updates.status === 'completed' && existingTask.status !== 'completed') {
        updates.completed_at = new Date().toISOString()
        if (updates.started_at || existingTask.started_at) {
          const startTime = new Date(updates.started_at || existingTask.started_at).getTime()
          const endTime = new Date().getTime()
          updates.execution_time_ms = endTime - startTime
        }
      }
    }

    const { data, error } = await supabase
      .from('ai_manager_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Failed to update task', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ task: data })
  } catch (error) {
    console.error('Error in PUT /api/ai-manager/tasks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Delete a task (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Verify the task belongs to the user
    const { data: existingTask, error: fetchError } = await supabase
      .from('ai_manager_tasks')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('ai_manager_tasks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting task:', error)
      return NextResponse.json({ error: 'Failed to delete task', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ai-manager/tasks:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

