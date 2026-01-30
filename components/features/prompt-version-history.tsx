/**
 * Prompt Version History Component
 * @description Displays version history with diff view and rollback capability
 * @module components/features/prompt-version-history
 */

"use client"

import * as React from "react"
import { usePromptVersions, useVersionDiff } from "@/hooks/use-prompt-versions"
import type { PromptVersion } from "@/lib/prompts/prompt-types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  IconHistory,
  IconArrowBackUp,
  IconClock,
  IconUser,
  IconGitCompare,
  IconAlertCircle,
  IconFileText,
} from "@tabler/icons-react"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * Props for PromptVersionHistory component
 */
interface PromptVersionHistoryProps {
  /** The prompt ID to show versions for */
  promptId: string
  /** Current version number of the prompt */
  currentVersion: number
  /** Callback when a version is rolled back */
  onRollback?: (version: PromptVersion) => void
  /** Callback when two versions are selected for comparison */
  onCompare?: (v1: PromptVersion, v2: PromptVersion) => void
  /** Optional additional class name */
  className?: string
}

/**
 * Single version item in the list
 */
interface VersionItemProps {
  version: PromptVersion
  isCurrentVersion: boolean
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onRollback: () => void
  isRollingBack: boolean
  selectionDisabled: boolean
}

/**
 * Version Item Component
 * @description Displays a single version with its details and actions
 */
function VersionItem({
  version,
  isCurrentVersion,
  isSelected,
  onSelect,
  onRollback,
  isRollingBack,
  selectionDisabled,
}: VersionItemProps) {
  const contentPreview = React.useMemo(() => {
    const lines = version.content.split("\n")
    const preview = lines.slice(0, 3).join("\n")
    return preview.length > 200 ? `${preview.slice(0, 200)}...` : preview
  }, [version.content])

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isCurrentVersion && "border-primary/30 bg-primary/5",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            disabled={selectionDisabled && !isSelected}
            aria-label={`Select version ${version.version} for comparison`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={isCurrentVersion ? "default" : "outline"}>
                v{version.version}
              </Badge>
              {isCurrentVersion && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </div>

            {!isCurrentVersion && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRollback}
                disabled={isRollingBack}
                className="shrink-0"
              >
                <IconArrowBackUp className="size-4" />
                {isRollingBack ? "Rolling back..." : "Rollback"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <IconClock className="size-3.5" />
              {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
            </span>
            <span
              className="text-muted-foreground/70"
              title={format(new Date(version.createdAt), "PPpp")}
            >
              {format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>

          {version.changeNotes && (
            <div className="flex items-start gap-2 mb-3 p-2 bg-muted/50 rounded-md">
              <IconFileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{version.changeNotes}</p>
            </div>
          )}

          <div className="bg-muted/30 rounded-md p-3">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
              {contentPreview}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for version history
 */
function VersionHistorySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-5 rounded" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state when no versions exist
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <IconHistory className="size-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground font-medium">No version history</p>
      <p className="text-sm text-muted-foreground mt-1">
        Version history will appear here when you make changes to the prompt.
      </p>
    </div>
  )
}

/**
 * Error state display
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <IconAlertCircle className="size-12 text-destructive/50 mb-4" />
      <p className="text-destructive font-medium">Failed to load version history</p>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  )
}

/**
 * Prompt Version History Component
 * @description Displays the complete version history for a prompt with comparison and rollback
 * @param props - Component props
 * @param props.promptId - The ID of the prompt to show versions for
 * @param props.currentVersion - The current active version number
 * @param props.onRollback - Optional callback when a rollback is performed
 * @param props.onCompare - Optional callback when two versions are selected for comparison
 * @param props.className - Optional additional class name
 * @returns Version history panel component
 * @example
 * ```tsx
 * <PromptVersionHistory
 *   promptId="550e8400-e29b-41d4-a716-446655440000"
 *   currentVersion={5}
 *   onRollback={(version) => console.log('Rolled back to', version)}
 *   onCompare={(v1, v2) => setCompareVersions([v1, v2])}
 * />
 * ```
 */
export function PromptVersionHistory({
  promptId,
  currentVersion,
  onRollback,
  onCompare,
  className,
}: PromptVersionHistoryProps) {
  const {
    versions,
    isLoading,
    error,
    refetch,
    rollbackToVersion,
    isRollingBack,
    promptName,
  } = usePromptVersions(promptId)

  const [selectedVersions, setSelectedVersions] = React.useState<number[]>([])

  /**
   * Handle selection of a version for comparison
   */
  const handleVersionSelect = React.useCallback(
    (version: number, selected: boolean) => {
      setSelectedVersions((prev) => {
        if (selected) {
          // Allow max 2 selections
          if (prev.length >= 2) {
            return [prev[1], version]
          }
          return [...prev, version]
        } else {
          return prev.filter((v) => v !== version)
        }
      })
    },
    []
  )

  /**
   * Handle rollback action for a version
   */
  const handleRollback = React.useCallback(
    async (version: PromptVersion) => {
      const success = await rollbackToVersion(version.version)
      if (success && onRollback) {
        onRollback(version)
      }
    },
    [rollbackToVersion, onRollback]
  )

  /**
   * Handle compare action when two versions are selected
   */
  const handleCompare = React.useCallback(() => {
    if (selectedVersions.length !== 2) {
      toast.error("Please select exactly 2 versions to compare")
      return
    }

    const v1 = versions.find((v) => v.version === selectedVersions[0])
    const v2 = versions.find((v) => v.version === selectedVersions[1])

    if (v1 && v2 && onCompare) {
      onCompare(v1, v2)
    }
  }, [selectedVersions, versions, onCompare])

  /**
   * Clear selection
   */
  const handleClearSelection = React.useCallback(() => {
    setSelectedVersions([])
  }, [])

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconHistory className="size-5 text-muted-foreground" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <VersionHistorySkeleton />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className={cn("", className)}>
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  // Show empty state
  if (versions.length === 0) {
    return (
      <div className={cn("", className)}>
        <EmptyState />
      </div>
    )
  }

  // Sort versions newest first
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconHistory className="size-5 text-muted-foreground" />
          <h3 className="font-semibold">
            Version History
            {promptName && (
              <span className="text-muted-foreground font-normal">
                {" "}
                - {promptName}
              </span>
            )}
          </h3>
          <Badge variant="secondary">{versions.length} versions</Badge>
        </div>
      </div>

      {/* Compare toolbar */}
      {selectedVersions.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <IconGitCompare className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {selectedVersions.length} version{selectedVersions.length > 1 ? "s" : ""}{" "}
              selected
            </span>
            {selectedVersions.length === 2 && (
              <span className="text-primary font-medium">
                v{Math.min(...selectedVersions)} vs v{Math.max(...selectedVersions)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleCompare}
              disabled={selectedVersions.length !== 2 || !onCompare}
            >
              <IconGitCompare className="size-4" />
              Compare
            </Button>
          </div>
        </div>
      )}

      {/* Version list */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {sortedVersions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isCurrentVersion={version.version === currentVersion}
              isSelected={selectedVersions.includes(version.version)}
              onSelect={(selected) => handleVersionSelect(version.version, selected)}
              onRollback={() => handleRollback(version)}
              isRollingBack={isRollingBack}
              selectionDisabled={selectedVersions.length >= 2}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Hint text */}
      <p className="text-xs text-muted-foreground">
        Select two versions to compare them side-by-side. Click &quot;Rollback&quot; to
        restore a previous version (this creates a new version).
      </p>
    </div>
  )
}
