/**
 * Template Preview Dialog
 * @description Modal dialog for previewing a template's full content
 * @module components/features/template-library/template-preview-dialog
 */

import {
  IconEdit,
  IconEye,
  IconLock,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react"

import { getCategoryColor } from "./constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { Template } from "./types"

/**
 * Props for the TemplatePreviewDialog component
 */
interface TemplatePreviewDialogProps {
  /** Template to preview (null when closed) */
  template: Template | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when using this template */
  onUseTemplate: (template: Template) => void
  /** Callback when editing this template */
  onEditTemplate: (template: Template) => void
}

/**
 * Modal dialog for previewing a template's full content
 * @param props - Component props
 * @returns Preview dialog with full template content, tags, and action buttons
 */
export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onUseTemplate,
  onEditTemplate,
}: TemplatePreviewDialogProps) {
  if (!template) return null

  const colors = getCategoryColor(template.category)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 p-2">
              <IconEye className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {template.name}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}
                >
                  {template.category}
                </span>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4">
                {template.isPublic ? (
                  <span className="flex items-center gap-1">
                    <IconUsers className="size-3" />
                    Public
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <IconLock className="size-3" />
                    Private
                  </span>
                )}
                <span className="tabular-nums">
                  Used {template.usageCount} time{template.usageCount !== 1 ? "s" : ""}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border bg-muted/20">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {template.content}
              </p>
            </div>

            {template.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={() => {
              onUseTemplate(template)
              onOpenChange(false)
            }}
            className="flex-1 gap-1.5"
          >
            <IconSparkles className="size-3.5" />
            Create Post with AI
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onEditTemplate(template)
              onOpenChange(false)
            }}
          >
            <IconEdit className="size-4" />
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
