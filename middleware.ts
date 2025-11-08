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

  const decodeBase64 = (value: string) => {
    try {
      if (typeof atob === 'function') {
        return atob(value)
      }
      // @ts-ignore Buffer may exist in node runtime
      return Buffer.from(value, 'base64').toString('utf-8')
    } catch (error) {
      console.warn('⚠️ Failed to decode base64 token fragment', { error })
      return null
    }
  }

  const resolveTokenValue = (value: any): string | null => {
    if (!value) return null

    if (typeof value === 'string') {
      let str = value.trim()

      // Strip quotes
      if (
        (str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))
      ) {
        str = str.slice(1, -1)
      }

      // Handle base64-encoded wrappers
      if (str.startsWith('base64-')) {
        const decoded = decodeBase64(str.slice(7))
        return resolveTokenValue(decoded ?? str)
      }

      // If this already looks like a JWT (3 segments of base64url), return it
      if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(str)) {
        return str
      }

      try {
        const parsed = JSON.parse(str)
        return resolveTokenValue(parsed)
      } catch {
        return null
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const result = resolveTokenValue(item)
        if (result) return result
      }
      return null
    }

    if (typeof value === 'object') {
      return (
        resolveTokenValue(value.access_token) ||
        resolveTokenValue(value.accessToken) ||
        resolveTokenValue(value.currentSession) ||
        resolveTokenValue(value.session) ||
        resolveTokenValue(value?.[0]) ||
        null
      )
    }

    return null
  }

  const extractAccessToken = (rawToken: string | undefined | null, source?: string) => {
    if (!rawToken) return null

    let token = rawToken

    // Supabase helper cookies store JSON blob - parse to extract access_token
    if (
      token.startsWith('{') ||
      token.startsWith('%7B') ||
      token.startsWith('["') ||
      token.startsWith('%5B')
    ) {
      try {
        const decoded =
          token.startsWith('%7B') || token.startsWith('%5B')
            ? decodeURIComponent(token)
            : token
        const parsed = JSON.parse(decoded)
        console.log('🧩 Parsed cookie JSON', { source, keys: Object.keys(parsed || {}) })

        if (Array.isArray(parsed)) {
          token = parsed[0] || null
          console.log('🔑 Token candidate from array', { source, preview: (token || '').slice(0, 40) })
        } else {
          token =
            parsed?.currentSession?.access_token ||
            parsed?.access_token ||
            parsed?.session?.access_token ||
            parsed?.accessToken ||
            null
          console.log('🔑 Token candidate from object', {
            source,
            hasCurrentSession: Boolean(parsed?.currentSession?.access_token),
            hasAccessToken: Boolean(parsed?.access_token),
            hasSession: Boolean(parsed?.session?.access_token),
            preview: (token || '').slice(0, 40)
          })
        }
      } catch (error) {
        console.warn('⚠️ Could not parse Supabase auth cookie', { source, error })
        token = null
      }
    }

    const resolved = resolveTokenValue(token)

    console.log('🔐 Resolved token preview', { source, preview: (resolved || token || '').slice(0, 40) })

    if (!resolved) {
      console.warn('⚠️ Unable to resolve token to JWT', { source, tokenPreview: token?.slice(0, 40) })
    }

    return resolved
  }

  // Helper function to check admin role
  const checkAdminAccess = async (request: NextRequest, redirectPath: string) => {
    try {
      // Get the session token from cookies (try multiple cookie names)
      const cookieSources: Array<{ name: string; value: string }> = []

      let token =
        extractAccessToken(request.cookies.get('sb-access-token')?.value, 'sb-access-token') ||
        extractAccessToken(request.cookies.get('supabase-auth-token')?.value, 'supabase-auth-token') ||
        extractAccessToken(request.cookies.get('sb-localhost-auth-token')?.value, 'sb-localhost-auth-token')

      cookieSources.push(
        ...request.cookies
          .getAll()
          .filter((cookie) => cookie.name.includes('sb'))
          .map((cookie) => ({ name: cookie.name, value: cookie.value?.slice(0, 60) || '' }))
      )

      if (!token) {
        // Look for Supabase project-specific cookie, e.g. sb-<project>-auth-token
        const supabaseCookie = request.cookies
          .getAll()
          .find((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'))

        token = extractAccessToken(supabaseCookie?.value, supabaseCookie?.name) || null
      }

      if (!token) {
        // Fallback to Authorization header
        token = extractAccessToken(request.headers.get('authorization')?.replace('Bearer ', '') || null, 'authorization-header')
      }

      if (!token) {
        console.log('🚫 ADMIN ACCESS DENIED: No token found', {
          cookieSources,
          redirectPath,
          requestedUrl: request.nextUrl.pathname
        })
        return NextResponse.redirect(new URL(`/login?redirect=${redirectPath}`, request.url))
      }

      // Verify token via Supabase Auth API to ensure it's valid
      const authResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      })

      if (!authResponse.ok) {
        const failureDetails = await authResponse.json().catch(() => null)
        console.log('🚫 ADMIN ACCESS DENIED: Invalid token response', {
          status: authResponse.status,
          statusText: authResponse.statusText,
          failureDetails,
          headers: Object.fromEntries(authResponse.headers.entries()),
          redirectPath,
          requestedUrl: request.nextUrl.pathname,
          tokenPreview: token.slice(0, 40)
        })

        return NextResponse.redirect(new URL(`/login?redirect=${redirectPath}`, request.url))
      }

      const user = await authResponse.json()
      console.log('👤 AUTH USER', {
        id: user?.id,
        email: user?.email,
        aud: user?.aud,
        app_metadata: user?.app_metadata,
        redirectPath,
        requestedUrl: request.nextUrl.pathname
      })

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

      console.log('✅ ADMIN ACCESS GRANTED:', { userId: user.id, email: user.email, path: redirectPath })
      return null // Access granted
      
    } catch (error) {
      console.error('🚫 ADMIN ACCESS ERROR:', error)
      return NextResponse.redirect(new URL(`/login?redirect=${redirectPath}`, request.url))
    }
  }

  // Admin route protection - SUPER SECURE
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const result = await checkAdminAccess(request, '/admin/api-keys')
    if (result) return result
  }

  // AI Manager route protection - ADMIN ONLY
  if (request.nextUrl.pathname.startsWith('/ai-manager')) {
    const result = await checkAdminAccess(request, '/ai-manager')
    if (result) return result
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/ai-manager/:path*'
  ],
}

