"use client"

/**
 * Schedule Page
 * @description View and manage scheduled LinkedIn posts with calendar and list views
 * @module app/dashboard/schedule/page
 */

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AppSidebar } from "@/components/app-sidebar"
import { ScheduleCalendar } from "@/components/features/schedule-calendar"
import { ScheduledPosts, type ScheduledPost } from "@/components/features/scheduled-posts"
import { SiteHeader } from "@/components/site-header"
import { ScheduleSkeleton } from "@/components/skeletons/page-skeletons"
import { useScheduledPosts } from "@/hooks/use-scheduled-posts"
import { useAuthContext } from "@/lib/auth/auth-provider"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

/**
 * Schedule page content component with real data
 */
function ScheduleContent() {
  const router = useRouter()
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
  }, [updatePost])

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-500">
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
        />
      </div>
    </div>
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
        <SiteHeader title="Schedule" />
        <main id="main-content" className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {authLoading ? <ScheduleSkeleton /> : <ScheduleContent />}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
