import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: Request) {
  try {
    console.log('🔍 Stripe API: Starting checkout session creation')
    
    const { priceId, credits, price } = await request.json()
    console.log('📦 Request data:', { priceId, credits, price })

    // Check if Stripe key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is not configured')
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      )
    }
    console.log('✅ Stripe key configured')

    // Get the current user from authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔑 Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('❌ No authorization header')
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const token = authHeader.replace('Bearer ', '')
    console.log('🎫 Token length:', token.length)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    console.log('👤 User auth result:', { user: !!user, error: userError?.message })
    
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    console.log('✅ User authenticated:', user.id)

    // Validate minimum price (Stripe requires minimum $1.00, we enforce $1.44 for safety)
    const MIN_PRICE = 1.44
    if (price < MIN_PRICE) {
      console.error(`❌ Price too low: $${price} (minimum: $${MIN_PRICE})`)
      return NextResponse.json(
        { error: `Minimum purchase amount is $${MIN_PRICE.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Validate maximum price (Stripe maximum is $999,999.99)
    const MAX_PRICE = 999999.99
    if (price > MAX_PRICE) {
      console.error(`❌ Price too high: $${price} (maximum: $${MAX_PRICE})`)
      return NextResponse.json(
        { error: `Maximum purchase amount is $${MAX_PRICE.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    console.log('🛒 Creating Stripe checkout session...')
    
    // Get the base URL - try environment variable first, then fallback to request origin
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (request.headers.get('origin') || 
                    request.headers.get('host') ? `https://${request.headers.get('host')}` : 
                    'http://localhost:3000')
    
    console.log('🌐 Base URL determined:', baseUrl)
    console.log('📋 Session configuration:', {
      credits: credits,
      price: price,
      priceId: priceId,
      userId: user.id,
      userEmail: user.email,
      successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/payment/cancel`
    })
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${credits} INFINITO Credits`,
              description: `Purchase ${credits} credits for AI generation`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
      metadata: {
        userId: user.id,
        credits: credits.toString(),
        priceId: priceId,
      },
      customer_email: user.email,
    })
    
    console.log('✅ Checkout session created:', {
      sessionId: session.id,
      url: session.url,
      metadata: session.metadata,
      customerEmail: session.customer_email
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
