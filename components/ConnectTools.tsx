"use client"

/**
 * Connect Tools
 * @description Onboarding tool connection card for LinkedIn
 * @module components/ConnectTools
 */

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useSearchParams, usePathname } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { IconBrandLinkedin } from "@tabler/icons-react"
import { toast } from "sonner"

/**
 * Props for ConnectTools
 */
interface ConnectToolsProps {
  /** Callback when LinkedIn connection state changes */
  onLinkedInStatusChange?: (connected: boolean) => void
  /** Callback for saving state */
  onSavingChange?: (saving: boolean) => void
}

/**
 * LinkedIn status response
 */
interface LinkedInStatus {
  connected?: boolean
  expiresAt?: string | null
  profileName?: string | null
  needsReconnect?: boolean
}

/**
 * Connect tools component
 * @param props - Component props
 * @returns Connect tools JSX element
 */
export default function ConnectTools({
  onLinkedInStatusChange,
  onSavingChange,
}: ConnectToolsProps) {
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedInStatus>({})
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(true)
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Get URL params for LinkedIn connection status
  const linkedinConnectedParam = searchParams.get("linkedin_connected")
  const linkedinError = searchParams.get("linkedin_error")

  // Build LinkedIn connect URL with redirect back to current page
  const linkedinConnectUrl = `/api/linkedin/connect?redirect=${encodeURIComponent(pathname)}`

  /**
   * Fetch LinkedIn connection status from API
   */
  const fetchLinkedInStatus = useCallback(async () => {
    setIsLoadingLinkedIn(true)
    onSavingChange?.(true)
    try {
      const response = await fetch("/api/linkedin/status", {
        method: "GET",
        credentials: "include",
      })
      const data = (await response.json()) as LinkedInStatus
      console.log("[ConnectTools] LinkedIn status:", data)
      setLinkedinStatus(data)
      onLinkedInStatusChange?.(!!data.connected)
    } catch (error) {
      console.error("Failed to load LinkedIn status:", error)
    } finally {
      setIsLoadingLinkedIn(false)
      onSavingChange?.(false)
    }
  }, [onLinkedInStatusChange, onSavingChange])

  // Fetch status on mount
  useEffect(() => {
    fetchLinkedInStatus()
  }, [fetchLinkedInStatus])

  // Handle LinkedIn connection success/error from URL params
  useEffect(() => {
    if (linkedinConnectedParam === "true") {
      toast.success("LinkedIn connected successfully!")
      // Refetch status to update the UI
      fetchLinkedInStatus()
    }
    if (linkedinError) {
      toast.error(`LinkedIn connection failed: ${linkedinError}`)
    }
  }, [linkedinConnectedParam, linkedinError, fetchLinkedInStatus])

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto p-6 bg-background">
      <div className="flex-1 flex flex-col">
        <div>
          <h2 className="text-xl font-semibold">Connect Your LinkedIn</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Link your LinkedIn account to personalize your content workflow.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1">
          <div className="flex-1">
            <Card className="border border-border rounded-xl shadow-xs">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Button variant="outline" size="icon" className="w-7 h-7">
                      <IconBrandLinkedin className="size-4" />
                    </Button>
                    LinkedIn Account
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Connect your LinkedIn account to enable direct posting and analytics.
                  </CardDescription>
                </div>
                <Badge
                  variant={linkedinStatus.connected ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isLoadingLinkedIn
                    ? "Checking..."
                    : linkedinStatus.connected
                      ? "Connected"
                      : "Not connected"
                  }
                </Badge>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button size="sm" asChild disabled={isLoadingLinkedIn}>
                  <Link href={linkedinConnectUrl}>
                    <IconBrandLinkedin className="h-4 w-4 mr-2" />
                    {linkedinStatus.connected ? "Reconnect" : "Connect LinkedIn"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:w-80">
            <Alert className="border border-border bg-muted/30 rounded-xl h-full flex flex-col justify-between p-4">
              <div>
                <AlertTitle className="font-medium text-base mb-1">Why connect LinkedIn?</AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground mb-4">
                  Connecting LinkedIn enables direct posting, analytics tracking, and personalized content suggestions.
                </AlertDescription>
                <AlertTitle className="font-medium text-base mt-2">Need help?</AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground">
                  Visit Settings anytime to manage your connections.
                </AlertDescription>
              </div>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  )
}
