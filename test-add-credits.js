// Test script to manually add credits
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function addCredits() {
  try {
    const { error } = await supabase.rpc('add_user_credits', {
      user_id: 'd6c6adba-2b70-4121-b6ca-a07335c0de67',
      credits_to_add: 50,
      transaction_type: 'purchase',
      description: 'Manual credit addition for testing',
      reference_id: 'test_manual_addition'
    })
    
    if (error) {
      console.error('❌ Error adding credits:', error)
    } else {
      console.log('✅ Successfully added 50 credits')
    }
  } catch (err) {
    console.error('❌ Script error:', err)
  }
}

addCredits()
