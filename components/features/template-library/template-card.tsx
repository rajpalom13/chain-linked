/**
 * Template Card
 * @description Redesigned user template card with color-coded category border,
 * hover-lift animation, and clean action layout.
 * @module components/features/template-library/template-card
 */

import {
  IconEdit,
  IconEye,
  IconLock,
  IconSparkles,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { getCategoryColor } from "./constants"
import type { Template } from "./types"

/**
 * Props for the TemplateCard component
 */
interface TemplateCardProps {
  /** Template data to display */
  template: Template
  /** Callback when editing this template */
  onEdit: (template: Template) => void
  /** Callback when deleting this template */
  onDelete: (id: string) => void
  /** Callback when previewing this template */
  onPreview: (template: Template) => void
  /** Callback when using this template to create a post */
  onUseTemplate: (template: Template) => void
}

/**
 * A polished template card with color-coded top border and hover animations
 * @param props - Component props
 * @returns Template card with category badge, content preview, and action buttons
 */
export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onPreview,
  onUseTemplate,
}: TemplateCardProps) {
  const colors = getCategoryColor(template.category)

  return (
    <div
      className={cn(
        "hover-lift group relative flex flex-col rounded-xl border border-t-2 border-border/50 bg-card p-5 transition-colors hover:border-border",
        colors.border
      )}
    >
      {/* Header: name + hover actions */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold leading-snug">
          {template.name}
        </h3>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(template)}
            aria-label={`Edit ${template.name}`}
            className="size-7"
          >
            <IconEdit className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(template.id)}
            aria-label={`Delete ${template.name}`}
            className="size-7 text-destructive hover:text-destructive"
          >
            <IconTrash className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Category badge + visibility */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            colors.badgeBg,
            colors.badgeText
          )}
        >
          {template.category}
        </span>
        {template.isPublic ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <IconUsers className="size-3" />
            Public
          </span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <IconLock className="size-3" />
            Private
          </span>
        )}
      </div>

      {/* Content preview */}
      <p className="text-muted-foreground mb-3 flex-1 text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap">
        {template.content}
      </p>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer: usage + actions */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-auto">
        <span className="text-muted-foreground text-xs tabular-nums">
          Used {template.usageCount} time{template.usageCount !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPreview(template)}
            aria-label={`Preview ${template.name}`}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <IconEye className="size-3.5 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => onUseTemplate(template)}
            className="h-7 gap-1.5"
          >
            <IconSparkles className="size-3.5" />
            Create Post
          </Button>
        </div>
      </div>
    </div>
  )
}
