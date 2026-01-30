"use client"

/**
 * PostHog Provider
 * @description Initializes PostHog analytics and provides pageview tracking
 * @module components/posthog-provider
 */

import { useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { PostHogProvider as PostHogProviderBase } from "posthog-js/react"

import { useAuthContext } from "@/lib/auth/auth-provider"

/**
 * Props for the PostHogProvider component
 */
interface PostHogProviderProps {
  /** Child nodes to render inside the provider */
  children: React.ReactNode
}

/**
 * PostHogProvider wrapper with safe client initialization
 * @param props - Provider props
 * @param props.children - Child nodes
 * @returns Provider-wrapped children
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com"

  useEffect(() => {
    if (!apiKey) {
      return
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      autocapture: true,
      capture_pageview: false,
      capture_pageleave: true,
      session_recording: {
        maskTextSelector: '[type="password"], [data-sensitive], [name*="api_key"], [name*="apiKey"], [name*="secret"]',
        maskInputFn: (text, element) => {
          const el = element as HTMLInputElement | null
          if (
            el?.type === "password" ||
            el?.dataset?.sensitive === "true" ||
            el?.name?.toLowerCase().includes("api_key") ||
            el?.name?.toLowerCase().includes("apikey") ||
            el?.name?.toLowerCase().includes("secret")
          ) {
            return "*".repeat(text.length)
          }
          return text
        },
      },
      advanced_disable_feature_flags: false,
    })

    setIsReady(true)

    return () => {
      posthog.reset()
    }
  }, [apiKey, apiHost])

  return (
    <PostHogProviderBase client={posthog}>
      {isReady ? <PostHogPageview /> : null}
      <PostHogIdentify enabled={!!apiKey} />
      {children}
    </PostHogProviderBase>
  )
}

/**
 * Tracks page views on route changes
 * @returns null
 */
function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuthContext()

  const url = useMemo(() => {
    const search = searchParams?.toString()
    return search ? `${pathname}?${search}` : pathname
  }, [pathname, searchParams])

  /**
   * Derives the dashboard section from the current pathname.
   * @param path - The current URL pathname
   * @returns The dashboard section name or null
   */
  const dashboardSection = useMemo(() => {
    if (!pathname) return null
    const match = pathname.match(/^\/dashboard\/(.+?)(?:\/|$)/)
    return match ? match[1] : pathname === "/dashboard" ? "overview" : null
  }, [pathname])

  useEffect(() => {
    posthog.capture("$pageview", {
      $current_url: url,
      page_title: typeof document !== "undefined" ? document.title : undefined,
      dashboard_section: dashboardSection,
      is_authenticated: !!user,
    })
  }, [url, dashboardSection, user])

  return null
}

/**
 * Identifies authenticated users in PostHog
 * @param props - Component props
 * @param props.enabled - Whether identification is enabled
 * @returns null
 */
function PostHogIdentify({ enabled }: { enabled: boolean }) {
  const { user, profile } = useAuthContext()

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (!user) {
      posthog.reset()
      return
    }

    posthog.identify(user.id, {
      email: user.email,
      name: profile?.full_name ?? profile?.name ?? user.user_metadata?.name,
      subscription_tier: (profile as unknown as Record<string, unknown> | null)?.subscription_tier ?? user.user_metadata?.subscription_tier ?? "free",
    })
  }, [enabled, user, profile])

  return null
}
