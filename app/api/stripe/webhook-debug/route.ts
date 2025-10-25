import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('🟢🟢🟢 WEBHOOK-DEBUG ENDPOINT HIT! 🟢🟢🟢')
  console.log('Timestamp:', new Date().toISOString())
  
  try {
    const body = await request.text()
    const headers = Object.fromEntries(request.headers.entries())
    
    console.log('Headers:', JSON.stringify(headers, null, 2))
    console.log('Body length:', body.length)
    console.log('Body preview:', body.substring(0, 300))
    
    return NextResponse.json({ 
      success: true, 
      message: 'Debug endpoint received webhook',
      bodyLength: body.length,
      hasStripeSignature: !!headers['stripe-signature']
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  console.log('🟢 WEBHOOK-DEBUG GET endpoint hit')
  return NextResponse.json({ 
    status: 'Debug webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

