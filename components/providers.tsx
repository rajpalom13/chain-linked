"use client"

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { DraftProvider } from "@/lib/store/draft-context"

/**
 * Global providers wrapper component.
 * Includes theme provider, draft state management, and toast notifications.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DraftProvider>
        {children}
      </DraftProvider>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={4000}
      />
    </ThemeProvider>
  )
}
