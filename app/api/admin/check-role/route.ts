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

// Check admin role endpoint
export async function GET(request: NextRequest) {
  try {
    const { isAdmin, user, error } = await checkAdminRole(request);
    
    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    return NextResponse.json({ 
      isAdmin,
      userId: user?.id,
      email: user?.email 
    });
  } catch (error) {
    console.error('Error in GET /api/admin/check-role:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
