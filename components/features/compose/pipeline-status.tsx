"use client"

/**
 * Pipeline Status Component
 * @description Displays the status of each post-generation pipeline step with
 * status icons, timing, issues with severity colors, and refinement messages.
 * @module components/features/compose/pipeline-status
 */

import { cn } from "@/lib/utils"
import {
  IconCheck,
  IconX,
  IconLoader2,
  IconPlayerSkipForward,
  IconAlertTriangle,
  IconInfoCircle,
  IconShieldCheck,
  IconWorldSearch,
  IconPencil,
} from "@tabler/icons-react"
import type { PipelineResult, PipelineStep, PipelineIssue, PipelineStage } from "@/lib/ai/pipeline"

/**
 * Props for the PipelineStatus component
 */
interface PipelineStatusProps {
  /** Pipeline result data to display */
  result: PipelineResult | null
  /** Whether the pipeline is currently running */
  isRunning?: boolean
  /** Optional CSS class name */
  className?: string
}

/**
 * Configuration for rendering each pipeline stage
 */
const STAGE_CONFIG: Record<PipelineStage, { label: string; icon: typeof IconShieldCheck }> = {
  verification: { label: 'Content Rules', icon: IconShieldCheck },
  'fact-check': { label: 'Fact Check', icon: IconWorldSearch },
  refinement: { label: 'Auto-Refine', icon: IconPencil },
}

/**
 * Returns the status icon component for a pipeline step
 * @param step - The pipeline step to get an icon for
 * @returns JSX icon element with appropriate styling
 */
function StepStatusIcon({ step }: { step: PipelineStep }) {
  switch (step.status) {
    case 'passed':
      return <IconCheck className="h-4 w-4 text-green-500" />
    case 'failed':
      return <IconX className="h-4 w-4 text-red-500" />
    case 'skipped':
      return <IconPlayerSkipForward className="h-4 w-4 text-muted-foreground" />
    case 'error':
      return <IconAlertTriangle className="h-4 w-4 text-amber-500" />
    default:
      return <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }
}

/**
 * Returns the severity color class for a pipeline issue
 * @param severity - The issue severity level
 * @returns Tailwind CSS class string
 */
function severityColor(severity: PipelineIssue['severity']): string {
  switch (severity) {
    case 'error':
      return 'text-red-600 dark:text-red-400'
    case 'warning':
      return 'text-amber-600 dark:text-amber-400'
    case 'info':
      return 'text-blue-600 dark:text-blue-400'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Renders a single pipeline step row with status, label, and timing.
 * @param props - Component props
 * @param props.step - The pipeline step data
 * @returns JSX element for the step row
 */
function StepRow({ step }: { step: PipelineStep }) {
  const config = STAGE_CONFIG[step.stage]

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StepStatusIcon step={step} />
          <config.icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {step.durationMs > 0 ? `${(step.durationMs / 1000).toFixed(1)}s` : ''}
        </span>
      </div>

      {/* Show error message if step errored */}
      {step.errorMessage && (
        <p className="ml-6 text-xs text-amber-600 dark:text-amber-400">
          {step.errorMessage}
        </p>
      )}

      {/* Show issues for this step */}
      {step.issues.length > 0 && (
        <div className="ml-6 space-y-0.5">
          {step.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {issue.severity === 'error' ? (
                <IconX className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
              ) : issue.severity === 'warning' ? (
                <IconAlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
              ) : (
                <IconInfoCircle className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
              )}
              <span className={cn("text-xs leading-relaxed", severityColor(issue.severity))}>
                {issue.message}
                {issue.suggestion && (
                  <span className="text-muted-foreground"> ({issue.suggestion})</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Displays the pipeline processing status with step-by-step results.
 * Shows status icons (check/x/spinner/skip), timing per step, issues with
 * severity colors, and a refinement banner if the post was auto-corrected.
 *
 * @param props - Component props
 * @param props.result - The pipeline result to display, or null if not yet available
 * @param props.isRunning - Whether the pipeline is currently executing
 * @param props.className - Optional additional CSS classes
 * @returns Pipeline status panel JSX element
 * @example
 * <PipelineStatus result={pipelineResult} isRunning={false} />
 */
export function PipelineStatus({ result, isRunning, className }: PipelineStatusProps) {
  // Show loading state while pipeline is running
  if (isRunning) {
    return (
      <div className={cn("rounded-lg border bg-card p-3 space-y-2", className)}>
        <div className="flex items-center gap-2">
          <IconLoader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">Running quality checks...</span>
        </div>
      </div>
    )
  }

  // Don't render anything if no result
  if (!result) {
    return null
  }

  return (
    <div className={cn("rounded-lg border bg-card p-3 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quality Pipeline
        </span>
        <span className="text-xs text-muted-foreground">
          {(result.totalDurationMs / 1000).toFixed(1)}s total
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {result.steps.map((step, i) => (
          <StepRow key={`${step.stage}-${i}`} step={step} />
        ))}
      </div>

      {/* Refinement banner */}
      {result.wasRefined && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 px-3 py-2">
          <p className="text-xs font-medium text-green-700 dark:text-green-400">
            Post was automatically refined to address {result.totalIssues} issue{result.totalIssues !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Summary if there are unresolved issues */}
      {!result.wasRefined && result.totalIssues > 0 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {result.errorCount} error{result.errorCount !== 1 ? 's' : ''}, {result.warningCount} warning{result.warningCount !== 1 ? 's' : ''} found. Review before publishing.
          </p>
        </div>
      )}
    </div>
  )
}
