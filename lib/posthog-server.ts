import { PostHog } from "posthog-node"

let posthogClient: PostHog | null = null

export function getPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!key || !host) return null

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
