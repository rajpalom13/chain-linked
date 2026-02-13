"use client"

/**
 * Schedule Page
 * @description View and manage scheduled LinkedIn posts with calendar and list views
 * @module app/dashboard/schedule/page
 */

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { IconPencil } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { PageContent } from "@/components/shared/page-content"
import { usePostingConfig } from "@/hooks/use-posting-config"
import { ScheduleCalendar } from "@/components/features/schedule-calendar"
import { ScheduledPosts, type ScheduledPost } from "@/components/features/scheduled-posts"
import { ScheduleSkeleton } from "@/components/skeletons/page-skeletons"
import { useScheduledPosts } from "@/hooks/use-scheduled-posts"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { CrossNav, type CrossNavItem } from "@/components/shared/cross-nav"
import { IconArticle, IconChartBar } from "@tabler/icons-react"

/** Cross-navigation items for the schedule page */
const SCHEDULE_CROSS_NAV: CrossNavItem[] = [
  {
    href: "/dashboard/posts",
    icon: IconArticle,
    label: "View All Posts",
    description: "See your published content and engagement data.",
    color: "emerald-500",
  },
  {
    href: "/dashboard/analytics",
    icon: IconChartBar,
    label: "View Analytics",
    description: "Track your growth and performance metrics.",
    color: "blue-500",
  },
]

/**
 * Schedule page content component with real data
 */
function ScheduleContent() {
  const router = useRouter()
  const { isPostingEnabled, disabledMessage } = usePostingConfig()
  const { posts: scheduledPosts, rawPosts, isLoading, deletePost, updatePost } = useScheduledPosts(60)

  // Transform scheduled posts for the list view - use real data only
  const listPosts: ScheduledPost[] = rawPosts.map((post) => ({
    id: post.id,
    content: post.content,
    scheduledFor: post.scheduled_for,
    status: mapListStatus(post.status),
    mediaUrls: post.media_urls as string[] | undefined,
  }))

  // Navigate to compose page for scheduling new posts
  const handleScheduleNew = useCallback(() => {
    router.push("/dashboard/compose")
  }, [router])

  // Handle edit - navigate to compose page with post ID
  const handleEdit = useCallback((postId: string) => {
    // For now, navigate to compose with the post content
    const post = rawPosts.find(p => p.id === postId)
    if (post) {
      // Store the post data in sessionStorage for the compose page to pick up
      sessionStorage.setItem('editScheduledPost', JSON.stringify({
        id: post.id,
        content: post.content,
        scheduledFor: post.scheduled_for,
      }))
      router.push("/dashboard/compose?edit=" + postId)
    }
  }, [rawPosts, router])

  // Handle delete
  const handleDelete = useCallback(async (postId: string) => {
    const success = await deletePost(postId)
    if (success) {
      toast.success("Post deleted", {
        description: "The scheduled post has been removed.",
      })
    } else {
      toast.error("Failed to delete post", {
        description: "Please try again.",
      })
    }
  }, [deletePost])

  // Handle post now - update status to trigger immediate posting
  const handlePostNow = useCallback(async (postId: string) => {
    // Block when posting is disabled
    if (!isPostingEnabled) {
      toast.warning("Posting disabled", {
        description: disabledMessage,
      })
      return
    }

    // Update the scheduled time to now and status to pending
    const success = await updatePost(postId, {
      scheduled_for: new Date().toISOString(),
      status: 'pending',
    })
    if (success) {
      toast.success("Post queued", {
        description: "Your post will be published shortly.",
      })
    } else {
      toast.error("Failed to queue post", {
        description: "Please try again.",
      })
    }
  }, [updatePost, isPostingEnabled, disabledMessage])

  return (
    <PageContent>
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Content Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Plan and schedule your LinkedIn posts for maximum reach.
        </p>
      </div>

      {/* Calendar View and List View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Calendar View */}
        <ScheduleCalendar
          posts={scheduledPosts}
          isLoading={isLoading}
        />

        {/* List View */}
        <ScheduledPosts
          posts={listPosts}
          isLoading={isLoading}
          onScheduleNew={handleScheduleNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPostNow={handlePostNow}
          isPostingEnabled={isPostingEnabled}
        />
      </div>

      {/* Related Pages */}
      <CrossNav items={SCHEDULE_CROSS_NAV} />
    </PageContent>
  )
}

/**
 * Map database status to list component status
 */
function mapListStatus(status: string): ScheduledPost["status"] {
  switch (status.toLowerCase()) {
    case "posting":
    case "processing":
      return "posting"
    case "failed":
    case "error":
      return "failed"
    default:
      return "pending"
  }
}

/**
 * Schedule page component
 * @returns Schedule page with calendar view and list of upcoming scheduled posts
 */
export default function SchedulePage() {
  usePageMeta({
    title: "Schedule",
    headerActions: (
      <Button asChild size="sm">
        <Link href="/dashboard/compose">
          <IconPencil className="size-4 mr-1" />
          New Post
        </Link>
      </Button>
    ),
  })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <ScheduleSkeleton /> : <ScheduleContent />
}
