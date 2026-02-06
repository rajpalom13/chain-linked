'use client'

/**
 * Wishlist Collection Sidebar
 * @description Sidebar component for selecting and managing wishlist collections
 * @module components/features/wishlist-collection-sidebar
 */

import { useState } from 'react'
import {
  IconFolder,
  IconFolderPlus,
  IconCheck,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconInbox,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { WishlistCollection } from '@/types/database'

/**
 * Props for WishlistCollectionSidebar
 */
interface WishlistCollectionSidebarProps {
  /** All collections */
  collections: WishlistCollection[]
  /** Currently selected collection ID */
  selectedId: string | null
  /** Total items count */
  totalItems: number
  /** Uncategorized items count */
  uncategorizedCount: number
  /** Loading state */
  isLoading?: boolean
  /** Callback when a collection is selected */
  onSelect: (id: string | null) => void
  /** Callback to create a new collection */
  onCreate: (options: { name: string; emojiIcon?: string; color?: string }) => Promise<unknown>
  /** Callback to update a collection */
  onUpdate: (id: string, options: { name?: string; emojiIcon?: string; color?: string }) => Promise<boolean>
  /** Callback to delete a collection */
  onDelete: (id: string) => Promise<boolean>
}

/**
 * Emoji options for collections
 */
const EMOJI_OPTIONS = ['📁', '⭐', '💡', '🔥', '💼', '🎯', '📝', '💎', '🚀', '💰', '📊', '🎨']

/**
 * Color options for collections
 */
const COLOR_OPTIONS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6b7280', // Gray
]

/**
 * Wishlist Collection Sidebar Component
 * Displays a list of collections with selection and management options
 */
export function WishlistCollectionSidebar({
  collections,
  selectedId,
  totalItems,
  uncategorizedCount,
  isLoading,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: WishlistCollectionSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingCollection, setEditingCollection] = useState<WishlistCollection | null>(null)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📁')
  const [newColor, setNewColor] = useState('#6366f1')
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Handle create collection
   */
  const handleCreate = async () => {
    if (!newName.trim()) return

    setIsSubmitting(true)
    await onCreate({ name: newName.trim(), emojiIcon: newEmoji, color: newColor })
    setIsSubmitting(false)
    setShowCreateDialog(false)
    setNewName('')
    setNewEmoji('📁')
    setNewColor('#6366f1')
  }

  /**
   * Handle edit collection
   */
  const handleEdit = async () => {
    if (!editingCollection || !newName.trim()) return

    setIsSubmitting(true)
    const success = await onUpdate(editingCollection.id, {
      name: newName.trim(),
      emojiIcon: newEmoji,
      color: newColor,
    })
    setIsSubmitting(false)

    if (success) {
      setShowEditDialog(false)
      setEditingCollection(null)
    }
  }

  /**
   * Handle delete collection
   */
  const handleDelete = async () => {
    if (!editingCollection) return

    setIsSubmitting(true)
    const success = await onDelete(editingCollection.id)
    setIsSubmitting(false)

    if (success) {
      setShowDeleteDialog(false)
      setEditingCollection(null)
    }
  }

  /**
   * Open edit dialog
   */
  const openEditDialog = (collection: WishlistCollection) => {
    setEditingCollection(collection)
    setNewName(collection.name)
    setNewEmoji(collection.emoji_icon)
    setNewColor(collection.color)
    setShowEditDialog(true)
  }

  /**
   * Open delete dialog
   */
  const openDeleteDialog = (collection: WishlistCollection) => {
    setEditingCollection(collection)
    setShowDeleteDialog(true)
  }

  if (isLoading) {
    return (
      <div className="w-56 border-r bg-muted/30 p-4">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-56 flex-shrink-0 border-r bg-muted/30">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Collections</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowCreateDialog(true)}
            >
              <IconFolderPlus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            {/* All Items */}
            <button
              onClick={() => onSelect(null)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                selectedId === null
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <IconFolder className="h-4 w-4" />
              <span className="flex-1 text-left truncate">All Items</span>
              <span className="text-xs opacity-70">{totalItems}</span>
            </button>

            {/* Uncategorized */}
            <button
              onClick={() => onSelect('uncategorized')}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                selectedId === 'uncategorized'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <IconInbox className="h-4 w-4" />
              <span className="flex-1 text-left truncate">Uncategorized</span>
              <span className="text-xs opacity-70">{uncategorizedCount}</span>
            </button>

            {/* Divider */}
            {collections.length > 0 && (
              <div className="my-2 border-t" />
            )}

            {/* Collections */}
            {collections.map((collection) => (
              <div
                key={collection.id}
                className={cn(
                  'group flex items-center gap-1 rounded-lg transition-colors',
                  selectedId === collection.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <button
                  onClick={() => onSelect(collection.id)}
                  className="flex flex-1 items-center gap-2 px-3 py-2 text-sm"
                >
                  <span>{collection.emoji_icon}</span>
                  <span className="flex-1 text-left truncate">{collection.name}</span>
                  <span className="text-xs opacity-70">{collection.item_count}</span>
                </button>

                {!collection.is_default && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
                          selectedId === collection.id && 'opacity-100'
                        )}
                      >
                        <IconDotsVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(collection)}>
                        <IconPencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDeleteDialog(collection)}
                      >
                        <IconTrash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Collection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Create a new collection to organize your saved posts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewEmoji(emoji)}
                    className={cn(
                      'h-9 w-9 rounded-lg border text-lg transition-all',
                      newEmoji === emoji
                        ? 'border-primary bg-primary/10 scale-110'
                        : 'hover:bg-muted'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all',
                      newColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {newColor === color && (
                      <IconCheck className="h-4 w-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Update collection details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewEmoji(emoji)}
                    className={cn(
                      'h-9 w-9 rounded-lg border text-lg transition-all',
                      newEmoji === emoji
                        ? 'border-primary bg-primary/10 scale-110'
                        : 'hover:bg-muted'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all',
                      newColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {newColor === color && (
                      <IconCheck className="h-4 w-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!newName.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Collection Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{editingCollection?.name}&quot;?
              Items in this collection will become uncategorized.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
