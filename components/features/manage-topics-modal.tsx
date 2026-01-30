/**
 * Manage Topics Modal Component
 * @description Modal for managing user's followed topics in the Discover page
 * @module components/features/manage-topics-modal
 */

"use client"

import * as React from "react"
import {
  IconPlus,
  IconX,
  IconGripVertical,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Topic } from "@/hooks/use-discover"

/**
 * Props for ManageTopicsModal
 */
interface ManageTopicsModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Current list of topics */
  topics: Topic[]
  /** Callback to add a new topic */
  onAddTopic: (name: string) => void
  /** Callback to remove a topic */
  onRemoveTopic: (topicId: string) => void
  /** Callback to update topics (for reordering) */
  onUpdateTopics: (topics: Topic[]) => void
}

/**
 * Suggested topics for quick adding
 */
const SUGGESTED_TOPICS = [
  "Marketing Automation",
  "Product Management",
  "Startup Funding",
  "Customer Success",
  "Data Analytics",
  "Digital Transformation",
  "Content Strategy",
  "Growth Hacking",
]

/**
 * Modal for managing topics users follow in the Discover page
 *
 * @param props - Component props
 * @returns Rendered modal component
 *
 * @example
 * ```tsx
 * <ManageTopicsModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   topics={topics}
 *   onAddTopic={addTopic}
 *   onRemoveTopic={removeTopic}
 *   onUpdateTopics={updateTopics}
 * />
 * ```
 */
export function ManageTopicsModal({
  isOpen,
  onClose,
  topics,
  onAddTopic,
  onRemoveTopic,
}: ManageTopicsModalProps) {
  const [newTopic, setNewTopic] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  /**
   * Reset input when modal opens
   */
  React.useEffect(() => {
    if (isOpen) {
      setNewTopic("")
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  /**
   * Handle adding a new topic
   */
  const handleAddTopic = () => {
    const trimmed = newTopic.trim()
    if (trimmed) {
      onAddTopic(trimmed)
      setNewTopic("")
      inputRef.current?.focus()
    }
  }

  /**
   * Handle key press in input
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTopic()
    }
  }

  /**
   * Handle adding a suggested topic
   */
  const handleAddSuggested = (name: string) => {
    onAddTopic(name)
  }

  /**
   * Check if a topic is already added
   */
  const isTopicAdded = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    return topics.some((t) => t.slug === slug)
  }

  /**
   * Filter suggestions to only show ones not already added
   */
  const availableSuggestions = SUGGESTED_TOPICS.filter((name) => !isTopicAdded(name))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Topics</DialogTitle>
          <DialogDescription>
            Add or remove topics to customize your industry content feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add New Topic */}
          <div className="space-y-2">
            <Label htmlFor="new-topic">Add a Topic</Label>
            <div className="flex gap-2">
              <Input
                id="new-topic"
                ref={inputRef}
                placeholder="e.g., Content Marketing"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                onClick={handleAddTopic}
                disabled={!newTopic.trim()}
                size="icon"
              >
                <IconPlus className="size-4" />
              </Button>
            </div>
          </div>

          {/* Suggested Topics */}
          {availableSuggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Suggested Topics
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.slice(0, 5).map((name) => (
                  <Button
                    key={name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSuggested(name)}
                    className="h-7 text-xs"
                  >
                    <IconPlus className="size-3 mr-1" />
                    {name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Current Topics List */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Your Topics ({topics.length})
            </Label>
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="p-2 space-y-1">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconGripVertical className="size-4 text-muted-foreground/50 shrink-0 cursor-grab" />
                      <span className="text-sm truncate">{topic.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => onRemoveTopic(topic.id)}
                      disabled={topics.length <= 1}
                      title={topics.length <= 1 ? "You must have at least one topic" : "Remove topic"}
                    >
                      <IconX className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {topics.length <= 1 && (
              <p className="text-xs text-muted-foreground">
                You must have at least one topic.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
