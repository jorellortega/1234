import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  // Log ALL requests to webhook endpoint
  if (request.nextUrl.pathname.includes('/api/stripe/webhook')) {
    console.log('🚨 MIDDLEWARE: Webhook request intercepted!')
    console.log('🚨 Method:', request.method)
    console.log('🚨 URL:', request.url)
    console.log('🚨 Headers:', Object.fromEntries(request.headers.entries()))
  }

  // Admin route protection - SUPER SECURE
  if (request.nextUrl.pathname.startsWith('/admin')) {
    try {
      // Get the session token from cookies (try multiple cookie names)
      const token = request.cookies.get('sb-access-token')?.value || 
                   request.cookies.get('supabase-auth-token')?.value ||
                   request.cookies.get('sb-localhost-auth-token')?.value ||
                   request.headers.get('authorization')?.replace('Bearer ', '')

      if (!token) {
        console.log('🚫 ADMIN ACCESS DENIED: No token found')
        console.log('Available cookies:', Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value.substring(0, 20) + '...'])))
        return NextResponse.redirect(new URL('/login?redirect=/admin/api-keys', request.url))
      }

      // Create Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Verify the token and get user
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        console.log('🚫 ADMIN ACCESS DENIED: Invalid token')
        return NextResponse.redirect(new URL('/login?redirect=/admin/api-keys', request.url))
      }

      // Create service role client to check user role
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )

      // Check if user is admin
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile || userProfile.role !== 'admin') {
        console.log('🚫 ADMIN ACCESS DENIED: User is not admin', { 
          userId: user.id, 
          email: user.email, 
          role: userProfile?.role 
        })
        return NextResponse.redirect(new URL('/?error=admin-access-denied', request.url))
      }

      console.log('✅ ADMIN ACCESS GRANTED:', { userId: user.id, email: user.email })
      
    } catch (error) {
      console.error('🚫 ADMIN ACCESS ERROR:', error)
      return NextResponse.redirect(new URL('/login?redirect=/admin/api-keys', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*'
    // Temporarily disable admin middleware for testing
    // '/admin/:path*'
  ],
}

