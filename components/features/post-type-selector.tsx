"use client"

/**
 * Post Type Selector Component
 * @description A dropdown component for selecting a LinkedIn post type,
 * displaying each type with its icon, label, description, and category grouping.
 * @module components/features/post-type-selector
 */

import * as React from "react"
import {
  IconBook,
  IconList,
  IconRoute,
  IconArrowsShuffle,
  IconChartBar,
  IconMoodSmile,
  IconChartDots,
  IconMessageQuestion,
  IconPresentation,
  IconSparkles,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import {
  type PostTypeId,
  type PostTypeDefinition,
  getPostType,
  getPostTypesGrouped,
  POST_TYPE_CATEGORIES,
} from "@/lib/ai/post-types"
import { getPostTypeTip } from "@/lib/ai/prompt-templates"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Maps post type icon names to their Tabler icon components
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IconBook,
  IconList,
  IconRoute,
  IconArrowsShuffle,
  IconChartBar,
  IconMoodSmile,
  IconChartDots,
  IconMessageQuestion,
  IconPresentation,
}

/**
 * Maps post type color names to Tailwind text color classes
 */
const COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-500',
  emerald: 'text-emerald-500',
  violet: 'text-violet-500',
  red: 'text-red-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  cyan: 'text-cyan-500',
  orange: 'text-orange-500',
  purple: 'text-purple-500',
}

/**
 * Maps post type color names to Tailwind background color classes (muted)
 */
const BG_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500/10',
  emerald: 'bg-emerald-500/10',
  violet: 'bg-violet-500/10',
  red: 'bg-red-500/10',
  amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10',
  cyan: 'bg-cyan-500/10',
  orange: 'bg-orange-500/10',
  purple: 'bg-purple-500/10',
}

/**
 * Props for PostTypeSelector component
 */
export interface PostTypeSelectorProps {
  /** Currently selected post type ID, or undefined for no selection */
  value?: PostTypeId
  /** Callback fired when a post type is selected */
  onChange: (typeId: PostTypeId) => void
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Whether to show the tip text below the selector */
  showTip?: boolean
  /** Additional CSS class names */
  className?: string
}

/**
 * Renders the icon for a given post type definition
 * @param type - The post type definition
 * @param className - Optional additional classes
 * @returns The icon component or a fallback
 */
function PostTypeIcon({ type, className }: { type: PostTypeDefinition; className?: string }) {
  const IconComponent = ICON_MAP[type.icon]
  if (!IconComponent) {
    return <IconSparkles className={cn("size-4", className)} />
  }
  return <IconComponent className={cn("size-4", COLOR_MAP[type.color], className)} />
}

/**
 * A dropdown selector for choosing LinkedIn post types.
 *
 * Groups post types by category (Storytelling, Educational, Engagement, Visual)
 * and displays each type with its icon, label, and description.
 * Optionally renders a contextual tip below the selector.
 *
 * @param props - Component props
 * @param props.value - Currently selected post type ID
 * @param props.onChange - Callback when selection changes
 * @param props.disabled - Whether the selector is disabled
 * @param props.showTip - Whether to show the tip text
 * @param props.className - Additional CSS class names
 * @returns The post type selector JSX element
 *
 * @example
 * ```tsx
 * const [postType, setPostType] = useState<PostTypeId | undefined>()
 *
 * <PostTypeSelector
 *   value={postType}
 *   onChange={setPostType}
 *   showTip
 * />
 * ```
 */
export function PostTypeSelector({
  value,
  onChange,
  disabled = false,
  showTip = false,
  className,
}: PostTypeSelectorProps) {
  const grouped = React.useMemo(() => getPostTypesGrouped(), [])
  const selectedType = value ? getPostType(value) : undefined
  const tip = value ? getPostTypeTip(value) : ''

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        value={value ?? ''}
        onValueChange={(val) => onChange(val as PostTypeId)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a post type...">
            {selectedType && (
              <div className="flex items-center gap-2">
                <PostTypeIcon type={selectedType} />
                <span>{selectedType.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(grouped) as Array<PostTypeDefinition['category']>).map((category) => {
            const types = grouped[category]
            if (types.length === 0) return null

            return (
              <SelectGroup key={category}>
                <SelectLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {POST_TYPE_CATEGORIES[category]}
                </SelectLabel>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded",
                          BG_COLOR_MAP[type.color]
                        )}
                      >
                        <PostTypeIcon type={type} className="size-3.5" />
                      </span>
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-sm">{type.label}</span>
                        <span className="text-muted-foreground text-xs">
                          {type.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )
          })}
        </SelectContent>
      </Select>

      {/* Contextual tip for the selected post type */}
      {showTip && tip && (
        <p className="text-xs text-muted-foreground leading-relaxed pl-1">
          <strong className="text-foreground">Tip:</strong> {tip}
        </p>
      )}
    </div>
  )
}
