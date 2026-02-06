'use client'

/**
 * Save to Collection Dialog
 * @description Compact dialog for choosing which collection to save a wishlist item to during swipe
 * @module components/features/save-to-collection-dialog
 */

import * as React from 'react'
import { IconInbox, IconCheck, IconLoader2, IconPlus } from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { WishlistCollection } from '@/types/database'

/**
 * Props for SaveToCollectionDialog
 */
interface SaveToCollectionDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the dialog should close */
  onOpenChange: (open: boolean) => void
  /** Available collections */
  collections: WishlistCollection[]
  /** Whether collections are loading */
  isLoading?: boolean
  /** Callback when a collection is selected (null = default/uncategorized) */
  onSelect: (collectionId: string | null) => void
  /** Callback to create a new collection inline */
  onCreateCollection?: (name: string) => Promise<WishlistCollection | null>
}

/**
 * Compact dialog for choosing which collection to save to during swipe
 * @param props - Component props
 * @returns Dialog with collection picker
 */
export function SaveToCollectionDialog({
  open,
  onOpenChange,
  collections,
  isLoading,
  onSelect,
  onCreateCollection,
}: SaveToCollectionDialogProps) {
  const [isCreating, setIsCreating] = React.useState(false)
  const [newName, setNewName] = React.useState('')

  const handleCreate = async () => {
    if (!newName.trim() || !onCreateCollection) return
    setIsCreating(true)
    const created = await onCreateCollection(newName.trim())
    setIsCreating(false)
    if (created) {
      setNewName('')
      onSelect(created.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save to Collection</DialogTitle>
          <DialogDescription>
            Choose a collection for this post
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Default / Uncategorized option */}
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted transition-colors text-left"
              onClick={() => onSelect(null)}
            >
              <IconInbox className="size-4 text-muted-foreground shrink-0" />
              <span className="flex-1">Default Collection</span>
            </button>

            {/* Collection list */}
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-muted transition-colors text-left"
                onClick={() => onSelect(collection.id)}
              >
                <span className="text-base shrink-0">{collection.emoji_icon || '📁'}</span>
                <span className="flex-1 truncate">{collection.name}</span>
              </button>
            ))}

            {collections.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No collections yet
              </p>
            )}
          </div>
        )}

        {/* Quick create */}
        {onCreateCollection && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              placeholder="New collection name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-sm h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreate}
              disabled={!newName.trim() || isCreating}
              className="shrink-0 h-9"
            >
              {isCreating ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconPlus className="size-4" />
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
