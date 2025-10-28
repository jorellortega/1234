import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper function to check if user is admin
async function checkAdminRole(request: NextRequest) {
  try {
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return { isAdmin: false, user: null };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      return { isAdmin: false, user: null };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { isAdmin: false, user };
    }

    return { 
      isAdmin: userProfile.role === 'admin', 
      user 
    };
  } catch (error) {
    console.error('Error checking admin role:', error);
    return { isAdmin: false, user: null };
  }
}

// GET - Fetch admin preferences (available to all authenticated users)
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated (not necessarily admin for reading)
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use service role to fetch preferences (all users can read)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Fetch preferences (there should only be one row)
    const { data, error } = await supabase
      .from('admin_preferences')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching admin preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error('Error in GET /api/admin/preferences:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update admin preferences
export async function PUT(request: NextRequest) {
  try {
    const { isAdmin, user } = await checkAdminRole(request);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Build update object - only include fields that are provided
    const updateData: any = {}
    
    // Model availability toggles
    if (body.model_openai !== undefined) updateData.model_openai = body.model_openai
    if (body.model_gpt !== undefined) updateData.model_gpt = body.model_gpt
    if (body.model_llama !== undefined) updateData.model_llama = body.model_llama
    if (body.model_mistral !== undefined) updateData.model_mistral = body.model_mistral
    if (body.model_custom !== undefined) updateData.model_custom = body.model_custom
    if (body.model_rag !== undefined) updateData.model_rag = body.model_rag
    if (body.model_web !== undefined) updateData.model_web = body.model_web
    if (body.model_blip !== undefined) updateData.model_blip = body.model_blip
    if (body.model_llava !== undefined) updateData.model_llava = body.model_llava
    if (body.model_dalle_image !== undefined) updateData.model_dalle_image = body.model_dalle_image
    if (body.model_runway_image !== undefined) updateData.model_runway_image = body.model_runway_image
    if (body.model_gen4_turbo !== undefined) updateData.model_gen4_turbo = body.model_gen4_turbo
    if (body.model_gen3a_turbo !== undefined) updateData.model_gen3a_turbo = body.model_gen3a_turbo
    if (body.model_gen4_aleph !== undefined) updateData.model_gen4_aleph = body.model_gen4_aleph
    
    // Model selections (which model is currently selected)
    if (body.selected_text_model !== undefined) updateData.selected_text_model = body.selected_text_model
    if (body.selected_image_model !== undefined) updateData.selected_image_model = body.selected_image_model
    if (body.selected_video_model !== undefined) updateData.selected_video_model = body.selected_video_model
    if (body.selected_audio_model !== undefined) updateData.selected_audio_model = body.selected_audio_model

    // Update preferences (update the single row)
    const { data, error } = await supabase
      .from('admin_preferences')
      .update(updateData)
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()
      .single();

    if (error) {
      console.error('Error updating admin preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      preferences: data 
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/preferences:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

