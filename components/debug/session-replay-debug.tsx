"use client"

/**
 * Session Replay Debug Panel
 * @description Development-only panel for monitoring PostHog session replay status
 * @module components/debug/session-replay-debug
 */

import { useCallback, useEffect, useState } from "react"
import {
  getSessionId,
  getSessionReplayUrl,
  isSessionRecordingActive,
  startSessionRecording,
  stopSessionRecording,
} from "@/lib/analytics"

/** Polling interval for session status updates (ms) */
const POLLING_INTERVAL_MS = 1000

/**
 * Debug panel showing session replay status and controls.
 * Only renders in development mode.
 * @returns Debug panel or null in production
 */
export function SessionReplayDebug(): React.ReactNode {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [replayUrl, setReplayUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Update session info
  const updateSessionInfo = useCallback(() => {
    setSessionId(getSessionId())
    setReplayUrl(getSessionReplayUrl())
    setIsRecording(isSessionRecordingActive())
  }, [])

  // Close panel handler
  const closePanel = useCallback(() => setIsVisible(false), [])

  // Handle keyboard events (Escape to close)
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePanel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, closePanel])

  // Poll for session info only when panel is visible
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== "development") return
    if (!isVisible) return

    // Populate initial state immediately
    updateSessionInfo()

    // Then poll for updates
    const interval = setInterval(updateSessionInfo, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isVisible, updateSessionInfo])

  // Don't render in production
  if (process.env.NODE_ENV !== "development") return null

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 right-6 z-[9998] flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold shadow-lg hover:bg-orange-600 transition-colors"
        aria-label="Open PostHog debug panel"
        title="PostHog Debug"
      >
        PH
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-20 right-6 z-[9998] w-80 rounded-lg border bg-background p-4 shadow-xl"
      role="dialog"
      aria-label="PostHog Session Replay Debug Panel"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">PostHog Debug</h3>
        <button
          onClick={closePanel}
          className="text-muted-foreground hover:text-foreground w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
          aria-label="Close debug panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Recording:</span>
          <span
            className={isRecording ? "text-green-500" : "text-red-500"}
            role="status"
            aria-live="polite"
          >
            {isRecording ? "● Active" : "○ Inactive"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Session ID:</span>
          <button
            onClick={() => {
              if (sessionId) {
                navigator.clipboard.writeText(sessionId)
              }
            }}
            className="text-xs bg-muted px-1 rounded truncate max-w-[150px] font-mono hover:bg-muted/80 transition-colors"
            title={sessionId ? `Click to copy: ${sessionId}` : "No session"}
            aria-label={sessionId ? `Session ID: ${sessionId}. Click to copy.` : "No session ID"}
          >
            {sessionId || "—"}
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={startSessionRecording}
            className="flex-1 px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
            aria-label="Start session recording"
          >
            Start
          </button>
          <button
            onClick={stopSessionRecording}
            className="flex-1 px-2 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
            aria-label="Stop session recording"
          >
            Stop
          </button>
        </div>

        {replayUrl && (
          <a
            href={replayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 px-2 py-1.5 text-xs text-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
            aria-label="View session replay in PostHog (opens in new tab)"
          >
            View Session Replay →
          </a>
        )}

        <p className="text-[10px] text-muted-foreground mt-2">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd> to close. Dev only.
        </p>
      </div>
    </div>
  )
}
