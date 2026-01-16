/**
 * Auth Provider
 * @description React context provider for authentication state with LinkedIn profile data
 * @module lib/auth/auth-provider
 */

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

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
 * Extended user profile with LinkedIn data
 */
export interface UserProfileWithLinkedIn extends Tables<'users'> {
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
  const supabase = createClient()

  /**
   * Fetch user profile with LinkedIn data from database
   * @param userId - User ID to fetch profile for
   * @returns User profile with LinkedIn data or null
   */
  const fetchProfile = async (userId: string): Promise<UserProfileWithLinkedIn | null> => {
    // Fetch user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('Profile fetch error:', userError)
      return null
    }

    if (!userProfile) {
      return null
    }

    // Fetch LinkedIn profile
    const { data: linkedinProfile, error: linkedinError } = await supabase
      .from('linkedin_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (linkedinError && linkedinError.code !== 'PGRST116') {
      console.error('LinkedIn profile fetch error:', linkedinError)
    }

    // Fetch latest LinkedIn analytics
    const { data: linkedinAnalytics, error: analyticsError } = await supabase
      .from('linkedin_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()

    if (analyticsError && analyticsError.code !== 'PGRST116') {
      console.error('LinkedIn analytics fetch error:', analyticsError)
    }

    // Combine all data with proper type casting
    // The raw_data fields from Supabase are typed as Json, but we know they're objects
    const fullProfile: UserProfileWithLinkedIn = {
      ...userProfile,
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

    /**
     * Fetch profile with timeout safety
     */
    const fetchProfileWithTimeout = async (userId: string): Promise<UserProfileWithLinkedIn | null> => {
      try {
        const profilePromise = fetchProfile(userId)
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
        )
        return await Promise.race([profilePromise, timeoutPromise])
      } catch (err) {
        console.error('[AuthProvider] Profile fetch error:', err)
        return null
      }
    }

    // Listen for ALL auth state changes including INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AuthProvider] onAuthStateChange:', { event, hasSession: !!newSession, email: newSession?.user?.email })

        if (!isMounted) return

        // Update session state
        setSession(newSession)

        if (newSession?.user) {
          setUser(newSession.user)

          // Fetch profile on these events
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log('[AuthProvider] Fetching profile for:', newSession.user.email)
            const userProfile = await fetchProfileWithTimeout(newSession.user.id)
            if (isMounted) {
              setProfile(userProfile)
            }
          }
        } else {
          console.log('[AuthProvider] No user in session, clearing state')
          setUser(null)
          setProfile(null)
        }

        // Mark initialization complete on INITIAL_SESSION or if we haven't initialized yet
        if (event === 'INITIAL_SESSION' || !hasInitialized) {
          hasInitialized = true
          if (isMounted) {
            console.log('[AuthProvider] Setting isLoading=false after:', event)
            setIsLoading(false)
          }
        }
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
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
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
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
