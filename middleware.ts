import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Log ALL requests to webhook endpoint
  if (request.nextUrl.pathname.includes('/api/stripe/webhook')) {
    console.log('🚨 MIDDLEWARE: Webhook request intercepted!')
    console.log('🚨 Method:', request.method)
    console.log('🚨 URL:', request.url)
    console.log('🚨 Headers:', Object.fromEntries(request.headers.entries()))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

