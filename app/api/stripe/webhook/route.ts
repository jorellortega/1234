import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { debugLog, logCreditBalanceChange } from '@/lib/debug-utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Set Stripe CLI to use latest API version or your webhook events will be filtered
// Run: stripe listen --forward-to http://localhost:3000/api/stripe/webhook --latest

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function GET(request: Request) {
  console.log('🔍 Webhook GET endpoint called - checking configuration')
  return NextResponse.json({
    status: 'webhook_endpoint_active',
    timestamp: new Date().toISOString(),
    configuration: {
      webhook_secret_configured: !!webhookSecret,
      webhook_secret_length: webhookSecret?.length || 0,
      webhook_secret_prefix: webhookSecret?.substring(0, 10) || 'NOT_SET',
      stripe_key_configured: !!process.env.STRIPE_SECRET_KEY,
      environment: process.env.NODE_ENV
    }
  })
}

export async function POST(request: Request) {
  console.log('='.repeat(80))
  console.log('🔔 WEBHOOK RECEIVED - START')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('🌐 Request URL:', request.url)
  console.log('🔍 Request method:', request.method)
  
  // Log all headers for debugging
  const headers = Object.fromEntries(request.headers.entries())
  console.log('📋 All Request Headers:', JSON.stringify(headers, null, 2))
  
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  
  console.log('📝 Body length:', body.length)
  console.log('📄 Body preview:', body.substring(0, 200))
  console.log('🔐 Signature present:', !!signature)
  console.log('🔐 Signature value:', signature)
  console.log('🔑 Webhook secret configured:', !!webhookSecret)
  console.log('🔑 Webhook secret length:', webhookSecret?.length || 0)

  let event: Stripe.Event

  try {
    // Verify webhook signature if secret is available
    if (webhookSecret && signature) {
      console.log('🔐 Verifying webhook signature...')
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log('✅ Webhook signature verified')
    } else {
      console.log('⚠️ Skipping signature verification (webhook secret not configured)')
      event = JSON.parse(body) as Stripe.Event
    }
    
    console.log('✅ Webhook event parsed')
    console.log('📋 Event details:', {
      id: event.id,
      type: event.type,
      created: event.created,
      livemode: event.livemode
    })
  } catch (err) {
    console.error('❌ Webhook parsing failed:', err)
    console.error('📄 Raw body:', body.substring(0, 500))
    return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 })
  }

  try {
    console.log('📦 Event type:', event.type)
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('💳 Checkout session completed:', session.id)
      console.log('📊 Session details:', {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_email,
        metadata: session.metadata
      })
      
      const userId = session.metadata?.userId
      const credits = parseInt(session.metadata?.credits || '0')
      const priceId = session.metadata?.priceId
      
      console.log('👤 User ID:', userId)
      console.log('💰 Credits to add:', credits)
      console.log('🏷️ Price ID:', priceId)
      console.log('📧 Customer email:', session.customer_email)
      
      if (userId && credits > 0) {
        // Use server-side Supabase client with service role key
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        console.log('🔗 Supabase client created')
        console.log('🔄 Adding credits to database...')
        
        const rpcParams = {
          user_id: userId,
          credits_to_add: credits,
          transaction_type: 'purchase',
          description: 'Credit purchase via Stripe',
          reference_id: session.id
        }
        
        console.log('📋 RPC parameters:', rpcParams)
        
        // Check user's current credits before adding
        const { data: currentProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('credits')
          .eq('id', userId)
          .single()
        
        const currentCredits = currentProfile?.credits || 0
        console.log('👤 Current user profile:', { 
          exists: !!currentProfile, 
          current_credits: currentCredits,
          profile_error: profileError?.message 
        })
        
        // Log the credit transaction attempt
        debugLog.logCreditTransaction(userId, credits, 'purchase', 'Credit purchase via Stripe')
        
        const { error } = await supabase.rpc('add_user_credits', rpcParams)
        
        if (error) {
          console.error('❌ Error adding credits:', error)
          console.error('🔍 Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
        }
        
        console.log(`✅ Added ${credits} credits to user ${userId}`)
        
        // Verify credits were actually added
        const { data: updatedProfile, error: verifyError } = await supabase
          .from('user_profiles')
          .select('credits')
          .eq('id', userId)
          .single()
        
        const newCredits = updatedProfile?.credits || 0
        console.log('✅ Credit verification:', {
          new_credits: newCredits,
          expected_credits: currentCredits + credits,
          verification_error: verifyError?.message
        })
        
        // Log the balance change
        logCreditBalanceChange(userId, 'add', credits, currentCredits, newCredits)
        
        // Check transaction log
        const { data: transactions, error: transactionError } = await supabase
          .from('credits_transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('reference_id', session.id)
          .order('created_at', { ascending: false })
          .limit(1)
        
        console.log('📝 Transaction log:', {
          transaction_found: !!transactions?.length,
          transaction_data: transactions?.[0],
          transaction_error: transactionError?.message
        })
        
      } else {
        console.log('⚠️ Missing userId or credits in metadata')
        console.log('🔍 Metadata analysis:', {
          userId_present: !!userId,
          userId_value: userId,
          credits_present: !!session.metadata?.credits,
          credits_value: session.metadata?.credits,
          credits_parsed: credits,
          all_metadata: session.metadata
        })
      }
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
