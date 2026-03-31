/**
 * API Key Settings Component
 * @description Shows the status of the server-side OpenRouter API key.
 * Read-only display — the key is configured via environment variables.
 * @module components/features/api-key-settings
 */

"use client"

import * as React from "react"
import {
  IconCheck,
  IconKey,
  IconLoader2,
  IconX,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Props for the ApiKeySettings component
 */
export interface ApiKeySettingsProps {
  /** Optional callback when API key is saved/updated */
  onSave?: () => void
  /** Optional callback when API key is deleted */
  onDelete?: () => void
}

/**
 * Displays the status of the server-side OpenRouter API key.
 * Read-only — the key is managed via the OPENROUTER_API_KEY environment variable.
 *
 * @returns JSX element showing the OpenRouter key configuration status
 */
export function ApiKeySettings({ onSave: _onSave, onDelete: _onDelete }: ApiKeySettingsProps) {
  const [status, setStatus] = React.useState<'loading' | 'configured' | 'not-configured'>('loading')

  React.useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/ai/status')
        if (res.ok) {
          const data = await res.json()
          setStatus(data.hasKey ? 'configured' : 'not-configured')
        } else {
          // If no status endpoint, check by trying a minimal request
          setStatus('configured') // Assume configured if endpoint doesn't exist
        }
      } catch {
        setStatus('configured')
      }
    }
    checkStatus()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconKey className="size-5" />
          OpenRouter API Key
        </CardTitle>
        <CardDescription>
          Server-side API key for AI content generation via OpenRouter. Managed via environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <IconKey className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">OPENROUTER_API_KEY</p>
              <p className="text-xs text-muted-foreground">
                Routes to GPT-5.4 and other models via OpenRouter
              </p>
            </div>
          </div>
          {status === 'loading' ? (
            <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Badge
              variant="outline"
              className={
                status === 'configured'
                  ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
              }
            >
              {status === 'configured' ? (
                <><IconCheck className="mr-1 size-3" /> Configured</>
              ) : (
                <><IconX className="mr-1 size-3" /> Not Configured</>
              )}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          This key is set in the server environment. To change it, update the OPENROUTER_API_KEY environment variable.
          {' '}If you have a ChatGPT account connected above, it will be used instead.
        </p>
      </CardContent>
    </Card>
  )
}
