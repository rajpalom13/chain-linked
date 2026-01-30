/**
 * Next.js Middleware for Supabase Authentication and Onboarding
 * @description Handles session refresh, auth redirects, and onboarding guards
 * @module middleware
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * All paths that are part of the onboarding flow (step-based and legacy)
 * Users are allowed to access these even if onboarding is not complete
 * Step 4 is the final step (Review & Complete)
 */
const ONBOARDING_STEP_PATHS = [
  '/onboarding',
  '/onboarding/step1',
  '/onboarding/step2',
  '/onboarding/step3',
  '/onboarding/step4',
  '/onboarding/company',
  '/onboarding/company-context',
  '/onboarding/invite',
  '/onboarding/brand-kit',
]

/**
 * Middleware to handle Supabase authentication and onboarding
 * - Refreshes user session tokens
 * - Protects routes that require authentication
 * - Redirects users to company onboarding if not completed
 * @param request - Incoming request
 * @returns Response with updated cookies or redirect
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session - IMPORTANT: avoid writing logic between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/composer', '/schedule', '/team', '/templates', '/settings', '/onboarding']
  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Auth pages that should redirect logged-in users
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.some(path =>
    pathname === path
  )

  if (isAuthPath && user) {
    // Check if there's a redirect param (e.g., for invitation acceptance)
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    if (redirectParam && redirectParam.startsWith('/invite/')) {
      // Allow redirect to invitation acceptance page
      const url = request.nextUrl.clone()
      url.pathname = redirectParam
      url.search = ''
      return NextResponse.redirect(url)
    }

    // Default redirect to dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Cache profile data to avoid duplicate queries
  // Only fetch if we need it for dashboard or onboarding route checks
  let profile: {
    onboarding_completed: boolean | null
    onboarding_current_step: number | null
    company_onboarding_completed: boolean | null
  } | null = null

  const needsProfileCheck =
    pathname.startsWith('/dashboard') ||
    ONBOARDING_STEP_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))

  if (user && needsProfileCheck) {
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_current_step, company_onboarding_completed')
      .eq('id', user.id)
      .single()
    profile = data
  }

  // Onboarding guard for dashboard routes
  // Check the master onboarding_completed flag first, fall back to company_onboarding_completed
  if (user && pathname.startsWith('/dashboard')) {
    // If profile doesn't exist or onboarding not completed, redirect to appropriate step
    if (!profile || profile.onboarding_completed !== true) {
      // Check if at least company onboarding is done (legacy fallback)
      if (profile?.company_onboarding_completed === true) {
        // Company onboarding done but full onboarding not - allow dashboard access
        // This handles users who onboarded before the step-based flow existed
        return supabaseResponse
      }

      // Redirect to the user's current onboarding step
      const step = profile?.onboarding_current_step ?? 1
      const url = request.nextUrl.clone()
      url.pathname = `/onboarding/step${step}`
      return NextResponse.redirect(url)
    }
  }

  // If user is on any onboarding page but has already completed full onboarding,
  // redirect to dashboard
  if (user && ONBOARDING_STEP_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    if (profile?.onboarding_completed === true) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

/**
 * Matcher configuration - exclude static assets and API routes that handle their own auth
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
