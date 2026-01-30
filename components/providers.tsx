"use client"

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { PostHogProvider } from "@/components/posthog-provider"
import { DraftProvider } from "@/lib/store/draft-context"
import { AuthProvider } from "@/lib/auth/auth-provider"

/**
 * Global providers wrapper component.
 * Includes auth, theme provider, draft state management, and toast notifications.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <DraftProvider>
            {children}
          </DraftProvider>
        </AuthProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          duration={4000}
        />
      </ThemeProvider>
    </PostHogProvider>
  )
}
