"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconEdit,
  IconEye,
  IconLayoutGrid,
  IconList,
  IconLoader2,
  IconLock,
  IconPlus,
  IconSearch,
  IconTemplate,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react"

import { trackTemplateAction } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { useDraft } from "@/lib/store/draft-context"
import { templateToast } from "@/lib/toast-utils"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Template categories available in the library
 */
export const TEMPLATE_CATEGORIES = [
  "Thought Leadership",
  "Personal Story",
  "How-To",
  "Engagement",
  "Sales",
] as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

/**
 * Represents a post template in the library
 */
export interface Template {
  /** Unique identifier for the template */
  id: string
  /** Display name of the template */
  name: string
  /** Template content with formatting */
  content: string
  /** Category classification */
  category: string
  /** Tags for organization and search */
  tags: string[]
  /** Number of times this template has been used */
  usageCount: number
  /** Whether the template is visible to team members */
  isPublic: boolean
  /** ISO date string of creation */
  createdAt: string
}

/**
 * Props for the TemplateLibrary component
 */
export interface TemplateLibraryProps {
  /** Array of templates to display */
  templates?: Template[]
  /** Callback when creating a new template */
  onCreateTemplate?: (template: Omit<Template, "id" | "usageCount" | "createdAt">) => void
  /** Callback when editing an existing template */
  onEditTemplate?: (id: string, template: Partial<Template>) => void
  /** Callback when deleting a template */
  onDeleteTemplate?: (id: string) => void
  /** Callback when using a template */
  onUseTemplate?: (id: string) => void
  /** Loading state indicator */
  isLoading?: boolean
}

/**
 * @deprecated Sample templates for backward compatibility only. Do not use.
 */
export const SAMPLE_TEMPLATES: Template[] = [
  {
    id: "1",
    name: "Industry Insight",
    content:
      "Here's a perspective that might challenge conventional thinking in our industry...\n\n[Share your unique insight here]\n\nThree key takeaways:\n- Point 1\n- Point 2\n- Point 3\n\nWhat's your take on this? Drop your thoughts below.\n\n#ThoughtLeadership #Industry #Innovation",
    category: "Thought Leadership",
    tags: ["leadership", "insights", "industry"],
    usageCount: 42,
    isPublic: true,
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Career Milestone Story",
    content:
      "10 years ago, I made a decision that changed everything...\n\n[Share your story here]\n\nLooking back, here's what I learned:\n\n1. [Lesson 1]\n2. [Lesson 2]\n3. [Lesson 3]\n\nHave you had a similar experience? I'd love to hear your story.\n\n#CareerJourney #PersonalGrowth",
    category: "Personal Story",
    tags: ["career", "personal", "growth"],
    usageCount: 28,
    isPublic: true,
    createdAt: "2024-01-10T14:20:00Z",
  },
  {
    id: "3",
    name: "Step-by-Step Guide",
    content:
      "Want to [achieve specific goal]? Here's my proven 5-step process:\n\nStep 1: [First step]\nStep 2: [Second step]\nStep 3: [Third step]\nStep 4: [Fourth step]\nStep 5: [Fifth step]\n\nPro tip: [Add a bonus tip]\n\nSave this for later and let me know if you try it!\n\n#HowTo #Tutorial #Tips",
    category: "How-To",
    tags: ["tutorial", "guide", "tips"],
    usageCount: 67,
    isPublic: true,
    createdAt: "2024-01-08T09:15:00Z",
  },
  {
    id: "4",
    name: "Poll Question",
    content:
      "Quick question for my network:\n\n[Your question here]?\n\nA) Option 1\nB) Option 2\nC) Option 3\nD) Share your own in the comments!\n\nDrop your answer below. I'll share the results and my thoughts next week!\n\n#Poll #Community #Engagement",
    category: "Engagement",
    tags: ["poll", "question", "community"],
    usageCount: 89,
    isPublic: false,
    createdAt: "2024-01-05T16:45:00Z",
  },
  {
    id: "5",
    name: "Product Launch",
    content:
      "Exciting news! We're launching [Product Name].\n\nHere's why this matters:\n\n- Solve [Problem 1]\n- Achieve [Benefit 1]\n- Save [Time/Money/Effort]\n\nEarly bird offer: [Special offer details]\n\nReady to learn more? Link in comments.\n\n#Launch #Innovation #Product",
    category: "Sales",
    tags: ["launch", "product", "offer"],
    usageCount: 15,
    isPublic: false,
    createdAt: "2024-01-03T11:00:00Z",
  },
  {
    id: "6",
    name: "Contrarian Take",
    content:
      "Unpopular opinion: [Your contrarian viewpoint]\n\nI know this might ruffle some feathers, but hear me out...\n\n[Explain your reasoning with 2-3 supporting points]\n\nAm I wrong? Change my mind in the comments.\n\n#Debate #Opinion #ThoughtLeadership",
    category: "Thought Leadership",
    tags: ["opinion", "debate", "controversial"],
    usageCount: 34,
    isPublic: true,
    createdAt: "2024-01-01T08:00:00Z",
  },
]

/**
 * Form data for creating or editing a template
 */
interface TemplateFormData {
  name: string
  content: string
  category: string
  tags: string
  isPublic: boolean
}

/**
 * Initial form state for creating a new template
 */
const INITIAL_FORM_DATA: TemplateFormData = {
  name: "",
  content: "",
  category: "",
  tags: "",
  isPublic: false,
}

/**
 * A CRUD interface for managing post templates.
 *
 * Features:
 * - Grid/list view toggle for template display
 * - Search and filter by category
 * - Create new templates via drawer modal
 * - Template cards with preview, category, usage count
 * - Edit and delete actions
 * - Public/private visibility indicator
 *
 * @example
 * ```tsx
 * // Basic usage with sample templates
 * <TemplateLibrary />
 *
 * // With custom handlers
 * <TemplateLibrary
 *   templates={myTemplates}
 *   onCreateTemplate={(template) => createTemplate(template)}
 *   onEditTemplate={(id, updates) => updateTemplate(id, updates)}
 *   onDeleteTemplate={(id) => deleteTemplate(id)}
 *   onUseTemplate={(id) => insertTemplate(id)}
 * />
 * ```
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

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null)
  const [formData, setFormData] = React.useState<TemplateFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [previewTemplate, setPreviewTemplate] = React.useState<Template | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)

  /**
   * Filters templates based on search query and category
   */
  const filteredTemplates = React.useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        searchQuery === "" ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory =
        categoryFilter === "all" || template.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [templates, searchQuery, categoryFilter])

  /**
   * Opens the drawer for creating a new template
   */
  const handleCreateNew = () => {
    setEditingTemplate(null)
    setFormData(INITIAL_FORM_DATA)
    setIsDrawerOpen(true)
  }

  /**
   * Opens the drawer for editing an existing template
   */
  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      tags: template.tags.join(", "),
      isPublic: template.isPublic,
    })
    setIsDrawerOpen(true)
  }

  /**
   * Handles form submission for create/edit
   */
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.content.trim() || !formData.category) {
      return
    }

    setIsSubmitting(true)

    try {
      const templateData = {
        name: formData.name.trim(),
        content: formData.content.trim(),
        category: formData.category,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        isPublic: formData.isPublic,
      }

      if (editingTemplate) {
        trackTemplateAction("created", editingTemplate.id)
        onEditTemplate?.(editingTemplate.id, templateData)
      } else {
        trackTemplateAction("created", "new")
        onCreateTemplate?.(templateData)
      }

      setIsDrawerOpen(false)
      setFormData(INITIAL_FORM_DATA)
      setEditingTemplate(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handles using a template - loads it into the composer and navigates
   */
  const handleUseTemplate = (template: Template) => {
    trackTemplateAction("used", template.id)

    // Load template into draft context
    loadTemplate(template.id, template.content)

    // Call optional callback
    onUseTemplate?.(template.id)

    // Show success toast
    templateToast.applied(template.name)

    // Navigate to compose page
    router.push("/dashboard/compose")
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

  /**
   * Opens the preview modal for a template
   */
  const handlePreview = (template: Template) => {
    setPreviewTemplate(template)
    setIsPreviewOpen(true)
  }

  /**
   * Truncates text to a specified length
   */
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + "..."
  }

  /**
   * Gets the badge variant based on category
   */
  const getCategoryVariant = (category: string): "default" | "secondary" | "outline" => {
    switch (category) {
      case "Thought Leadership":
        return "default"
      case "Personal Story":
        return "secondary"
      case "Sales":
        return "default"
      default:
        return "outline"
    }
  }

  return (
    <Card hover className="flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconTemplate className="size-5" />
              Template Library
            </CardTitle>
            <CardDescription>
              Manage and organize your post templates
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center rounded-md border p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <IconLayoutGrid className="size-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <IconList className="size-4" />
              </Button>
            </div>
            {/* Create Button */}
            <Button onClick={handleCreateNew}>
              <IconPlus className="size-4" />
              Create
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <IconSearch className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search templates"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TEMPLATE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <IconLoader2 className="text-muted-foreground size-8 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-full bg-gradient-to-br from-primary/15 to-secondary/10 p-5">
              <IconTemplate className="text-primary/70 size-8" />
            </div>
            <div>
              <h3 className="font-semibold">No templates found</h3>
              <p className="text-muted-foreground text-sm max-w-[260px]">
                {searchQuery || categoryFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Create your first template to streamline your content creation"}
              </p>
            </div>
            {!searchQuery && categoryFilter === "all" && (
              <Button onClick={handleCreateNew} variant="outline" className="gap-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5">
                <IconPlus className="size-4" />
                Create Template
              </Button>
            )}
          </div>
        )}

        {/* Template Grid/List */}
        {!isLoading && filteredTemplates.length > 0 && (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-3"
            )}
          >
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={cn(
                  "group rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30",
                  viewMode === "list" && "flex items-start gap-4"
                )}
              >
                {/* Template Info */}
                <div className={cn("flex-1", viewMode === "list" && "min-w-0")}>
                  {/* Header */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-medium">{template.name}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={getCategoryVariant(template.category)}>
                          {template.category}
                        </Badge>
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
                    </div>
                  </div>

                  {/* Content Preview */}
                  <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                    {truncateText(template.content, viewMode === "grid" ? 100 : 150)}
                  </p>

                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Usage Count */}
                  <p className="text-muted-foreground text-xs">
                    Used {template.usageCount} time{template.usageCount !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Actions */}
                <div
                  className={cn(
                    "flex gap-1",
                    viewMode === "grid"
                      ? "mt-4 border-t pt-3"
                      : "flex-col items-end justify-start"
                  )}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className={cn(viewMode === "grid" && "flex-1")}
                  >
                    Use
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handlePreview(template)}
                    aria-label={`Preview ${template.name}`}
                  >
                    <IconEye className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleEdit(template)}
                    aria-label={`Edit ${template.name}`}
                  >
                    <IconEdit className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(template.id)}
                    aria-label={`Delete ${template.name}`}
                    className="text-destructive hover:text-destructive"
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="text-muted-foreground border-t pt-4 text-sm">
        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}{" "}
        {searchQuery || categoryFilter !== "all" ? "found" : "total"}
      </CardFooter>

      {/* Create/Edit Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="right">
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DrawerTitle>
            <DrawerDescription>
              {editingTemplate
                ? "Update your template details below"
                : "Fill in the details to create a new template"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-4 overflow-y-auto p-4">
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
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="template-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  "border-input bg-background placeholder:text-muted-foreground min-h-[200px] w-full resize-none rounded-md border px-3 py-2 text-sm shadow-xs transition-colors",
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

          <DrawerFooter className="border-t">
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1">
                  <IconX className="size-4" />
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.name.trim() ||
                  !formData.content.trim() ||
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
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Confirmation Dialog */}
      <ConfirmDialogComponent />

      {/* Template Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTemplate?.name}
              <Badge variant={previewTemplate ? getCategoryVariant(previewTemplate.category) : "default"}>
                {previewTemplate?.category}
              </Badge>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4 text-sm">
              {previewTemplate?.isPublic ? (
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
              <span>
                Used {previewTemplate?.usageCount} time{previewTemplate?.usageCount !== 1 ? "s" : ""}
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Full Template Content */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {previewTemplate?.content}
                </p>
              </div>

              {/* Tags */}
              {previewTemplate && previewTemplate.tags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {previewTemplate.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="default"
              onClick={() => {
                if (previewTemplate) {
                  handleUseTemplate(previewTemplate)
                  setIsPreviewOpen(false)
                }
              }}
              className="flex-1"
            >
              Use This Template
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (previewTemplate) {
                  handleEdit(previewTemplate)
                  setIsPreviewOpen(false)
                }
              }}
            >
              <IconEdit className="size-4" />
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
