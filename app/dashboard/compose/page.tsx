"use client"

/**
 * Compose Page
 * @description Post composer interface for creating and editing LinkedIn content
 * @module app/dashboard/compose/page
 */

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { PageContent } from "@/components/shared/page-content"
import { ErrorBoundary } from "@/components/error-boundary"
import { PostComposer } from "@/components/features/post-composer"
import { ComposeSkeleton } from "@/components/skeletons/page-skeletons"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { usePageMeta } from "@/lib/dashboard-context"
import { CrossNav, type CrossNavItem } from "@/components/shared/cross-nav"
import { IconCalendar, IconTemplate, IconBulb } from "@tabler/icons-react"

/** Cross-navigation items for the compose page */
const COMPOSE_CROSS_NAV: CrossNavItem[] = [
  {
    href: "/dashboard/schedule",
    icon: IconCalendar,
    label: "View Schedule",
    description: "See your upcoming scheduled posts.",
    color: "blue-500",
  },
  {
    href: "/dashboard/templates",
    icon: IconTemplate,
    label: "Browse Templates",
    description: "Start from proven post templates.",
    color: "amber-500",
  },
  {
    href: "/dashboard/inspiration",
    icon: IconBulb,
    label: "Get Inspiration",
    description: "Browse viral posts for content ideas.",
    color: "emerald-500",
  },
]

/**
 * Data structure for editing a scheduled post
 */
interface EditingPost {
  id: string
  content: string
  scheduledFor: string
}

/**
 * Compose page content component
 */
function ComposeContent() {
  const { user, profile } = useAuthContext()
  const supabase = createClient()
  const searchParams = useSearchParams()

  // State for editing an existing scheduled post
  const [editingPost, setEditingPost] = React.useState<EditingPost | null>(null)

  // Check for edit mode on mount
  React.useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId) {
      // Try to get the post data from sessionStorage
      const storedData = sessionStorage.getItem('editScheduledPost')
      if (storedData) {
        try {
          const postData = JSON.parse(storedData) as EditingPost
          if (postData.id === editId) {
            setEditingPost(postData)
            // Clear sessionStorage after reading
            sessionStorage.removeItem('editScheduledPost')
          }
        } catch (e) {
          console.error('Failed to parse edit post data:', e)
        }
      }
    }
  }, [searchParams])

  /**
   * Extract user profile data for the post composer preview
   * Prioritizes LinkedIn profile data, falls back to profiles table, then user metadata
   */
  const userProfile = React.useMemo(() => {
    // Get LinkedIn profile data (from linkedin_profiles table)
    const linkedinProfile = profile?.linkedin_profile
    const rawData = linkedinProfile?.raw_data as Record<string, unknown> | null

    // Get name: LinkedIn raw_data > linkedin_profiles > profiles.full_name > user metadata > email
    const linkedInName = rawData?.name as string | undefined
    const linkedInProfileName = linkedinProfile?.first_name && linkedinProfile?.last_name
      ? `${linkedinProfile.first_name} ${linkedinProfile.last_name}`
      : linkedinProfile?.first_name || undefined
    const profilesFullName = profile?.full_name // From profiles table
    const metadataName = user?.user_metadata?.name || user?.user_metadata?.full_name
    const emailName = user?.email?.split('@')[0]
    const name = linkedInName || linkedInProfileName || profilesFullName || metadataName || emailName || 'Your Name'

    // Get headline from LinkedIn profile or profiles table
    const headline = linkedinProfile?.headline ||
      (rawData?.headline as string | undefined) ||
      profile?.linkedin_headline || // From profiles table
      'Your Professional Headline'

    // Get avatar: LinkedIn > profiles.linkedin_avatar_url > profiles.avatar_url > user metadata
    const linkedInAvatar = (rawData?.profilePhotoUrl as string | undefined) ||
      linkedinProfile?.profile_picture_url ||
      profile?.linkedin_avatar_url // From profiles table (saved during OAuth)
    const profilesAvatar = profile?.avatar_url // From profiles table
    const metadataAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
    const avatarUrl = linkedInAvatar || profilesAvatar || metadataAvatar || undefined

    return {
      name: name as string,
      headline: headline as string,
      avatarUrl: avatarUrl as string | undefined,
    }
  }, [user, profile])

  /**
   * Handle posting to LinkedIn
   * Calls the /api/linkedin/post endpoint
   * Returns the API response data (may include draft: true when posting is disabled)
   */
  const handlePost = React.useCallback(async (content: string) => {
    const response = await fetch('/api/linkedin/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        visibility: 'PUBLIC',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to post to LinkedIn')
    }

    // Return data so PostComposer can detect draft responses
    return data
  }, [])

  /**
   * Handle scheduling a post
   * Saves to scheduled_posts table (insert for new, update for edit)
   */
  const handleSchedule = React.useCallback(async (content: string, scheduledFor: Date, _timezone: string) => {
    if (!user) {
      throw new Error('Please log in to schedule posts')
    }

    // If editing an existing post, update it
    if (editingPost) {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          content,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
        })
        .eq('id', editingPost.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to update scheduled post:', error)
        throw new Error(error.message || 'Failed to update scheduled post')
      }

      // Clear editing state after successful update
      setEditingPost(null)
      toast.success('Post updated', {
        description: 'Your scheduled post has been updated.',
      })
      return
    }

    // Insert new post
    const { error } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: user.id,
        content,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
        visibility: 'PUBLIC',
      })

    if (error) {
      console.error('Failed to schedule post:', error)
      throw new Error(error.message || 'Failed to schedule post')
    }
  }, [user, supabase, editingPost])

  return (
    <PageContent>
      {/* Show edit mode indicator */}
      {editingPost && (
        <div className="rounded-lg border border-primary/50 bg-primary/5 p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Editing scheduled post</p>
            <p className="text-xs text-muted-foreground">
              Make your changes and reschedule when ready
            </p>
          </div>
          <button
            onClick={() => setEditingPost(null)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Cancel edit
          </button>
        </div>
      )}
      <ErrorBoundary>
        <PostComposer
          key={editingPost?.id || 'new'} // Force re-mount when editing different posts
          initialContent={editingPost?.content}
          userProfile={userProfile}
          onPost={handlePost}
          onScheduleConfirm={handleSchedule}
        />
      </ErrorBoundary>

      {/* Related Pages */}
      <CrossNav items={COMPOSE_CROSS_NAV} />
    </PageContent>
  )
}

/**
 * Compose page component
 * @returns Compose page with post composer for creating LinkedIn content
 */
export default function ComposePage() {
  usePageMeta({ title: "Compose" })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <ComposeSkeleton /> : <ComposeContent />
}
