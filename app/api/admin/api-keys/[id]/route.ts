import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper function to check if user is admin
async function checkAdminRole(request: NextRequest) {
  try {
    // Create Supabase client with anon key for user authentication
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return { isAdmin: false, user: null, error: "Authorization header required" };
    }

    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      return { isAdmin: false, user: null, error: "Authentication required" };
    }

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Check user role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { isAdmin: false, user, error: "User profile not found" };
    }

    return { 
      isAdmin: userProfile.role === 'admin', 
      user, 
      error: null 
    };
  } catch (error) {
    console.error('Error checking admin role:', error);
    return { 
      isAdmin: false, 
      user: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Delete API key (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, user, error } = await checkAdminRole(request);
    
    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting API key:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete API key', 
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API key deleted successfully' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/api-keys/[id]:', error);
    return NextResponse.json({ 
      error: 'Failed to delete API key' 
    }, { status: 500 });
  }
}

// Update API key (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, user, error } = await checkAdminRole(request);
    
    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { isActive, isVisible } = await request.json();

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.is_active = isActive;
    if (typeof isVisible === 'boolean') updateData.is_visible = isVisible;

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error: updateError } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating API key:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update API key', 
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API key updated successfully',
      apiKey: data
    });

  } catch (error) {
    console.error('Error in PATCH /api/admin/api-keys/[id]:', error);
    return NextResponse.json({ 
      error: 'Failed to update API key' 
    }, { status: 500 });
  }
}
