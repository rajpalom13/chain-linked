"use client"

/**
 * LinkedIn Connection Status Badge Component
 * @description Displays the current LinkedIn OAuth connection status as a badge
 * with tooltip details and reconnect functionality.
 * @module components/features/linkedin-status-badge
 */

import * as React from "react"
import {
  IconBrandLinkedin,
  IconLoader2,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { LinkedInConnectionStatus } from "@/lib/linkedin"

/**
 * Connection state derived from the API response
 */
type ConnectionState = "connected" | "disconnected" | "expiring" | "error"

/**
 * Props for the LinkedInStatusBadge component
 */
export interface LinkedInStatusBadgeProps {
  /** Display variant: "badge" shows a full badge, "dot" shows a minimal colored dot */
  variant?: "badge" | "dot"
  /** Optional className for the root element */
  className?: string
  /** Whether to show the reconnect button in the tooltip */
  showReconnect?: boolean
}

/**
 * Determines the connection state from the API status response
 * @param status - The LinkedIn connection status from the API
 * @returns The derived connection state
 */
function getConnectionState(status: LinkedInConnectionStatus | null): ConnectionState {
  if (!status) return "disconnected"
  if (!status.connected) return "disconnected"
  if (status.needsReconnect) return "expiring"
  return "connected"
}

/**
 * Returns display properties for each connection state
 * @param state - The connection state
 * @returns Object with label, description, icon, and color classes
 */
function getStateDisplay(state: ConnectionState) {
  switch (state) {
    case "connected":
      return {
        label: "Connected",
        description: "Your LinkedIn account is connected and active.",
        icon: IconCircleCheck,
        dotColor: "bg-green-500",
        badgeVariant: "default" as const,
        badgeClass: "bg-green-600 hover:bg-green-600 text-white",
      }
    case "expiring":
      return {
        label: "Expiring Soon",
        description: "Your LinkedIn token is expiring soon. Please reconnect.",
        icon: IconAlertTriangle,
        dotColor: "bg-amber-500",
        badgeVariant: "secondary" as const,
        badgeClass: "bg-amber-500 hover:bg-amber-500 text-white",
      }
    case "disconnected":
      return {
        label: "Disconnected",
        description: "Connect your LinkedIn account to enable posting.",
        icon: IconCircleX,
        dotColor: "bg-gray-400",
        badgeVariant: "outline" as const,
        badgeClass: "",
      }
    case "error":
      return {
        label: "Error",
        description: "Unable to check LinkedIn status. Please try again.",
        icon: IconCircleX,
        dotColor: "bg-red-500",
        badgeVariant: "destructive" as const,
        badgeClass: "",
      }
  }
}

/**
 * Formats a token expiry date for display
 * @param expiresAt - ISO date string of the token expiry
 * @returns Human-readable expiry string
 */
function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null
  try {
    const date = new Date(expiresAt)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "Expired"
    if (diffDays === 0) return "Expires today"
    if (diffDays === 1) return "Expires tomorrow"
    if (diffDays <= 30) return `Expires in ${diffDays} days`
    return `Expires ${date.toLocaleDateString()}`
  } catch {
    return null
  }
}

/**
 * A badge/indicator component showing LinkedIn OAuth connection status.
 *
 * Supports two visual variants:
 * - "badge": Full badge with icon, text, and tooltip with details
 * - "dot": Minimal colored dot with LinkedIn icon for sidebar use
 *
 * Fetches status from /api/linkedin/status on mount and provides
 * a reconnect action via the tooltip.
 *
 * @param props - Component props
 * @returns Rendered LinkedIn status badge
 *
 * @example
 * ```tsx
 * // Full badge variant (for settings / composer)
 * <LinkedInStatusBadge variant="badge" showReconnect />
 *
 * // Minimal dot variant (for sidebar)
 * <LinkedInStatusBadge variant="dot" />
 * ```
 */
export function LinkedInStatusBadge({
  variant = "badge",
  className,
  showReconnect = true,
}: LinkedInStatusBadgeProps) {
  const [status, setStatus] = React.useState<LinkedInConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function fetchStatus() {
      try {
        const response = await fetch("/api/linkedin/status")
        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated, treat as disconnected
            setStatus(null)
          } else {
            setHasError(true)
          }
          return
        }
        const data: LinkedInConnectionStatus = await response.json()
        if (!cancelled) {
          setStatus(data)
        }
      } catch {
        if (!cancelled) {
          setHasError(true)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchStatus()

    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Redirects user to the LinkedIn OAuth connect endpoint
   */
  const handleReconnect = () => {
    window.location.href = "/api/linkedin/connect"
  }

  const connectionState: ConnectionState = hasError
    ? "error"
    : getConnectionState(status)
  const display = getStateDisplay(connectionState)
  const expiryText = status ? formatExpiry(status.expiresAt) : null
  const StateIcon = display.icon

  if (isLoading) {
    if (variant === "dot") {
      return (
        <div className={cn("flex items-center gap-1.5", className)}>
          <IconLoader2 className="size-3.5 animate-spin text-muted-foreground" />
        </div>
      )
    }
    return (
      <Badge variant="outline" className={cn("gap-1.5", className)}>
        <IconLoader2 className="size-3 animate-spin" />
        Checking...
      </Badge>
    )
  }

  // Dot variant for sidebar - minimal display
  if (variant === "dot") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1.5 cursor-default", className)}>
              <IconBrandLinkedin className="size-4 text-muted-foreground" />
              <span className={cn("size-2 rounded-full", display.dotColor)} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[240px]">
            <div className="space-y-1">
              <p className="font-medium text-sm">{display.label}</p>
              {status?.profileName && (
                <p className="text-xs text-muted-foreground">{status.profileName}</p>
              )}
              {expiryText && (
                <p className="text-xs text-muted-foreground">{expiryText}</p>
              )}
              {showReconnect && connectionState !== "connected" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1.5 h-7 w-full text-xs"
                  onClick={handleReconnect}
                >
                  {connectionState === "disconnected" ? "Connect" : "Reconnect"}
                </Button>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Badge variant - full display
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={display.badgeVariant}
            className={cn("gap-1.5 cursor-default", display.badgeClass, className)}
          >
            <StateIcon className="size-3.5" />
            {display.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px]">
          <div className="space-y-1.5">
            <p className="text-sm">{display.description}</p>
            {status?.profileName && (
              <p className="text-xs text-muted-foreground">
                Profile: {status.profileName}
              </p>
            )}
            {expiryText && (
              <p className="text-xs text-muted-foreground">{expiryText}</p>
            )}
            {showReconnect && connectionState !== "connected" && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-7 w-full text-xs"
                onClick={handleReconnect}
              >
                {connectionState === "disconnected" ? "Connect LinkedIn" : "Reconnect LinkedIn"}
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
