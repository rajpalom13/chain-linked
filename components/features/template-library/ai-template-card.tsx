/**
 * AI Template Card
 * @description A single AI template suggestion card with color-accented top border
 * @module components/features/template-library/ai-template-card
 */

import { IconPlus, IconSparkles } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { AITemplate } from "./types"

/**
 * Props for the AITemplateCard component
 */
interface AITemplateCardProps {
  /** The AI template data */
  template: AITemplate
  /** Top border accent color class */
  borderColor: string
  /** Callback when using this template */
  onUse: (template: AITemplate) => void
  /** Callback when saving this template to library */
  onSave: (template: AITemplate) => void
}

/**
 * A single AI template suggestion card with color-accented top border
 * @param props - Component props
 * @returns A polished template preview card
 */
export function AITemplateCard({
  template,
  borderColor,
  onUse,
  onSave,
}: AITemplateCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 border-t-2 bg-gradient-to-br from-card to-primary/[0.02] p-4 transition-colors hover:border-border",
        borderColor
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug">{template.name}</h4>
        <Badge variant="outline" className="text-xs shrink-0">
          {template.category}
        </Badge>
      </div>
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap">
        {template.content}
      </p>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onUse(template)}
        >
          <IconSparkles className="size-3.5" />
          Create Post
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSave(template)}
        >
          <IconPlus className="size-3.5" />
          Save
        </Button>
      </div>
    </div>
  )
}
