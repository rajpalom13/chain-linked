"use client"

/**
 * Wishlist Page
 * @description Page for viewing and managing saved suggestions from the swipe feature
 * @module app/dashboard/swipe/wishlist/page
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  IconArrowLeft,
  IconBookmark,
  IconCalendar,
  IconCheck,
  IconFilter,
  IconLoader2,
} from "@tabler/icons-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SwipeWishlist } from "@/components/features/swipe-wishlist"
import { ScheduleModal } from "@/components/features/schedule-modal"
import { useSwipeWishlist, type ScheduleOptions } from "@/hooks/use-swipe-wishlist"
import { useDraft } from "@/lib/store/draft-context"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { swipeToast } from "@/lib/toast-utils"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  pageVariants,
  fadeSlideUpVariants,
} from "@/lib/animations"
import type { WishlistItem } from "@/types/database"

/**
 * Filter type for wishlist items
 */
type WishlistFilter = "all" | "saved" | "scheduled"

/**
 * Loading skeleton for the wishlist page
 */
function WishlistSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-10 w-[200px]" />
      </div>
      {/* Cards skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  )
}

/**
 * Main wishlist content component
 */
function WishlistContent() {
  const router = useRouter()
  const { loadForRemix } = useDraft()

  // Wishlist hook
  const {
    items,
    savedItems,
    scheduledItems,
    isLoading,
    removeFromWishlist,
    scheduleItem,
    totalItems,
    savedCount,
    scheduledCount,
  } = useSwipeWishlist()

  // Local state
  const [filter, setFilter] = React.useState<WishlistFilter>("all")
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false)
  const [selectedItem, setSelectedItem] = React.useState<WishlistItem | null>(null)
  const [isScheduling, setIsScheduling] = React.useState(false)

  /**
   * Get filtered items based on current filter
   */
  const filteredItems = React.useMemo(() => {
    switch (filter) {
      case "saved":
        return savedItems
      case "scheduled":
        return scheduledItems
      default:
        return items
    }
  }, [filter, items, savedItems, scheduledItems])

  /**
   * Handle schedule button click
   */
  const handleScheduleClick = React.useCallback((item: WishlistItem) => {
    setSelectedItem(item)
    setScheduleModalOpen(true)
  }, [])

  /**
   * Handle schedule confirmation
   */
  const handleScheduleConfirm = React.useCallback(async (scheduledFor: Date, timezone: string) => {
    if (!selectedItem) return

    setIsScheduling(true)
    try {
      const options: ScheduleOptions = {
        scheduledFor: scheduledFor.toISOString(),
        timezone,
        visibility: "PUBLIC",
      }

      const success = await scheduleItem(selectedItem.id, options)
      if (success) {
        setScheduleModalOpen(false)
        setSelectedItem(null)
      }
    } finally {
      setIsScheduling(false)
    }
  }, [selectedItem, scheduleItem])

  /**
   * Handle edit and post button click
   */
  const handleEditAndPost = React.useCallback((item: WishlistItem) => {
    // Load content into composer
    loadForRemix(item.id, item.content, "Wishlist Item")
    swipeToast.editAndPost()
    router.push("/dashboard/compose")
  }, [loadForRemix, router])

  /**
   * Handle remove button click
   */
  const handleRemove = React.useCallback(async (itemId: string) => {
    await removeFromWishlist(itemId)
  }, [removeFromWishlist])

  // Loading state
  if (isLoading) {
    return <WishlistSkeleton />
  }

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        variants={fadeSlideUpVariants}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="shrink-0"
          >
            <Link href="/dashboard/swipe">
              <IconArrowLeft className="size-5" />
              <span className="sr-only">Back to Swipe</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IconBookmark className="size-6 text-primary" />
              Wishlist
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalItems} saved suggestion{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as WishlistFilter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="all" className="gap-1.5">
              <IconFilter className="size-4" />
              All
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {totalItems}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5">
              <IconBookmark className="size-4" />
              Saved
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {savedCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-1.5">
              <IconCheck className="size-4" />
              Scheduled
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {scheduledCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Wishlist Items */}
      <motion.div variants={fadeSlideUpVariants}>
        <SwipeWishlist
          items={filteredItems}
          isLoading={false}
          onSchedule={handleScheduleClick}
          onEditAndPost={handleEditAndPost}
          onRemove={handleRemove}
        />
      </motion.div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false)
          setSelectedItem(null)
        }}
        onSchedule={handleScheduleConfirm}
        postPreview={selectedItem ? {
          content: selectedItem.content,
        } : undefined}
        isSubmitting={isScheduling}
      />
    </motion.div>
  )
}

/**
 * Wishlist page component
 * @returns Wishlist page with sidebar layout
 */
export default function WishlistPage() {
  const { isLoading: authLoading } = useAuthContext()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Wishlist" />
        <main id="main-content" className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col">
            {authLoading ? <WishlistSkeleton /> : <WishlistContent />}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
