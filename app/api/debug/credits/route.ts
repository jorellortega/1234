import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { debugLog } from '@/lib/debug-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  console.log('🔍 Debug Credits API: Starting debug check')
  
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }
    
    console.log('👤 Debugging credits for user:', userId)
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    console.log('📊 User profile:', {
      exists: !!profile,
      profile: profile,
      error: profileError?.message
    })
    
    // Get recent transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('credits_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('📝 Recent transactions:', {
      count: transactions?.length || 0,
      transactions: transactions,
      error: transactionError?.message
    })
    
    // Test database functions
    console.log('🧪 Testing database functions...')
    
    // Test has_sufficient_credits function
    const { data: hasCredits, error: hasCreditsError } = await supabase.rpc('has_sufficient_credits', {
      user_id: userId,
      required_credits: 1
    })
    
    console.log('🔍 Has sufficient credits test:', {
      result: hasCredits,
      error: hasCreditsError?.message
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        profile: profile,
        currentCredits: profile?.credits || 0,
        profileExists: !!profile
      },
      transactions: {
        count: transactions?.length || 0,
        recent: transactions
      },
      tests: {
        hasSufficientCredits: hasCredits,
        hasSufficientCreditsError: hasCreditsError?.message
      }
    })
    
  } catch (error) {
    console.error('❌ Debug API error:', error)
    return NextResponse.json(
      { error: 'Debug check failed', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  console.log('🔍 Debug Credits API: Starting test credit addition')
  
  try {
    const { userId, credits = 10, description = 'Debug test' } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    
    console.log('🧪 Testing credit addition:', { userId, credits, description })
    
    // Get current credits
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', userId)
      .single()
    
    const currentCredits = currentProfile?.credits || 0
    console.log('📊 Current credits:', currentCredits)
    
    // Add test credits
    const { error } = await supabase.rpc('add_user_credits', {
      user_id: userId,
      credits_to_add: credits,
      transaction_type: 'test',
      description: description,
      reference_id: `debug_${Date.now()}`
    })
    
    if (error) {
      console.error('❌ Error adding test credits:', error)
      return NextResponse.json({ error: 'Failed to add test credits', details: error.message }, { status: 500 })
    }
    
    // Verify credits were added
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', userId)
      .single()
    
    const newCredits = updatedProfile?.credits || 0
    console.log('✅ Test completed:', {
      oldCredits: currentCredits,
      newCredits: newCredits,
      added: newCredits - currentCredits,
      expected: credits
    })
    
    return NextResponse.json({
      success: true,
      test: {
        userId,
        creditsAdded: credits,
        oldCredits: currentCredits,
        newCredits: newCredits,
        actualAdded: newCredits - currentCredits,
        success: (newCredits - currentCredits) === credits
      }
    })
    
  } catch (error) {
    console.error('❌ Debug test error:', error)
    return NextResponse.json(
      { error: 'Debug test failed', details: error.message },
      { status: 500 }
    )
  }
}
