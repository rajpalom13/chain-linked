"use client"

/**
 * Compose Tone Selector
 * @description Shared tone selector extracted for reuse across Basic and Advanced modes.
 * Renders tone options as toggle pill buttons.
 * @module components/features/compose/compose-tone-selector
 */

import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

/**
 * Tone options for post generation
 */
export const TONE_OPTIONS = [
  { value: 'match-my-style', label: 'Match My Style' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'inspiring', label: 'Inspiring' },
  { value: 'educational', label: 'Educational' },
  { value: 'thought-provoking', label: 'Thought-Provoking' },
]

/**
 * Props for ComposeToneSelector
 */
interface ComposeToneSelectorProps {
  /** Currently selected tone value */
  value: string
  /** Callback when tone changes */
  onValueChange: (value: string) => void
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Use compact sizing for advanced mode */
  compact?: boolean
}

/**
 * Tone selector using ToggleGroup pills.
 * Extracted from AIInlinePanel for reuse across compose modes.
 * @param props - Component props
 * @returns Tone selector JSX element
 */
export function ComposeToneSelector({
  value,
  onValueChange,
  disabled,
  compact,
}: ComposeToneSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Tone</Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onValueChange(v)}
        className="flex flex-wrap gap-1"
        spacing={1}
      >
        {TONE_OPTIONS.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            size="sm"
            className={cn(
              "rounded-full",
              compact
                ? "text-[11px] px-2 py-0.5 h-6"
                : "text-xs px-2.5 py-1 h-7"
            )}
            disabled={disabled}
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
