"use client"

/**
 * Template Library
 * @description A comprehensive template management interface with AI-generated
 * suggestions, category filtering, search, and CRUD operations for LinkedIn
 * post templates.
 * @module components/features/template-library
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconBulb,
  IconEdit,
  IconEye,
  IconLayoutGrid,
  IconList,
  IconListNumbers,
  IconLoader2,
  IconLock,
  IconMessageChatbot,
  IconPlus,
  IconRoute,
  IconSearch,
  IconSparkles,
  IconTemplate,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react"

import { trackTemplateAction } from "@/lib/analytics"
import {
  staggerContainerVariants,
  staggerItemVariants,
  fadeSlideUpVariants,
} from "@/lib/animations"
import { cn } from "@/lib/utils"
import { useDraft } from "@/lib/store/draft-context"
import { templateToast, showError } from "@/lib/toast-utils"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
 * AI template category definition
 */
interface AITemplateCategory {
  /** Category identifier */
  id: string
  /** Display name */
  name: string
  /** Icon component */
  icon: React.ReactNode
  /** Color class for the icon background */
  color: string
  /** Templates in this category */
  templates: AITemplate[]
}

/**
 * An AI-generated template suggestion
 */
interface AITemplate {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Template content */
  content: string
  /** Category label */
  category: string
  /** Tags */
  tags: string[]
}

/**
 * Pre-built AI template suggestions organized by category
 */
const AI_TEMPLATE_CATEGORIES: AITemplateCategory[] = [
  {
    id: "hooks",
    name: "Hook Templates",
    icon: <IconBulb className="size-4" />,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    templates: [
      {
        id: "ai-hook-1",
        name: "Contrarian Take",
        content: "Unpopular opinion:\n\n[Your contrarian take here]\n\nHere's why most people get this wrong:\n\n1. [Reason 1]\n2. [Reason 2]\n3. [Reason 3]\n\nThe truth is [your insight].\n\nAgree or disagree? Let me know below.",
        category: "Engagement",
        tags: ["hook", "contrarian", "engagement"],
      },
      {
        id: "ai-hook-2",
        name: "Bold Statement",
        content: "I've spent [X years] in [industry].\n\nHere's the one thing nobody tells you:\n\n[Bold statement]\n\nLet me explain...\n\n[Your explanation with evidence]\n\nSave this for when you need a reminder.",
        category: "Thought Leadership",
        tags: ["hook", "bold", "expertise"],
      },
      {
        id: "ai-hook-3",
        name: "Pattern Interrupt",
        content: "Stop scrolling.\n\nThis might change how you think about [topic].\n\n[Your insight or discovery]\n\nHere's what I learned:\n\n[Key takeaway 1]\n[Key takeaway 2]\n[Key takeaway 3]\n\nRepost if this resonated.",
        category: "Engagement",
        tags: ["hook", "pattern-interrupt", "viral"],
      },
    ],
  },
  {
    id: "storytelling",
    name: "Storytelling",
    icon: <IconRoute className="size-4" />,
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    templates: [
      {
        id: "ai-story-1",
        name: "Failure to Success",
        content: "3 years ago, I [describe failure].\n\nEveryone told me to [common advice].\n\nInstead, I [what you actually did].\n\nThe result?\n\n[Impressive outcome]\n\nHere's what I wish I knew back then:\n\n1. [Lesson 1]\n2. [Lesson 2]\n3. [Lesson 3]\n\nYour setback is your setup.",
        category: "Personal Story",
        tags: ["storytelling", "failure", "growth"],
      },
      {
        id: "ai-story-2",
        name: "Behind the Scenes",
        content: "What nobody sees behind [your achievement]:\n\n- [Hidden effort 1]\n- [Hidden effort 2]\n- [Hidden effort 3]\n- [Hidden effort 4]\n\nSuccess isn't overnight.\n\nIt's [timeframe] of [consistent action].\n\nWhat's your behind-the-scenes story?",
        category: "Personal Story",
        tags: ["storytelling", "authenticity", "transparency"],
      },
    ],
  },
  {
    id: "howto",
    name: "How-To Guides",
    icon: <IconMessageChatbot className="size-4" />,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    templates: [
      {
        id: "ai-howto-1",
        name: "Step-by-Step Guide",
        content: "How to [achieve result] in [timeframe]:\n\n(A thread for [target audience])\n\nStep 1: [Action]\n- [Detail]\n- [Detail]\n\nStep 2: [Action]\n- [Detail]\n- [Detail]\n\nStep 3: [Action]\n- [Detail]\n- [Detail]\n\nStep 4: [Action]\n- [Detail]\n- [Detail]\n\nStep 5: [Action]\n- [Detail]\n- [Detail]\n\nBookmark this for later.\nFollow me for more [topic] tips.",
        category: "How-To",
        tags: ["howto", "guide", "actionable"],
      },
      {
        id: "ai-howto-2",
        name: "Common Mistakes",
        content: "[X] mistakes killing your [goal]:\n\n(And how to fix each one)\n\nMistake 1: [Description]\nFix: [Solution]\n\nMistake 2: [Description]\nFix: [Solution]\n\nMistake 3: [Description]\nFix: [Solution]\n\nMistake 4: [Description]\nFix: [Solution]\n\nMistake 5: [Description]\nFix: [Solution]\n\nWhich one are you guilty of?",
        category: "How-To",
        tags: ["howto", "mistakes", "tips"],
      },
    ],
  },
  {
    id: "lists",
    name: "List Posts",
    icon: <IconListNumbers className="size-4" />,
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    templates: [
      {
        id: "ai-list-1",
        name: "Tools & Resources",
        content: "[X] tools that changed how I [activity]:\n\n1. [Tool] - [What it does]\n2. [Tool] - [What it does]\n3. [Tool] - [What it does]\n4. [Tool] - [What it does]\n5. [Tool] - [What it does]\n6. [Tool] - [What it does]\n7. [Tool] - [What it does]\n\nBonus: [Extra tool or tip]\n\nWhich ones are you using?",
        category: "Engagement",
        tags: ["list", "tools", "resources"],
      },
      {
        id: "ai-list-2",
        name: "Lessons Learned",
        content: "[X] things I learned in [timeframe/experience]:\n\n1. [Lesson] - [Brief explanation]\n2. [Lesson] - [Brief explanation]\n3. [Lesson] - [Brief explanation]\n4. [Lesson] - [Brief explanation]\n5. [Lesson] - [Brief explanation]\n\nThe biggest surprise? Number [X].\n\nWhat would you add to this list?",
        category: "Thought Leadership",
        tags: ["list", "lessons", "reflection"],
      },
    ],
  },
]

/**
 * Loading skeleton for the template grid
 * @returns Skeleton placeholder cards for loading state
 */
function TemplateGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-1 pt-2 border-t">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state illustration for when no templates exist
 * @param props - Component props
 * @param props.searchQuery - Current search query
 * @param props.categoryFilter - Current category filter
 * @param props.onCreateNew - Callback to create a new template
 * @returns Friendly empty state with call to action
 */
function TemplateEmptyState({
  searchQuery,
  categoryFilter,
  onCreateNew,
}: {
  searchQuery: string
  categoryFilter: string
  onCreateNew: () => void
}) {
  const isFiltered = searchQuery || categoryFilter !== "all"

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      variants={fadeSlideUpVariants}
      initial="initial"
      animate="animate"
    >
      <div className="relative">
        <div className="rounded-full bg-gradient-to-br from-primary/15 via-primary/10 to-secondary/5 p-6">
          <IconTemplate className="text-primary/60 size-10" />
        </div>
        <div className="absolute -right-1 -top-1 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 shadow-lg">
          <IconSparkles className="size-3 text-white" />
        </div>
      </div>
      <div className="max-w-[300px]">
        <h3 className="text-lg font-semibold">
          {isFiltered ? "No templates found" : "Start your template library"}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {isFiltered
            ? "Try adjusting your search or filter criteria"
            : "Templates help you create consistent, high-quality posts faster. Create your first one or browse AI suggestions below."}
        </p>
      </div>
      {!isFiltered && (
        <Button
          onClick={onCreateNew}
          className="gap-2"
        >
          <IconPlus className="size-4" />
          Create Template
        </Button>
      )}
    </motion.div>
  )
}

/**
 * A single AI template suggestion card
 * @param props - Component props
 * @param props.template - The AI template data
 * @param props.onUse - Callback when using this template
 * @param props.onSave - Callback when saving this template to library
 * @returns A compact template preview card
 */
function AITemplateCard({
  template,
  onUse,
  onSave,
}: {
  template: AITemplate
  onUse: (template: AITemplate) => void
  onSave: (template: AITemplate) => void
}) {
  return (
    <motion.div
      variants={staggerItemVariants}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className="group relative rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/30"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm">{template.name}</h4>
        <Badge variant="outline" className="text-xs shrink-0">
          {template.category}
        </Badge>
      </div>
      <p className="text-muted-foreground mb-3 text-xs leading-relaxed line-clamp-3">
        {template.content}
      </p>
      <div className="flex gap-1.5">
        <Button
          variant="default"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={() => onUse(template)}
        >
          Create Post
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSave(template)}
        >
          <IconPlus className="size-3" />
          Save
        </Button>
      </div>
    </motion.div>
  )
}

/**
 * AI Templates section with categorized suggestions
 * @param props - Component props
 * @param props.onUseAITemplate - Callback when using an AI template
 * @param props.onSaveAITemplate - Callback when saving an AI template to library
 * @returns A section of AI-generated template suggestions grouped by category
 */
function AITemplatesSection({
  onUseAITemplate,
  onSaveAITemplate,
}: {
  onUseAITemplate: (template: AITemplate) => void
  onSaveAITemplate: (template: AITemplate) => void
}) {
  const [activeCategory, setActiveCategory] = React.useState<string>("all")

  const filteredCategories = React.useMemo(() => {
    if (activeCategory === "all") return AI_TEMPLATE_CATEGORIES
    return AI_TEMPLATE_CATEGORIES.filter((c) => c.id === activeCategory)
  }, [activeCategory])

  return (
    <motion.div
      variants={fadeSlideUpVariants}
      initial="initial"
      animate="animate"
    >
      <Card hover className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-2">
              <IconSparkles className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">AI Templates</CardTitle>
              <CardDescription className="text-xs">
                Pre-made templates to jumpstart your content
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setActiveCategory("all")}
            >
              All
            </Button>
            {AI_TEMPLATE_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full gap-1.5"
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className={cn("rounded-md p-0.5", cat.color)}>
                  {cat.icon}
                </span>
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Template grid by category */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {filteredCategories.map((category) => (
                <div key={category.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("rounded-lg p-1.5", category.color)}>
                      {category.icon}
                    </span>
                    <h4 className="font-medium text-sm">{category.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {category.templates.length}
                    </Badge>
                  </div>
                  <motion.div
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    variants={staggerContainerVariants}
                    initial="initial"
                    animate="animate"
                  >
                    {category.templates.map((template) => (
                      <AITemplateCard
                        key={template.id}
                        template={template}
                        onUse={onUseAITemplate}
                        onSave={onSaveAITemplate}
                      />
                    ))}
                  </motion.div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * A CRUD interface for managing post templates with AI suggestions.
 *
 * Features:
 * - Grid/list view toggle for template display
 * - Category filter tabs and search bar
 * - Create new templates via centered dialog modal
 * - Template cards with preview, category, usage count
 * - AI-generated template suggestions by category
 * - Hover effects with full preview
 * - Loading skeletons and empty state
 * - Framer-motion animations throughout
 *
 * @param props - Component props
 * @param props.templates - Array of templates to display
 * @param props.onCreateTemplate - Callback when creating a new template
 * @param props.onEditTemplate - Callback when editing an existing template
 * @param props.onDeleteTemplate - Callback when deleting a template
 * @param props.onUseTemplate - Callback when using a template
 * @param props.isLoading - Loading state indicator
 * @returns Full template library UI with AI suggestions
 * @example
 * ```tsx
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
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
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
   * Opens the dialog for creating a new template
   */
  const handleCreateNew = () => {
    setEditingTemplate(null)
    setFormData(INITIAL_FORM_DATA)
    setIsDialogOpen(true)
  }

  /**
   * Opens the dialog for editing an existing template
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
    setIsDialogOpen(true)
  }

  /**
   * Handles form submission for create/edit
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
        trackTemplateAction("edited", editingTemplate.id)
        onEditTemplate?.(editingTemplate.id, templateData)
      } else {
        trackTemplateAction("created", "new")
        onCreateTemplate?.(templateData)
      }

      setIsDialogOpen(false)
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
    loadTemplate(template.id, template.content)
    onUseTemplate?.(template.id)
    templateToast.applied(template.name)
    router.push("/dashboard/compose")
  }

  /**
   * Handles using an AI template - loads content and navigates to compose
   */
  const handleUseAITemplate = (template: AITemplate) => {
    loadTemplate(template.id, template.content)
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
    <div className="flex flex-col gap-6">
      {/* My Templates Section */}
      <Card hover className="flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconTemplate className="size-5" />
                Template Library
              </CardTitle>
              <CardDescription>
                Manage and share your post templates
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
              <Button onClick={handleCreateNew} className="gap-1.5">
                <IconPlus className="size-4" />
                Create Template
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Search and Category Tabs */}
          <div className="flex flex-col gap-3">
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

            {/* Category filter tabs */}
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
              <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="all" className="text-xs">
                  All Categories
                </TabsTrigger>
                {TEMPLATE_CATEGORIES.map((category) => (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Loading State */}
          {isLoading && <TemplateGridSkeleton />}

          {/* Empty State */}
          {!isLoading && filteredTemplates.length === 0 && (
            <TemplateEmptyState
              searchQuery={searchQuery}
              categoryFilter={categoryFilter}
              onCreateNew={handleCreateNew}
            />
          )}

          {/* Template Grid/List */}
          {!isLoading && filteredTemplates.length > 0 && (
            <motion.div
              className={cn(
                viewMode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-3"
              )}
              variants={staggerContainerVariants}
              initial="initial"
              animate="animate"
            >
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  variants={staggerItemVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "group rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border dark:hover:border-primary/30",
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
                      variant="default"
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      className={cn(viewMode === "grid" && "flex-1")}
                    >
                      Create Post
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
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>

        <CardFooter className="text-muted-foreground border-t pt-4 text-sm">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}{" "}
          {searchQuery || categoryFilter !== "all" ? "found" : "total"}
        </CardFooter>
      </Card>

      {/* AI Templates Section */}
      <AITemplatesSection
        onUseAITemplate={handleUseAITemplate}
        onSaveAITemplate={handleSaveAITemplate}
      />

      {/* Create/Edit Dialog (Centered Popup Modal) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update your template details below"
                : "Fill in the details to create a new template"}
            </DialogDescription>
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
              onClick={() => setIsDialogOpen(false)}
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
              Create Post
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
    </div>
  )
}
