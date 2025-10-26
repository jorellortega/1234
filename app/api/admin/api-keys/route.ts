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

// Get all API keys (admin only)
export async function GET(request: NextRequest) {
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

    // Fetch all API keys with user information
    const { data, error: fetchError } = await supabase
      .from('api_keys')
      .select(`
        *,
        ai_services (
          id,
          name,
          description,
          category,
          icon_name
        )
      `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching API keys:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch API keys', 
        details: fetchError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ apiKeys: data || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/api-keys:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create API key for any user (admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, user, error } = await checkAdminRole(request);
    
    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { serviceId, key, userId } = await request.json();

    if (!serviceId || !key) {
      return NextResponse.json({ 
        error: 'Service ID and API key are required' 
      }, { status: 400 });
    }

    // Basic validation
    if (key.trim().length < 10) {
      return NextResponse.json({ 
        error: 'API key seems too short' 
      }, { status: 400 });
    }

    // Create service role client for database operations (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Check if service exists
    const { data: service, error: serviceError } = await supabase
      .from('ai_services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ 
        error: 'Invalid AI service' 
      }, { status: 400 });
    }

    // Check if user exists (only if userId is provided)
    let userProfile = null;
    if (userId) {
      const { data, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('id', userId)
        .single();

      if (userError || !data) {
        return NextResponse.json({ 
          error: 'Invalid user' 
        }, { status: 400 });
      }
      userProfile = data;
    }

    // For now, store the key as-is (in production, you'd encrypt this)
    const encryptedKey = key;
    const keyHash = btoa(key); // Simple hash for demo - use proper hashing in production

    // Check if there's already a key for this service and user (or system-wide)
    let query = supabase
      .from('api_keys')
      .select('id')
      .eq('service_id', serviceId);
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }
    
    const { data: existingKey, error: existingKeyError } = await query.maybeSingle();

    if (existingKeyError) {
      console.error('Error checking for existing key:', existingKeyError);
      return NextResponse.json({ 
        error: 'Failed to check for existing API key',
        details: existingKeyError.message
      }, { status: 500 });
    }

    let result;
    if (existingKey) {
      // Update existing key
      const { data, error } = await supabase
        .from('api_keys')
        .update({
          encrypted_key: encryptedKey,
          key_hash: keyHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingKey.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new key
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: userId,
          service_id: serviceId,
          key_name: userId ? `${service.name} API Key` : `System ${service.name} API Key`,
          encrypted_key: encryptedKey,
          key_hash: keyHash,
          is_active: true,
          is_visible: false
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ 
      success: true, 
      message: userId 
        ? `${service.name} API key saved successfully for ${userProfile.email}`
        : `${service.name} system API key saved successfully`,
      apiKey: result
    });

  } catch (error) {
    console.error('Error in POST /api/admin/api-keys:', error);
    return NextResponse.json({ 
      error: 'Failed to save API key' 
    }, { status: 500 });
  }
}
