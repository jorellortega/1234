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

// GET - Fetch questions for an intent (admin only)
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
      .from('ai_manager_questions')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (intentId) {
      query = query.eq('intent_id', intentId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching questions:', error)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    return NextResponse.json({ questions: data || [] })
  } catch (error) {
    console.error('Error in GET /api/ai-manager/questions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create questions (can be single or multiple) (admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { questions, question } = body

    // Support both single question and array of questions
    const questionsToInsert = questions || (question ? [question] : [])

    if (questionsToInsert.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Validate and prepare questions
    const preparedQuestions = questionsToInsert.map((q: any) => ({
      user_id: user.id,
      intent_id: q.intent_id || null,
      question_text: q.question_text || q.question,
      question_type: q.question_type || 'clarification',
      is_required: q.is_required !== undefined ? q.is_required : true,
      related_field: q.related_field || null,
      priority: q.priority || 5,
      status: 'pending'
    }))

    // Validate required fields
    for (const q of preparedQuestions) {
      if (!q.question_text) {
        return NextResponse.json({ error: 'question_text is required for all questions' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('ai_manager_questions')
      .insert(preparedQuestions)
      .select()

    if (error) {
      console.error('Error creating questions:', error)
      return NextResponse.json({ error: 'Failed to create questions', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ questions: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ai-manager/questions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Answer a question or update question status (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, answer, status: newStatus } = body

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Verify the question belongs to the user
    const { data: existingQuestion, error: fetchError } = await supabase
      .from('ai_manager_questions')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    if (existingQuestion.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Prepare update
    const updateData: any = {}
    if (answer !== undefined) {
      updateData.answer = answer
      updateData.answered_at = new Date().toISOString()
      updateData.status = 'answered'
    }
    if (newStatus) {
      updateData.status = newStatus
    }

    const { data, error } = await supabase
      .from('ai_manager_questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating question:', error)
      return NextResponse.json({ error: 'Failed to update question', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ question: data })
  } catch (error) {
    console.error('Error in PUT /api/ai-manager/questions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Delete a question (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin, user, error: authError } = await checkAdminRole(request)
    
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Verify the question belongs to the user
    const { data: existingQuestion, error: fetchError } = await supabase
      .from('ai_manager_questions')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    if (existingQuestion.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('ai_manager_questions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting question:', error)
      return NextResponse.json({ error: 'Failed to delete question', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ai-manager/questions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

