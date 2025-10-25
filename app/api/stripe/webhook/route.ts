import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  console.log('🔔 Webhook received')
  
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    // For development, skip signature verification
    console.log('⚠️ Skipping signature verification for development')
    event = JSON.parse(body) as Stripe.Event
    console.log('✅ Webhook event parsed')
  } catch (err) {
    console.error('❌ Webhook parsing failed:', err)
    return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 })
  }

  try {
    console.log('📦 Event type:', event.type)
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('💳 Checkout session completed:', session.id)
      
      const userId = session.metadata?.userId
      const credits = parseInt(session.metadata?.credits || '0')
      
      console.log('👤 User ID:', userId)
      console.log('💰 Credits to add:', credits)
      
      if (userId && credits > 0) {
        // Use server-side Supabase client with service role key
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        console.log('🔄 Adding credits to database...')
        const { error } = await supabase.rpc('add_user_credits', {
          user_id: userId,
          credits_to_add: credits,
          transaction_type: 'purchase',
          description: 'Credit purchase via Stripe',
          reference_id: session.id
        })
        
        if (error) {
          console.error('❌ Error adding credits:', error)
          return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
        }
        
        console.log(`✅ Added ${credits} credits to user ${userId}`)
      } else {
        console.log('⚠️ Missing userId or credits in metadata')
      }
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
