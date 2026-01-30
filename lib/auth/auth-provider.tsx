/**
 * Auth Provider
 * @description React context provider for authentication state with LinkedIn profile data
 * @module lib/auth/auth-provider
 */

'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

/**
 * LinkedIn profile data type
 * Matches the database schema with extended raw_data typing
 */
export interface LinkedInProfile {
  id: string
  user_id: string
  profile_urn: string | null
  public_identifier: string | null
  first_name: string | null
  last_name: string | null
  headline: string | null
  location: string | null
  industry: string | null
  profile_picture_url: string | null
  background_image_url: string | null
  connections_count: number | null
  followers_count: number | null
  summary: string | null
  raw_data: {
    name?: string
    headline?: string
    profilePhotoUrl?: string
    backgroundPhotoUrl?: string
    location?: string
    industry?: string
    about?: string
    currentCompany?: string
    education?: string
    profileUrl?: string
    [key: string]: unknown
  } | null
  captured_at: string | null
  updated_at: string | null
}

/**
 * LinkedIn analytics data type
 * Note: Numeric fields can be null when data hasn't been captured yet
 */
export interface LinkedInAnalytics {
  id: string
  user_id: string
  page_type: string
  impressions: number | null
  members_reached: number | null
  engagements: number | null
  new_followers: number | null
  profile_views: number | null
  search_appearances: number | null
  top_posts: unknown[]
  raw_data: {
    impressionGrowth?: number
    [key: string]: unknown
  } | null
  captured_at: string | null
  updated_at: string
}

/**
 * Profile data from profiles table
 */
export interface ProfileData {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  created_at: string | null
  linkedin_access_token: string | null
  linkedin_user_id: string | null
  linkedin_connected_at: string | null
  linkedin_token_expires_at: string | null
  /** LinkedIn profile picture URL (from OAuth) */
  linkedin_avatar_url: string | null
  /** LinkedIn headline */
  linkedin_headline: string | null
  /** LinkedIn profile URL */
  linkedin_profile_url: string | null
  /** Whether the user has completed company onboarding */
  company_onboarding_completed: boolean
  /** Company name for AI context */
  company_name: string | null
  /** Company website URL */
  company_website: string | null
  /** Whether the user has completed the full onboarding flow */
  onboarding_completed: boolean
  /** Current step in the onboarding flow (1-6) */
  onboarding_current_step: number
}

/**
 * Extended user profile with LinkedIn data
 */
export interface UserProfileWithLinkedIn extends ProfileData {
  name?: string | null
  linkedin_profile?: LinkedInProfile | null
  linkedin_analytics?: LinkedInAnalytics | null
}

/**
 * Auth context type definition
 */
interface AuthContextType {
  user: User | null
  profile: UserProfileWithLinkedIn | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  /** Whether the user has completed company onboarding */
  hasCompletedCompanyOnboarding: boolean
  /** Whether the user has completed the full onboarding flow */
  hasCompletedOnboarding: boolean
  /** Current step in the onboarding flow (1-6) */
  currentOnboardingStep: number
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Auth Provider Component
 * Provides authentication state to the entire app
 * @param props - Provider props
 * @returns Auth context provider
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfileWithLinkedIn | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Memoize the Supabase client to prevent re-creation on every render
  const supabase = useMemo(() => createClient(), [])

  /**
   * Fetch user profile with LinkedIn data from database
   * Runs queries in parallel for better performance
   * Uses maybeSingle() to gracefully handle missing records
   * @param userId - User ID to fetch profile for
   * @returns User profile with LinkedIn data or null
   */
  const fetchProfile = async (userId: string): Promise<UserProfileWithLinkedIn | null> => {
    try {
      // Run all queries in parallel for better performance
      // Using maybeSingle() instead of single() to handle missing records gracefully
      const [profileResult, linkedinResult, analyticsResult] = await Promise.all([
        // Fetch user profile from 'profiles' table
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        // Fetch LinkedIn profile - optional, may not exist
        supabase
          .from('linkedin_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        // Fetch latest LinkedIn analytics - optional, may not exist
        supabase
          .from('linkedin_analytics')
          .select('*')
          .eq('user_id', userId)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      const { data: profileData, error: profileError } = profileResult
      const { data: linkedinProfile, error: linkedinError } = linkedinResult
      const { data: linkedinAnalytics, error: analyticsError } = analyticsResult

      // Log actual errors (not just missing data)
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError)
      }
      if (linkedinError && linkedinError.code !== 'PGRST116') {
        // Table might not exist yet, which is okay
        console.warn('LinkedIn profile not available:', linkedinError.message)
      }
      if (analyticsError && analyticsError.code !== 'PGRST116') {
        // Table might not exist yet, which is okay
        console.warn('LinkedIn analytics not available:', analyticsError.message)
      }

      // If no profile found, return null (new users may not have a profile yet)
      if (!profileData) {
        return null
      }

      // Combine all data with proper type casting
      const fullProfile: UserProfileWithLinkedIn = {
        id: profileData.id,
        full_name: profileData.full_name,
        name: profileData.full_name, // Alias for compatibility
        avatar_url: profileData.avatar_url,
        email: profileData.email,
        created_at: profileData.created_at,
        linkedin_access_token: profileData.linkedin_access_token,
        linkedin_user_id: profileData.linkedin_user_id,
        linkedin_connected_at: profileData.linkedin_connected_at,
        linkedin_token_expires_at: profileData.linkedin_token_expires_at,
        linkedin_avatar_url: profileData.linkedin_avatar_url ?? null,
        linkedin_headline: profileData.linkedin_headline ?? null,
        linkedin_profile_url: profileData.linkedin_profile_url ?? null,
        company_onboarding_completed: profileData.company_onboarding_completed ?? false,
        company_name: profileData.company_name ?? null,
        company_website: profileData.company_website ?? null,
        onboarding_completed: profileData.onboarding_completed ?? false,
        onboarding_current_step: profileData.onboarding_current_step ?? 1,
        linkedin_profile: linkedinProfile ? {
          ...linkedinProfile,
          raw_data: linkedinProfile.raw_data as LinkedInProfile['raw_data'],
        } : null,
        linkedin_analytics: linkedinAnalytics ? {
          ...linkedinAnalytics,
          raw_data: linkedinAnalytics.raw_data as LinkedInAnalytics['raw_data'],
          top_posts: linkedinAnalytics.top_posts as unknown[],
        } : null,
      }

      return fullProfile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  /**
   * Refresh the current user's profile
   */
  const refreshProfile = async () => {
    if (!user) return
    const newProfile = await fetchProfile(user.id)
    setProfile(newProfile)
  }

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  /**
   * Initialize auth state and listen for changes
   * Uses onAuthStateChange as the primary source of truth for session state
   * getSession() is called to trigger the INITIAL_SESSION event
   */
  useEffect(() => {
    let isMounted = true
    let hasInitialized = false
    let currentFetchId = 0 // Track fetch requests to cancel stale ones

    /**
     * Fetch profile with timeout safety and cancellation support
     */
    const fetchProfileWithTimeout = async (
      userId: string,
      fetchId: number
    ): Promise<UserProfileWithLinkedIn | null> => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // Reduced to 5s

        const profilePromise = fetchProfile(userId)
        const result = await Promise.race([
          profilePromise,
          new Promise<null>((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error('Profile fetch timeout'))
            })
          }),
        ])

        clearTimeout(timeoutId)

        // Check if this fetch is still valid (not superseded by a newer one)
        if (fetchId !== currentFetchId) {
          return null
        }

        return result
      } catch (err) {
        // Only log if this is still the current fetch and it's a real error
        if (fetchId === currentFetchId && err instanceof Error && err.message !== 'Profile fetch timeout') {
          console.error('[AuthProvider] Profile fetch error:', err)
        }
        return null
      }
    }

    // Listen for ALL auth state changes including INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AuthProvider] onAuthStateChange:', { event, hasSession: !!newSession, email: newSession?.user?.email })

        if (!isMounted) return

        // Handle different auth events appropriately
        if (event === 'SIGNED_OUT') {
          // Only clear state on explicit sign out
          console.log('[AuthProvider] SIGNED_OUT - clearing all state')
          setUser(null)
          setProfile(null)
          setSession(null)
          return
        }

        if (event === 'TOKEN_REFRESHED') {
          // Token refresh - only update if we have a valid session
          // Don't clear existing state if refresh temporarily fails
          if (newSession?.user) {
            setSession(newSession)
            setUser(newSession.user)
          }
          return
        }

        // For other events (INITIAL_SESSION, SIGNED_IN, USER_UPDATED, PASSWORD_RECOVERY)
        setSession(newSession)

        if (newSession?.user) {
          setUser(newSession.user)

          // Mark initialization complete BEFORE fetching profile to unblock UI
          if (event === 'INITIAL_SESSION' || !hasInitialized) {
            hasInitialized = true
            if (isMounted) {
              console.log('[AuthProvider] Setting isLoading=false after:', event)
              setIsLoading(false)
            }
          }

          // Fetch profile in background (non-blocking) on these events
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            console.log('[AuthProvider] Fetching profile for:', newSession.user.email)
            const fetchId = ++currentFetchId // Increment to cancel any pending fetches
            const userProfile = await fetchProfileWithTimeout(newSession.user.id, fetchId)
            if (isMounted && fetchId === currentFetchId) {
              setProfile(userProfile)
            }
          }
        } else if (event === 'INITIAL_SESSION') {
          // Only clear on INITIAL_SESSION with no user (truly not logged in)
          console.log('[AuthProvider] INITIAL_SESSION with no user - user is not logged in')
          setUser(null)
          setProfile(null)

          if (!hasInitialized) {
            hasInitialized = true
            if (isMounted) {
              setIsLoading(false)
            }
          }
        }
        // For other events without a session, keep existing state (don't clear)
      }
    )

    // Call getSession to trigger the INITIAL_SESSION event
    // This is required to kick off the auth state detection
    console.log('[AuthProvider] Calling getSession to trigger INITIAL_SESSION...')
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[AuthProvider] getSession completed:', { hasSession: !!session, error })
      // If there's no session and we haven't initialized, set loading to false
      // (onAuthStateChange should have fired INITIAL_SESSION, but this is a fallback)
      if (!session && !hasInitialized && isMounted) {
        console.log('[AuthProvider] No session from getSession, setting isLoading=false (fallback)')
        hasInitialized = true
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      currentFetchId++ // Cancel any pending fetches
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    hasCompletedCompanyOnboarding: profile?.company_onboarding_completed ?? false,
    hasCompletedOnboarding: profile?.onboarding_completed ?? false,
    currentOnboardingStep: profile?.onboarding_current_step ?? 1,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuthContext hook
 * @returns Auth context value
 * @throws Error if used outside AuthProvider
 * @example
 * const { user, profile, signOut } = useAuthContext()
 * // Access LinkedIn data
 * const headline = profile?.linkedin_profile?.headline
 * const impressions = profile?.linkedin_analytics?.impressions
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // Return safe defaults during SSR/static prerendering when AuthProvider is not mounted
    return {
      user: null,
      profile: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      hasCompletedCompanyOnboarding: false,
      hasCompletedOnboarding: false,
      currentOnboardingStep: 1,
      signOut: async () => {},
      refreshProfile: async () => {},
    }
  }
  return context
}
