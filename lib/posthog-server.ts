import { PostHog } from "posthog-node"

let posthogClient: PostHog | null = null

export function getPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  let host = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!key || !host) return null

  // The client-side host is a relative path (/ingest) for the Next.js proxy.
  // Server-side needs an absolute URL — use the app URL or PostHog cloud directly.
  if (host.startsWith('/')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (appUrl) {
      host = `${appUrl}${host}`
    } else {
      // Can't construct a valid URL — skip server-side tracking
      return null
    }
  }

  if (!posthogClient) {
    posthogClient = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
    })
  }

  return posthogClient
}

export function trackAIEvent(
  userId: string,
  event: "ai_generation_started" | "ai_generation_completed" | "ai_generation_failed",
  properties: Record<string, unknown>
) {
  try {
    const client = getPostHogServer()
    if (!client) return

    client.capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        app: "chainlinked",
        source: "server",
      },
    })
  } catch {
    // Never let analytics break the app
  }
}
