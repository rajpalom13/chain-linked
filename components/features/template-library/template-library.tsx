"use client"

/**
 * Template Library
 * @description Main orchestrator for the template library page. Provides a flat,
 * modern layout with category filtering, search, CRUD operations, and AI templates.
 * @module components/features/template-library/template-library
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconPlus, IconSearch, IconTemplate, IconX } from "@tabler/icons-react"

import { trackTemplateAction } from "@/lib/analytics"
import { useDraft } from "@/lib/store/draft-context"
import { type AISuggestion } from "@/lib/store/draft-context"
import { templateToast } from "@/lib/toast-utils"
import { useTemplateCategories } from "@/hooks/use-template-categories"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import { CATEGORY_AI_DEFAULTS, INITIAL_FORM_DATA } from "./constants"
import { AITemplatesSection } from "./ai-templates-section"
import { CategoryFilterBar } from "./category-filter-bar"
import { TemplateCard } from "./template-card"
import { TemplateEmptyState } from "./template-empty-state"
import { TemplateFormDialog } from "./template-form-dialog"
import { TemplateGrid } from "./template-grid"
import { TemplateGridSkeleton } from "./template-grid-skeleton"
import { TemplatePreviewDialog } from "./template-preview-dialog"
import type { AITemplate, Template, TemplateFormData, TemplateLibraryProps } from "./types"

/**
 * Full template library UI with flat layout, category management, and AI suggestions.
 *
 * @param props - Component props
 * @param props.templates - Array of templates to display
 * @param props.onCreateTemplate - Callback when creating a new template
 * @param props.onEditTemplate - Callback when editing an existing template
 * @param props.onDeleteTemplate - Callback when deleting a template
 * @param props.onUseTemplate - Callback when using a template
 * @param props.isLoading - Loading state indicator
 * @returns Redesigned template library page
 */
export function TemplateLibrary({
  templates = [],
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onUseTemplate,
  isLoading = false,
}: TemplateLibraryProps) {
  const router = useRouter()
  const { loadTemplate } = useDraft()
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  // Category management
  const {
    allCategories,
    isSaving: isCategorySaving,
    fetchCategories,
    createCategory,
    deleteCategory,
  } = useTemplateCategories()

  // Fetch categories on mount
  React.useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Local state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = React.useState<Template | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)

  /**
   * Split templates into user-created and AI-generated
   */
  const { userTemplates, aiGeneratedTemplates } = React.useMemo(() => {
    const user: Template[] = []
    const ai: Template[] = []
    for (const t of templates) {
      if (t.isAiGenerated) {
        ai.push(t)
      } else {
        user.push(t)
      }
    }
    return { userTemplates: user, aiGeneratedTemplates: ai }
  }, [templates])

  /**
   * Template counts per category name (user templates only)
   */
  const templateCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of userTemplates) {
      counts[t.category] = (counts[t.category] ?? 0) + 1
    }
    return counts
  }, [userTemplates])

  /**
   * Filters user templates based on search query and category
   */
  const filteredTemplates = React.useMemo(() => {
    return userTemplates.filter((template) => {
      const matchesSearch =
        searchQuery === "" ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory =
        categoryFilter === "all" || template.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [userTemplates, searchQuery, categoryFilter])

  /**
   * Opens the dialog for creating a new template
   */
  const handleCreateNew = () => {
    setEditingTemplate(null)
    setIsDialogOpen(true)
  }

  /**
   * Opens the dialog for editing an existing template
   */
  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setIsDialogOpen(true)
  }

  /**
   * Handles form submission for create/edit
   */
  const handleFormSubmit = (data: TemplateFormData, editingId: string | null) => {
    const templateData = {
      name: data.name.trim(),
      content: data.content.trim(),
      category: data.category,
      tags: data.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      isPublic: data.isPublic,
    }

    if (editingId) {
      trackTemplateAction("edited", editingId)
      onEditTemplate?.(editingId, templateData)
    } else {
      trackTemplateAction("created", "new")
      onCreateTemplate?.(templateData)
    }
  }

  /**
   * Builds an AI suggestion from a category string and template name
   */
  const buildAISuggestion = (category: string, templateName: string): AISuggestion => {
    const defaults = CATEGORY_AI_DEFAULTS[category] ?? {
      topic: "Write a LinkedIn post about [your topic]",
      tone: "professional",
    }
    return {
      topic: defaults.topic,
      tone: defaults.tone,
      context: `Using the "${templateName}" template as a starting point. Fill in the bracketed placeholders with your own content.`,
    }
  }

  /**
   * Handles using a template - loads it into the composer with AI context
   */
  const handleUseTemplate = (template: Template) => {
    trackTemplateAction("used", template.id)
    const aiSuggestion = buildAISuggestion(template.category, template.name)
    loadTemplate(template.id, template.content, aiSuggestion)
    onUseTemplate?.(template.id)
    templateToast.applied(template.name)
    router.push("/dashboard/compose")
  }

  /**
   * Handles using an AI template
   */
  const handleUseAITemplate = (template: AITemplate) => {
    const aiSuggestion = buildAISuggestion(template.category, template.name)
    loadTemplate(template.id, template.content, aiSuggestion)
    templateToast.applied(template.name)
    router.push("/dashboard/compose")
  }

  /**
   * Handles saving an AI template to the user's library
   */
  const handleSaveAITemplate = (template: AITemplate) => {
    onCreateTemplate?.({
      name: template.name,
      content: template.content,
      category: template.category,
      tags: template.tags,
      isPublic: false,
    })
  }

  /**
   * Handles template deletion with confirmation
   */
  const handleDelete = async (id: string) => {
    const templateToDelete = templates.find((t) => t.id === id)
    const confirmed = await confirm({
      title: "Delete Template?",
      description: `Are you sure you want to delete "${templateToDelete?.name ?? "this template"}"? This action cannot be undone.`,
      variant: "destructive",
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (confirmed) {
      trackTemplateAction("deleted", id)
      onDeleteTemplate?.(id)
      templateToast.deleted(templateToDelete?.name ?? "Template")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 p-2.5">
            <IconTemplate className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Template Library</h1>
            <p className="text-muted-foreground text-sm">
              Manage and share your post templates
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew} className="gap-1.5">
          <IconPlus className="size-4" />
          Create Template
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <IconSearch className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search templates by name, content, or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          aria-label="Search templates"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
          >
            <IconX className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Category filter bar */}
      <CategoryFilterBar
        categories={allCategories}
        activeCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        templateCounts={templateCounts}
        onCreateCategory={createCategory}
        onDeleteCategory={deleteCategory}
        isSaving={isCategorySaving}
      />

      {/* Template count */}
      <p className="text-muted-foreground text-sm -mt-2">
        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}{" "}
        {searchQuery || categoryFilter !== "all" ? "found" : "total"}
      </p>

      {/* Loading state */}
      {isLoading && <TemplateGridSkeleton />}

      {/* Empty state */}
      {!isLoading && filteredTemplates.length === 0 && (
        <TemplateEmptyState
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          onCreateNew={handleCreateNew}
        />
      )}

      {/* Template grid */}
      {!isLoading && filteredTemplates.length > 0 && (
        <TemplateGrid>
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPreview={(t) => {
                setPreviewTemplate(t)
                setIsPreviewOpen(true)
              }}
              onUseTemplate={handleUseTemplate}
            />
          ))}
        </TemplateGrid>
      )}

      {/* Separator */}
      <Separator />

      {/* AI Templates section */}
      <AITemplatesSection
        onUseAITemplate={handleUseAITemplate}
        onSaveAITemplate={handleSaveAITemplate}
        dynamicTemplates={aiGeneratedTemplates}
      />

      {/* Create/Edit Dialog */}
      <TemplateFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingTemplate={editingTemplate}
        allCategories={allCategories}
        onSubmit={handleFormSubmit}
        onCreateCategory={createCategory}
      />

      {/* Preview Dialog */}
      <TemplatePreviewDialog
        template={previewTemplate}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onUseTemplate={handleUseTemplate}
        onEditTemplate={handleEdit}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
