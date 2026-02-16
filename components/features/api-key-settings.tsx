/**
 * API Key Settings Component
 * @description BYOK (Bring Your Own Key) setup for OpenAI API keys
 * @module components/features/api-key-settings
 */

"use client"

import * as React from "react"
import {
  IconAlertCircle,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconKey,
  IconLoader2,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useApiKeys } from "@/hooks/use-api-keys"

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
 * A component for managing OpenAI API keys (BYOK - Bring Your Own Key)
 *
 * Features:
 * - Secure API key input with masked display
 * - Real-time validation against OpenAI API
 * - Key status indicators (configured, valid/invalid)
 * - Update and delete functionality
 * - Encrypted storage via backend
 *
 * @example
 * ```tsx
 * <ApiKeySettings
 *   onSave={() => console.log('Key saved')}
 *   onDelete={() => console.log('Key deleted')}
 * />
 * ```
 */
export function ApiKeySettings({ onSave, onDelete }: ApiKeySettingsProps) {
  const {
    status,
    isLoading,
    isSaving,
    isValidating,
    error,
    saveApiKey,
    deleteApiKey,
    validateApiKey,
    clearError,
  } = useApiKeys()

  // Local state for input
  const [apiKeyInput, setApiKeyInput] = React.useState("")
  const [showApiKey, setShowApiKey] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)

  // Combine server and local errors
  const displayError = localError || error

  /**
   * Validates the API key format locally before sending to server
   */
  const validateFormat = (key: string): { isValid: boolean; error?: string } => {
    const trimmedKey = key.trim()

    if (!trimmedKey) {
      return { isValid: false, error: "API key is required" }
    }

    if (!trimmedKey.startsWith("sk-")) {
      return { isValid: false, error: "Invalid API key format. OpenAI keys start with 'sk-'" }
    }

    if (trimmedKey.length < 20) {
      return { isValid: false, error: "API key appears to be too short" }
    }

    return { isValid: true }
  }

  /**
   * Handles saving the API key
   */
  const handleSaveApiKey = async () => {
    setLocalError(null)
    clearError()

    // Validate format first
    const formatValidation = validateFormat(apiKeyInput)
    if (!formatValidation.isValid) {
      setLocalError(formatValidation.error || "Invalid API key format")
      return
    }

    // Save the key (includes server-side validation)
    const success = await saveApiKey(apiKeyInput.trim())

    if (success) {
      setApiKeyInput("")
      setShowApiKey(false)
      onSave?.()
    }
  }

  /**
   * Handles deleting the API key
   */
  const handleDeleteApiKey = async () => {
    setLocalError(null)
    clearError()

    const success = await deleteApiKey()

    if (success) {
      setApiKeyInput("")
      onDelete?.()
    }
  }

  /**
   * Handles re-validating the existing API key
   */
  const handleValidateApiKey = async () => {
    setLocalError(null)
    clearError()

    await validateApiKey()
  }

  /**
   * Handles input change and clears errors
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeyInput(e.target.value)
    if (localError) setLocalError(null)
    if (error) clearError()
  }

  // Show loading skeleton while fetching initial status
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure your own API keys for AI-powered features (BYOK)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-64 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasKey = status?.hasKey ?? false
  const isValid = status?.isValid ?? false
  const keyHint = status?.keyHint
  const lastValidated = status?.lastValidated

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Configure your own API keys for AI-powered features (BYOK)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OpenAI API Key Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">OpenAI API Key</h4>
              <p className="text-sm text-muted-foreground">
                Used for AI content generation and suggestions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasKey && (
                <>
                  <Badge
                    variant={isValid ? "default" : "destructive"}
                    className={cn(isValid && "bg-green-600 hover:bg-green-600")}
                  >
                    {isValid ? "Valid" : "Invalid"}
                  </Badge>
                  {keyHint && (
                    <span className="text-sm text-muted-foreground font-mono">
                      {keyHint}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Key Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <IconKey className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={handleInputChange}
                placeholder={hasKey ? `Enter new key to replace ${keyHint}` : "sk-..."}
                className={cn(
                  "pl-10 pr-10 font-mono",
                  displayError && "border-red-500 focus-visible:ring-red-500"
                )}
                disabled={isSaving}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowApiKey(!showApiKey)}
                type="button"
              >
                {showApiKey ? (
                  <IconEyeOff className="size-4" />
                ) : (
                  <IconEye className="size-4" />
                )}
              </Button>
            </div>

            {/* Action Buttons */}
            {hasKey ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleValidateApiKey}
                  disabled={isSaving || isValidating}
                  title="Re-validate API key"
                >
                  {isValidating ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconRefresh className="size-4" />
                  )}
                </Button>
                {apiKeyInput.trim() ? (
                  <Button
                    onClick={handleSaveApiKey}
                    disabled={isSaving || !apiKeyInput.trim()}
                  >
                    {isSaving ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : (
                      <IconCheck className="size-4" />
                    )}
                    Update
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteApiKey}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : (
                      <IconTrash className="size-4" />
                    )}
                    Delete
                  </Button>
                )}
              </div>
            ) : (
              <Button
                onClick={handleSaveApiKey}
                disabled={isSaving || !apiKeyInput.trim()}
              >
                {isSaving ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconCheck className="size-4" />
                )}
                Save
              </Button>
            )}
          </div>

          {/* Error Message */}
          {displayError && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <IconAlertCircle className="size-4 flex-shrink-0" />
              {displayError}
            </p>
          )}

          {/* Validation Status */}
          {hasKey && lastValidated && (
            <p className="text-xs text-muted-foreground">
              Last validated: {new Date(lastValidated).toLocaleString()}
            </p>
          )}

          {/* Security Notice */}
          <p className="text-xs text-muted-foreground">
            Your API key is encrypted and stored securely. We never share your keys
            with third parties.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
