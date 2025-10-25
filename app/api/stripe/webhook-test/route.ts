import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('🧪 Webhook test endpoint called')
  console.log('⏰ Timestamp:', new Date().toISOString())
  console.log('🌐 Request URL:', request.url)
  console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()))
  
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    env_check: {
      webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhook_secret_length: process.env.STRIPE_WEBHOOK_SECRET?.length || 0,
      stripe_key_configured: !!process.env.STRIPE_SECRET_KEY
    }
  })
}

export async function POST(request: Request) {
  console.log('🧪 Webhook test POST endpoint called')
  console.log('⏰ Timestamp:', new Date().toISOString())
  console.log('🌐 Request URL:', request.url)
  console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()))
  
  const body = await request.text()
  console.log('📦 Body:', body.substring(0, 200))
  
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook test POST received',
    timestamp: new Date().toISOString(),
    body_length: body.length
  })
}

