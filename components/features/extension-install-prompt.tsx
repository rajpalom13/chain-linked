"use client"

/**
 * Extension Install Prompt Component
 * @description Dialog prompting users to install the ChainLinked Chrome extension
 * @module components/features/extension-install-prompt
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconBrandChrome,
  IconX,
  IconDownload,
  IconChartBar,
  IconRefresh,
  IconClock,
  IconUsers,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  CHROME_STORE_URL,
  dismissPrompt,
  shouldShowExtensionPrompt,
} from "@/lib/extension/detect"

/**
 * Feature item component for the extension benefits list
 */
function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  )
}

/**
 * Props for the ExtensionInstallPrompt component
 */
export interface ExtensionInstallPromptProps {
  /** Whether the dialog is open */
  open?: boolean
  /** Callback when dialog open state changes */
  onOpenChange?: (open: boolean) => void
  /** Callback when user clicks install */
  onInstall?: () => void
  /** Callback when user dismisses the prompt */
  onDismiss?: (permanent: boolean) => void
}

/**
 * Extension features to highlight in the prompt
 */
const EXTENSION_FEATURES = [
  {
    icon: IconChartBar,
    title: "Auto-capture LinkedIn Analytics",
    description: "Automatically sync your LinkedIn performance data",
  },
  {
    icon: IconRefresh,
    title: "Real-time Post Tracking",
    description: "Track engagement metrics as they happen",
  },
  {
    icon: IconUsers,
    title: "Audience Insights",
    description: "Understand your follower demographics",
  },
  {
    icon: IconClock,
    title: "Post Scheduling",
    description: "Schedule posts directly from LinkedIn",
  },
]

/**
 * ExtensionInstallPrompt - Dialog prompting users to install the ChainLinked Chrome extension.
 * Shows after successful login if extension is not detected.
 *
 * @example
 * ```tsx
 * <ExtensionInstallPrompt
 *   open={showPrompt}
 *   onOpenChange={setShowPrompt}
 *   onInstall={() => window.open(CHROME_STORE_URL)}
 *   onDismiss={(permanent) => dismissPrompt(permanent)}
 * />
 * ```
 */
export function ExtensionInstallPrompt({
  open,
  onOpenChange,
  onInstall,
  onDismiss,
}: ExtensionInstallPromptProps) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false)

  /**
   * Handle install button click
   */
  const handleInstall = () => {
    window.open(CHROME_STORE_URL, '_blank', 'noopener,noreferrer')
    onInstall?.()
    // dismissPrompt + onDismiss are called inside handleOpenChange
    onOpenChange?.(false)
  }

  /**
   * Handle explicit "Maybe Later" dismiss
   */
  const handleDismiss = () => {
    // dismissPrompt + onDismiss are called inside handleOpenChange
    onOpenChange?.(false)
  }

  /**
   * Handle any close action (X button, overlay click, Escape key).
   * Always persists a temporary dismissal so the prompt doesn't reopen.
   */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      dismissPrompt(dontShowAgain)
      onDismiss?.(dontShowAgain)
    }
    onOpenChange?.(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
          <DialogHeader>
            <motion.div
              className="flex items-center gap-3 mb-2"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2.5 shadow-sm ring-1 ring-primary/10">
                <IconBrandChrome className="size-6 text-primary" />
              </div>
              <DialogTitle className="text-xl">
                Get the Chrome Extension
              </DialogTitle>
            </motion.div>
            <DialogDescription className="text-sm">
              Supercharge your LinkedIn experience with the ChainLinked extension.
              Automatically capture analytics and manage posts.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Features list */}
        <div className="px-6 py-4 space-y-4">
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
              },
            }}
          >
            {EXTENSION_FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 },
                }}
              >
                <FeatureItem {...feature} />
              </motion.div>
            ))}
          </motion.div>
        </div>

        <DialogFooter className="flex-col gap-3 px-6 pb-6 pt-2 sm:flex-col">
          {/* Primary action button */}
          <Button
            onClick={handleInstall}
            className="w-full gap-2 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
          >
            <IconDownload className="size-4" />
            Install Extension
          </Button>

          {/* Don't show again checkbox */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <Label
                htmlFor="dont-show-again"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Don&apos;t show this again
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              Maybe Later
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to manage extension install prompt state
 * Shows prompt after specified delay if extension is not installed
 *
 * @param options - Hook options
 * @returns Object with open state and handlers
 *
 * @example
 * ```tsx
 * const { showPrompt, setShowPrompt, checkAndShowPrompt } = useExtensionPrompt()
 *
 * // After successful login:
 * checkAndShowPrompt()
 * ```
 */
/**
 * Non-intrusive banner prompting users to install the Chrome extension.
 * Dismissible horizontal bar shown at the top of dashboard pages.
 *
 * @example
 * ```tsx
 * <ExtensionInstallBanner
 *   visible={extensionInstalled === false && !isDismissed}
 *   onDismiss={() => dismissPrompt(false)}
 * />
 * ```
 */
export function ExtensionInstallBanner({
  visible,
  onDismiss,
}: {
  visible: boolean
  onDismiss?: () => void
}) {
  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mx-4 mt-4 lg:mx-6"
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <IconBrandChrome className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Get the Chrome Extension</p>
              <p className="text-xs text-muted-foreground">
                Auto-capture analytics and manage posts directly from LinkedIn.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() =>
                window.open(CHROME_STORE_URL, '_blank', 'noopener,noreferrer')
              }
              className="gap-1.5"
            >
              <IconDownload className="size-3.5" />
              Install
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                dismissPrompt(false)
                onDismiss?.()
              }}
              aria-label="Dismiss"
            >
              <IconX className="size-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export function useExtensionPrompt(options?: {
  /** Delay before showing prompt (ms) */
  delay?: number
  /** Auto-check on mount */
  autoCheck?: boolean
}) {
  const { delay = 1500, autoCheck = false } = options || {}
  const [showPrompt, setShowPrompt] = React.useState(false)
  const isCheckingRef = React.useRef(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasCheckedRef = React.useRef(false)

  /**
   * Check if prompt should be shown and show it after delay.
   * Uses a ref for the checking guard to avoid recreating the callback
   * on every state change (which would cause an infinite effect loop).
   */
  const checkAndShowPrompt = React.useCallback(async () => {
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    try {
      const shouldShow = await shouldShowExtensionPrompt()

      if (shouldShow) {
        // Clear any previously stacked timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          setShowPrompt(true)
          timeoutRef.current = null
        }, delay)
      }
    } catch (error) {
      console.warn('[Extension Prompt] Error checking prompt state:', error)
    } finally {
      isCheckingRef.current = false
    }
  }, [delay])

  // Auto-check once when autoCheck becomes true
  React.useEffect(() => {
    if (autoCheck && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      checkAndShowPrompt()
    }
  }, [autoCheck, checkAndShowPrompt])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    showPrompt,
    setShowPrompt,
    checkAndShowPrompt,
  }
}
