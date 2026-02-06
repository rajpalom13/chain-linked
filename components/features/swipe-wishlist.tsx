"use client"

/**
 * Swipe Wishlist Component
 * @description List component for displaying and managing wishlist items from the swipe feature
 * @module components/features/swipe-wishlist
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, formatDistanceToNow } from "date-fns"
import {
  IconCalendar,
  IconPencil,
  IconTrash,
  IconBookmark,
  IconClock,
  IconSparkles,
  IconDotsVertical,
  IconCheck,
  IconTag,
  IconNotes,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverProps,
} from "@/lib/animations"
import { MoveToCollectionMenu } from "./move-to-collection-menu"
import type { WishlistItem, WishlistCollection } from "@/types/database"

/**
 * Props for the SwipeWishlist component
 */
export interface SwipeWishlistProps {
  /** Array of wishlist items to display */
  items: WishlistItem[]
  /** Whether items are currently loading */
  isLoading?: boolean
  /** Callback when Schedule button is clicked */
  onSchedule?: (item: WishlistItem) => void
  /** Callback when Edit & Post button is clicked */
  onEditAndPost?: (item: WishlistItem) => void
  /** Callback when Remove button is clicked */
  onRemove?: (itemId: string) => void
  /** Available collections for move-to-collection menu */
  collections?: WishlistCollection[]
  /** Callback when Move to Collection is clicked */
  onMoveToCollection?: (itemId: string, collectionId: string | null) => void
  /** Optional CSS class name */
  className?: string
}

/**
 * Props for a single wishlist item card
 */
interface WishlistItemCardProps {
  /** The wishlist item data */
  item: WishlistItem
  /** Callback when Schedule button is clicked */
  onSchedule?: () => void
  /** Callback when Edit & Post button is clicked */
  onEditAndPost?: () => void
  /** Callback when Remove button is clicked */
  onRemove?: () => void
  /** Available collections for move menu */
  collections?: WishlistCollection[]
  /** Callback when Move to Collection is clicked */
  onMoveToCollection?: (collectionId: string | null) => void
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum character length
 * @returns Truncated text
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + "..."
}

/**
 * Get category badge styling based on category
 */
function getCategoryStyle(category: string | null): string {
  if (!category) return "bg-secondary text-secondary-foreground"

  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '-')

  switch (normalizedCategory) {
    case 'leadership':
    case 'thought-leadership':
      return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
    case 'tech-tips':
    case 'tech-trends':
    case 'industry-news':
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    case 'career-growth':
    case 'career-advice':
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    case 'productivity':
    case 'how-to':
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
    case 'personal-stories':
      return "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300"
    case 'engagement-hooks':
      return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
    default:
      return "bg-secondary text-secondary-foreground"
  }
}

/**
 * Single wishlist item card component
 */
function WishlistItemCard({
  item,
  onSchedule,
  onEditAndPost,
  onRemove,
  collections,
  onMoveToCollection,
}: WishlistItemCardProps) {
  const isScheduled = item.status === "scheduled"
  const createdAt = new Date(item.created_at)

  return (
    <motion.div
      variants={staggerItemVariants}
      layout
      {...cardHoverProps}
    >
      <Card className={cn(
        "overflow-hidden border-border/50 transition-colors",
        "hover:border-primary/30 hover:shadow-md",
        isScheduled && "border-green-500/30 bg-green-500/5"
      )}>
        <CardContent className="p-4">
          {/* Header: Category and Status */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {item.category && (
                <Badge
                  variant="secondary"
                  className={cn("shrink-0 text-xs", getCategoryStyle(item.category))}
                >
                  <IconTag className="size-3 mr-1" />
                  {item.category}
                </Badge>
              )}
              {item.post_type && (
                <Badge variant="outline" className="text-xs">
                  {item.post_type}
                </Badge>
              )}
              {isScheduled && (
                <Badge variant="default" className="bg-green-500 text-xs">
                  <IconCheck className="size-3 mr-1" />
                  Scheduled
                </Badge>
              )}
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="shrink-0">
                  <IconDotsVertical className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isScheduled && (
                  <DropdownMenuItem onClick={onSchedule}>
                    <IconCalendar className="size-4 mr-2" />
                    Schedule
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onEditAndPost}>
                  <IconPencil className="size-4 mr-2" />
                  Edit & Post
                </DropdownMenuItem>
                {collections && onMoveToCollection && (
                  <>
                    <DropdownMenuSeparator />
                    <MoveToCollectionMenu
                      collections={collections}
                      currentCollectionId={item.collection_id || null}
                      onMove={onMoveToCollection}
                    />
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onRemove}
                  className="text-destructive focus:text-destructive"
                >
                  <IconTrash className="size-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content Preview */}
          <p className="text-sm text-foreground/90 whitespace-pre-line line-clamp-4 mb-3">
            {truncateText(item.content, 280)}
          </p>

          {/* Notes (if any) */}
          {item.notes && (
            <div className="flex items-start gap-2 mb-3 p-2 rounded-md bg-muted/50">
              <IconNotes className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.notes}
              </p>
            </div>
          )}

          {/* Footer: Date and Quick Actions */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconClock className="size-3" />
                    {formatDistanceToNow(createdAt, { addSuffix: true })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Added {format(createdAt, "MMM d, yyyy 'at' h:mm a")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center gap-1">
              {!isScheduled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSchedule}
                  className="h-7 px-2 text-xs"
                >
                  <IconCalendar className="size-3.5 mr-1" />
                  Schedule
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={onEditAndPost}
                className="h-7 px-2 text-xs"
              >
                <IconPencil className="size-3.5 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * Loading skeleton for wishlist items
 */
function WishlistItemSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-4/5 mb-2" />
        <Skeleton className="h-4 w-3/5 mb-3" />
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state when no wishlist items exist
 */
function WishlistEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
        className="rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 p-4 mb-4"
      >
        <IconBookmark className="size-8 text-muted-foreground/70" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold mb-2"
      >
        Your wishlist is empty
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground max-w-[300px]"
      >
        Swipe right on suggestions you like to save them here for later scheduling or editing.
      </motion.p>
    </motion.div>
  )
}

/**
 * SwipeWishlist displays a list of saved wishlist items from the swipe interface.
 *
 * Features:
 * - Card-based display with content preview
 * - Category and post type badges
 * - Schedule, Edit & Post, and Remove actions
 * - Notes display
 * - Loading skeleton states
 * - Empty state with helpful message
 * - Framer Motion animations
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SwipeWishlist
 *   items={wishlistItems}
 *   onSchedule={(item) => openScheduleModal(item)}
 *   onEditAndPost={(item) => navigateToComposer(item)}
 *   onRemove={(itemId) => removeFromWishlist(itemId)}
 * />
 *
 * // Loading state
 * <SwipeWishlist items={[]} isLoading={true} />
 * ```
 */
export function SwipeWishlist({
  items,
  isLoading = false,
  onSchedule,
  onEditAndPost,
  onRemove,
  collections,
  onMoveToCollection,
  className,
}: SwipeWishlistProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <WishlistItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return <WishlistEmptyState />
  }

  // Main list
  return (
    <motion.div
      className={cn("space-y-4", className)}
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <WishlistItemCard
            key={item.id}
            item={item}
            onSchedule={() => onSchedule?.(item)}
            onEditAndPost={() => onEditAndPost?.(item)}
            onRemove={() => onRemove?.(item.id)}
            collections={collections}
            onMoveToCollection={
              onMoveToCollection
                ? (collectionId) => onMoveToCollection(item.id, collectionId)
                : undefined
            }
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
