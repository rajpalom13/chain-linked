'use client'

/**
 * Move to Collection Menu
 * @description Dropdown menu for moving wishlist items to collections
 * @module components/features/move-to-collection-menu
 */

import { IconFolderShare, IconCheck, IconInbox } from '@tabler/icons-react'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { WishlistCollection } from '@/types/database'

/**
 * Props for MoveToCollectionMenu
 */
interface MoveToCollectionMenuProps {
  /** Available collections */
  collections: WishlistCollection[]
  /** Current collection ID of the item (null if uncategorized) */
  currentCollectionId: string | null
  /** Callback when a collection is selected */
  onMove: (collectionId: string | null) => void
}

/**
 * Move to Collection Menu
 * A submenu that lists collections for moving items
 */
export function MoveToCollectionMenu({
  collections,
  currentCollectionId,
  onMove,
}: MoveToCollectionMenuProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <IconFolderShare className="mr-2 h-4 w-4" />
        Move to Collection
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-48">
        {/* Uncategorized option */}
        <DropdownMenuItem
          onClick={() => onMove(null)}
          className={cn(currentCollectionId === null && 'bg-muted')}
        >
          <IconInbox className="mr-2 h-4 w-4" />
          <span className="flex-1">Uncategorized</span>
          {currentCollectionId === null && (
            <IconCheck className="h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>

        {collections.length > 0 && <DropdownMenuSeparator />}

        {/* Collections */}
        {collections.map((collection) => (
          <DropdownMenuItem
            key={collection.id}
            onClick={() => onMove(collection.id)}
            className={cn(currentCollectionId === collection.id && 'bg-muted')}
          >
            <span className="mr-2">{collection.emoji_icon}</span>
            <span className="flex-1 truncate">{collection.name}</span>
            {currentCollectionId === collection.id && (
              <IconCheck className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        {collections.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No collections yet.
            <br />
            Create one from the sidebar.
          </div>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
