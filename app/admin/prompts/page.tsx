/**
 * Admin Prompts Page
 * @description Admin interface for managing system prompts with version control and analytics
 * @module app/admin/prompts/page
 */

"use client"

import * as React from "react"
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconX,
  IconHistory,
  IconChartBar,
  IconFilter,
  IconSearch,
} from "@tabler/icons-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useAdminPrompts } from "@/hooks/use-admin-prompts"
import { PromptVersionHistory } from "@/components/features/prompt-version-history"
import { PromptDiffViewer } from "@/components/features/prompt-diff-viewer"
import { PromptAnalytics } from "@/components/features/prompt-analytics"
import {
  PromptType,
  PROMPT_TYPE_VALUES,
  type SystemPrompt,
  type PromptVersion,
  type PromptVariable,
} from "@/lib/prompts/prompt-types"
import { cn } from "@/lib/utils"

/**
 * Prompt type category groupings for the filter tabs
 */
const PROMPT_TYPE_CATEGORIES = {
  all: { label: "All", filter: () => true },
  remix: {
    label: "Remix",
    filter: (type: PromptType) => type.startsWith("remix_"),
  },
  post: {
    label: "Post",
    filter: (type: PromptType) => type.startsWith("post_"),
  },
  carousel: {
    label: "Carousel",
    filter: (type: PromptType) => type.startsWith("carousel_"),
  },
  system: {
    label: "System",
    filter: (type: PromptType) => type === PromptType.BASE_RULES,
  },
} as const

type CategoryKey = keyof typeof PROMPT_TYPE_CATEGORIES

/**
 * Returns the display label for a prompt type
 * @param type - The prompt type
 * @returns Human-readable label
 */
function getPromptTypeLabel(type: PromptType): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Returns badge variant for a prompt type category
 * @param type - The prompt type
 * @returns Badge variant
 */
function getTypeBadgeVariant(
  type: PromptType
): "default" | "secondary" | "outline" | "destructive" {
  if (type.startsWith("remix_")) return "default"
  if (type.startsWith("post_")) return "secondary"
  if (type.startsWith("carousel_")) return "outline"
  return "destructive"
}

/**
 * Formats an ISO date string to a readable format
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * CreatePromptDialog Component
 * Dialog form for creating a new system prompt
 *
 * @param props - Component props
 * @param props.onCreate - Callback when a new prompt is created
 * @returns Dialog component with prompt creation form
 */
function CreatePromptDialog({
  onCreate,
}: {
  onCreate: (prompt: {
    type: PromptType
    name: string
    description?: string
    content: string
    variables?: PromptVariable[]
    setActive?: boolean
  }) => Promise<SystemPrompt | null>
}) {
  const [open, setOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<PromptType>(PromptType.REMIX_PROFESSIONAL)
  const [description, setDescription] = React.useState("")
  const [content, setContent] = React.useState("")
  const [setActive, setSetActive] = React.useState(false)

  /**
   * Handle form submission for creating a new prompt
   */
  const handleCreate = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    try {
      const result = await onCreate({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        content: content.trim(),
        setActive,
      })

      if (result) {
        setName("")
        setType(PromptType.REMIX_PROFESSIONAL)
        setDescription("")
        setContent("")
        setSetActive(false)
        setOpen(false)
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="size-4" />
          New Prompt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
          <DialogDescription>
            Add a new system prompt for AI content generation.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="prompt-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prompt-name"
              placeholder="e.g. Professional Remix Prompt"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prompt-type">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as PromptType)}
            >
              <SelectTrigger id="prompt-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_TYPE_VALUES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {getPromptTypeLabel(t as PromptType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prompt-description">Description</Label>
            <Input
              id="prompt-description"
              placeholder="Brief description of this prompt's purpose"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prompt-content">
              Prompt Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt-content"
              placeholder="Enter the system prompt text..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use {`{{variable_name}}`} for dynamic variables.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="set-active"
              checked={setActive}
              onChange={(e) => setSetActive(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="set-active" className="text-sm font-normal">
              Set as active prompt for this type
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * EditPromptDialog Component
 * Dialog for editing an existing prompt
 */
function EditPromptDialog({
  prompt,
  onUpdate,
  open,
  onOpenChange,
}: {
  prompt: SystemPrompt
  onUpdate: (
    id: string,
    updates: {
      name?: string
      description?: string
      content?: string
      changeNotes?: string
    }
  ) => Promise<SystemPrompt | null>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [name, setName] = React.useState(prompt.name)
  const [description, setDescription] = React.useState(prompt.description ?? "")
  const [content, setContent] = React.useState(prompt.content)
  const [changeNotes, setChangeNotes] = React.useState("")

  // Reset form when prompt changes
  React.useEffect(() => {
    setName(prompt.name)
    setDescription(prompt.description ?? "")
    setContent(prompt.content)
    setChangeNotes("")
  }, [prompt])

  const handleUpdate = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Name and content cannot be empty")
      return
    }

    setIsUpdating(true)
    try {
      const result = await onUpdate(prompt.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        changeNotes: changeNotes.trim() || undefined,
      })

      if (result) {
        onOpenChange(false)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
          <DialogDescription>
            Update the prompt content. Changes will be saved as a new version.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{getPromptTypeLabel(prompt.type)}</Badge>
            <span>|</span>
            <span>Current version: v{prompt.version}</span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this prompt's purpose"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-content">Prompt Content</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="resize-y font-mono text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="change-notes">
              Change Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="change-notes"
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="e.g. Fixed typo, improved tone instructions"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * PromptCard Component
 * Displays a single prompt with actions
 */
function PromptCard({
  prompt,
  onEdit,
  onDelete,
  onDuplicate,
  onSetActive,
  onViewHistory,
}: {
  prompt: SystemPrompt
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onSetActive: () => void
  onViewHistory: () => void
}) {
  const badgeVariant = getTypeBadgeVariant(prompt.type)

  return (
    <Card
      className={cn(
        "transition-all",
        prompt.isActive && "border-primary/30 bg-primary/5"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{prompt.name}</CardTitle>
            {prompt.description && (
              <CardDescription className="mt-1 line-clamp-1">
                {prompt.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {prompt.isActive && (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Active
              </Badge>
            )}
            {prompt.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
            <Badge variant={badgeVariant}>{getPromptTypeLabel(prompt.type)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
          <span>Updated {formatDate(prompt.updatedAt)}</span>
          <span>|</span>
          <button
            onClick={onViewHistory}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <IconHistory className="size-3.5" />
            v{prompt.version}
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3 font-mono bg-muted/30 p-2 rounded-md">
          {prompt.content}
        </p>
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <IconEdit className="size-4" />
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={onViewHistory}>
          <IconHistory className="size-4" />
          History
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          <IconCopy className="size-4" />
          Duplicate
        </Button>
        {!prompt.isActive && (
          <Button size="sm" variant="outline" onClick={onSetActive}>
            <IconSparkles className="size-4" />
            Set Active
          </Button>
        )}
        {!prompt.isDefault && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
              >
                <IconTrash className="size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{prompt.name}&quot;? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  )
}

/**
 * Loading skeleton for the page
 */
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * AdminPromptsPage Component
 *
 * Full CRUD interface for managing AI system prompts with version history and analytics.
 * Features include:
 * - Create, edit, duplicate, delete prompts
 * - Set active/default prompts per type
 * - Version history with rollback
 * - Usage analytics
 * - Search and filter
 *
 * @returns The admin prompt management page
 */
export default function AdminPromptsPage() {
  const {
    prompts,
    isLoading,
    error,
    createPrompt,
    updatePrompt,
    deletePrompt,
    duplicatePrompt,
    setActivePrompt,
    refetch,
  } = useAdminPrompts()

  // UI state
  const [filterCategory, setFilterCategory] = React.useState<CategoryKey>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedPrompt, setSelectedPrompt] = React.useState<SystemPrompt | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [historySheetOpen, setHistorySheetOpen] = React.useState(false)
  const [compareVersions, setCompareVersions] = React.useState<
    [PromptVersion, PromptVersion] | null
  >(null)
  const [activeTab, setActiveTab] = React.useState<"prompts" | "analytics">("prompts")

  /**
   * Filter prompts by category and search query
   */
  const filteredPrompts = React.useMemo(() => {
    let result = prompts

    // Filter by category
    if (filterCategory !== "all") {
      const categoryFilter = PROMPT_TYPE_CATEGORIES[filterCategory].filter
      result = result.filter((p) => categoryFilter(p.type))
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.content.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.type.toLowerCase().includes(query)
      )
    }

    // Sort: active first, then by updated date
    return result.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [prompts, filterCategory, searchQuery])

  /**
   * Handle opening the edit dialog for a prompt
   */
  const handleEdit = React.useCallback((prompt: SystemPrompt) => {
    setSelectedPrompt(prompt)
    setEditDialogOpen(true)
  }, [])

  /**
   * Handle viewing version history for a prompt
   */
  const handleViewHistory = React.useCallback((prompt: SystemPrompt) => {
    setSelectedPrompt(prompt)
    setHistorySheetOpen(true)
    setCompareVersions(null)
  }, [])

  /**
   * Handle comparing two versions
   */
  const handleCompareVersions = React.useCallback(
    (v1: PromptVersion, v2: PromptVersion) => {
      setCompareVersions([v1, v2])
    },
    []
  )

  /**
   * Handle delete action
   */
  const handleDelete = React.useCallback(
    async (prompt: SystemPrompt) => {
      const success = await deletePrompt(prompt.id)
      if (success) {
        toast.success("Prompt deleted")
      }
    },
    [deletePrompt]
  )

  /**
   * Handle duplicate action
   */
  const handleDuplicate = React.useCallback(
    async (prompt: SystemPrompt) => {
      const result = await duplicatePrompt(prompt.id)
      if (result) {
        toast.success("Prompt duplicated")
      }
    },
    [duplicatePrompt]
  )

  /**
   * Handle set active action
   */
  const handleSetActive = React.useCallback(
    async (prompt: SystemPrompt) => {
      const success = await setActivePrompt(prompt.id)
      if (success) {
        toast.success(`"${prompt.name}" is now active for ${getPromptTypeLabel(prompt.type)}`)
      }
    },
    [setActivePrompt]
  )

  // Show loading state
  if (isLoading) {
    return <PageSkeleton />
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={refetch}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prompt Management</h2>
          <p className="text-muted-foreground">
            Manage AI system prompts for post generation, carousels, and content
            remixing.
          </p>
        </div>
        <CreatePromptDialog onCreate={createPrompt} />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "prompts" | "analytics")}>
        <TabsList>
          <TabsTrigger value="prompts">
            <IconSparkles className="size-4" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <IconChartBar className="size-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredPrompts.length} prompts</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(PROMPT_TYPE_CATEGORIES) as CategoryKey[]).map((key) => {
              const category = PROMPT_TYPE_CATEGORIES[key]
              const count =
                key === "all"
                  ? prompts.length
                  : prompts.filter((p) => category.filter(p.type)).length

              return (
                <Button
                  key={key}
                  variant={filterCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterCategory(key)}
                >
                  {category.label}
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 min-w-5 px-1 text-xs"
                  >
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </div>

          {/* Prompt Cards Grid */}
          {filteredPrompts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={() => handleEdit(prompt)}
                  onDelete={() => handleDelete(prompt)}
                  onDuplicate={() => handleDuplicate(prompt)}
                  onSetActive={() => handleSetActive(prompt)}
                  onViewHistory={() => handleViewHistory(prompt)}
                />
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center py-12">
              <IconSparkles className="size-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No prompts found.</p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filters.
                </p>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <PromptAnalytics />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {selectedPrompt && (
        <EditPromptDialog
          prompt={selectedPrompt}
          onUpdate={updatePrompt}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Version History Sheet */}
      <Sheet open={historySheetOpen} onOpenChange={setHistorySheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
            <SheetDescription>
              {selectedPrompt?.name} - View and manage prompt versions
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {compareVersions ? (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCompareVersions(null)}
                >
                  Back to version list
                </Button>
                <PromptDiffViewer
                  version1={compareVersions[0]}
                  version2={compareVersions[1]}
                  onClose={() => setCompareVersions(null)}
                />
              </div>
            ) : selectedPrompt ? (
              <PromptVersionHistory
                promptId={selectedPrompt.id}
                currentVersion={selectedPrompt.version}
                onRollback={() => {
                  refetch()
                }}
                onCompare={handleCompareVersions}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
