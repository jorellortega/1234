import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { userId, credits } = await request.json()
    
    console.log('🧪 Test: Adding credits manually')
    console.log('👤 User ID:', userId)
    console.log('💰 Credits:', credits)
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { error } = await supabase.rpc('add_user_credits', {
      user_id: userId,
      credits_to_add: credits,
      transaction_type: 'purchase',
      description: 'Manual credit addition for testing',
      reference_id: 'test_manual_' + Date.now()
    })
    
    if (error) {
      console.error('❌ Error adding credits:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log(`✅ Successfully added ${credits} credits to user ${userId}`)
    return NextResponse.json({ success: true, message: `Added ${credits} credits` })
    
  } catch (error) {
    console.error('❌ Test API error:', error)
    return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
  }
}
