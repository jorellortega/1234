import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use the same environment variables as the working memories system
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

// Simple health check endpoint
export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is available
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not configured',
        message: 'Please set up your Supabase environment variables to use this feature.',
        setupRequired: true
      }, { status: 503 })
    }

    // First check if the tables exist by trying to fetch from ai_services
    try {
      const { data: services, error: servicesError } = await supabase
        .from('ai_services')
        .select('*')
        .limit(1)

      if (servicesError) {
        console.error('Error checking ai_services table:', servicesError)
        return NextResponse.json({ 
          error: 'Database tables not set up yet. Please run the database schema first.',
          details: servicesError.message,
          setupRequired: true
        }, { status: 500 })
      }
    } catch (tableError) {
      console.error('Error checking database tables:', tableError)
      return NextResponse.json({ 
        error: 'Database connection failed. Please check your Supabase configuration.',
        details: tableError instanceof Error ? tableError.message : 'Unknown error',
        setupRequired: true
      }, { status: 500 })
    }

    // For now, fetch all API keys (similar to how memories work)
    // TODO: Add proper user authentication later
    const { data, error } = await supabase
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ apiKeys: data || [] })
  } catch (error) {
    console.error('Error in GET /api/ai-settings:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { serviceId, key } = await request.json()

    if (!serviceId || !key) {
      return NextResponse.json({ 
        error: 'Service ID and API key are required' 
      }, { status: 400 })
    }

    // Basic validation
    if (key.trim().length < 10) {
      return NextResponse.json({ 
        error: 'API key seems too short' 
      }, { status: 400 })
    }

    // Check if service exists
    const { data: service, error: serviceError } = await supabase
      .from('ai_services')
      .select('*')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ 
        error: 'Invalid AI service' 
      }, { status: 400 })
    }

    // For now, store the key as-is (in production, you'd encrypt this)
    // TODO: Implement proper encryption
    const encryptedKey = key
    const keyHash = btoa(key) // Simple hash for demo - use proper hashing in production

    // Check if there's already a key for this service
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id')
      .eq('service_id', serviceId)
      .single()

    let result
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
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new key (without user_id for now)
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          service_id: serviceId,
          key_name: `${service.name} API Key`,
          encrypted_key: encryptedKey,
          key_hash: keyHash,
          is_active: true,
          is_visible: false
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({ 
      success: true, 
      message: `${service.name} API key saved successfully`,
      apiKey: result
    })

  } catch (error) {
    console.error('Error in POST /api/ai-settings:', error)
    return NextResponse.json({ 
      error: 'Failed to save API key' 
    }, { status: 500 })
  }
}
