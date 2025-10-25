import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { requiredCredits, operation } = await request.json()
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }
    
    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has sufficient credits
    const { data: hasCredits, error: checkError } = await supabase.rpc('has_sufficient_credits', {
      user_id: user.id,
      required_credits: requiredCredits
    })

    if (checkError) {
      console.error('Error checking credits:', checkError)
      return NextResponse.json(
        { error: 'Failed to check credits' },
        { status: 500 }
      )
    }

    if (!hasCredits) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        requiredCredits,
        message: `You need ${requiredCredits} credits to perform this operation`
      })
    }

    // If operation is 'check_and_deduct', deduct the credits
    if (operation === 'check_and_deduct') {
      const { data: deducted, error: deductError } = await supabase.rpc('deduct_user_credits', {
        user_id: user.id,
        credits_to_deduct: requiredCredits,
        transaction_type: 'ai_generation',
        description: 'AI generation request',
        reference_id: `gen_${Date.now()}`
      })

      if (deductError || !deducted) {
        console.error('Error deducting credits:', deductError)
        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        )
      }
    }

    // Get updated credit balance
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      credits: profile?.credits || 0,
      deducted: operation === 'check_and_deduct' ? requiredCredits : 0
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
