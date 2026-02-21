"use client"

/**
 * Template Form Dialog
 * @description Create/Edit dialog with dynamic categories and inline
 * "+ New Category" creation flow.
 * @module components/features/template-library/template-form-dialog
 */

import * as React from "react"
import {
  IconEdit,
  IconLoader2,
  IconPlus,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { showError } from "@/lib/toast-utils"
import type { MergedCategory, TemplateCategory } from "@/hooks/use-template-categories"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { CREATE_NEW_CATEGORY_VALUE, INITIAL_FORM_DATA } from "./constants"
import type { Template, TemplateFormData } from "./types"

/**
 * Props for the TemplateFormDialog component
 */
interface TemplateFormDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Template being edited, or null for create mode */
  editingTemplate: Template | null
  /** All available categories (defaults + custom) */
  allCategories: MergedCategory[]
  /** Callback when form is submitted */
  onSubmit: (data: TemplateFormData, editingId: string | null) => void
  /** Callback to create a new category inline */
  onCreateCategory: (name: string) => Promise<TemplateCategory | null>
}

/**
 * Create/Edit template dialog with dynamic category selector
 * @param props - Component props
 * @returns Dialog with form fields and inline category creation
 */
export function TemplateFormDialog({
  open,
  onOpenChange,
  editingTemplate,
  allCategories,
  onSubmit,
  onCreateCategory,
}: TemplateFormDialogProps) {
  const [formData, setFormData] = React.useState<TemplateFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = React.useState(false)
  const [newCategoryName, setNewCategoryName] = React.useState("")
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false)

  /**
   * Sync form data when editingTemplate changes or dialog opens
   */
  React.useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setFormData({
          name: editingTemplate.name,
          content: editingTemplate.content,
          category: editingTemplate.category,
          tags: editingTemplate.tags.join(", "),
          isPublic: editingTemplate.isPublic,
        })
      } else {
        setFormData(INITIAL_FORM_DATA)
      }
      setShowNewCategoryInput(false)
      setNewCategoryName("")
    }
  }, [open, editingTemplate])

  /**
   * Handle category select change
   */
  const handleCategoryChange = (value: string) => {
    if (value === CREATE_NEW_CATEGORY_VALUE) {
      setShowNewCategoryInput(true)
    } else {
      setFormData({ ...formData, category: value })
      setShowNewCategoryInput(false)
    }
  }

  /**
   * Handle creating a new category inline
   */
  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    setIsCreatingCategory(true)
    try {
      const result = await onCreateCategory(trimmed)
      if (result) {
        setFormData({ ...formData, category: result.name })
        setShowNewCategoryInput(false)
        setNewCategoryName("")
      }
    } finally {
      setIsCreatingCategory(false)
    }
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.content.trim() || !formData.category) {
      return
    }

    if (formData.name.trim().length < 3) {
      showError("Name must be at least 3 characters")
      return
    }

    if (formData.content.trim().length < 10) {
      showError("Content must be at least 10 characters")
      return
    }

    setIsSubmitting(true)
    try {
      onSubmit(formData, editingTemplate?.id ?? null)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 p-2">
              {editingTemplate ? (
                <IconEdit className="size-4 text-primary" />
              ) : (
                <IconPlus className="size-4 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? "Update your template details below"
                  : "Fill in the details to create a new template"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 py-2">
          {/* Name Input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              placeholder="Enter template name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Category Select */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger id="template-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
                <SelectItem value={CREATE_NEW_CATEGORY_VALUE}>
                  <span className="flex items-center gap-1.5 text-primary">
                    <IconPlus className="size-3.5" />
                    Create New Category
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Inline new category input */}
            {showNewCategoryInput && (
              <div className="flex gap-1.5">
                <Input
                  placeholder="New category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory()
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                  onClick={handleCreateCategory}
                >
                  {isCreatingCategory ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Content Textarea */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-content">Content</Label>
            <textarea
              id="template-content"
              placeholder="Enter your template content..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className={cn(
                "border-input bg-background placeholder:text-muted-foreground min-h-[180px] w-full resize-none rounded-md border px-3 py-2 text-sm shadow-xs transition-colors",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
              )}
            />
          </div>

          {/* Tags Input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-tags">Tags</Label>
            <Input
              id="template-tags"
              placeholder="Enter tags separated by commas"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
            <p className="text-muted-foreground text-xs">
              Separate multiple tags with commas (e.g., leadership, tips, career)
            </p>
          </div>

          {/* Public Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="template-public"
              checked={formData.isPublic}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPublic: checked === true })
              }
            />
            <Label htmlFor="template-public" className="cursor-pointer">
              Make this template public to team members
            </Label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              formData.name.trim().length < 3 ||
              formData.content.trim().length < 10 ||
              !formData.category
            }
            className="flex-1"
          >
            {isSubmitting ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : editingTemplate ? (
              <IconEdit className="size-4" />
            ) : (
              <IconPlus className="size-4" />
            )}
            {editingTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
