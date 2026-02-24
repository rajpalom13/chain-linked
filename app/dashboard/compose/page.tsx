"use client"

/**
 * Compose Page
 * @description Post composer interface for creating and editing LinkedIn content.
 * Supports auto-saving drafts to Supabase when navigating away or after AI generation.
 * @module app/dashboard/compose/page
 */

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { PageContent } from "@/components/shared/page-content"
import { ErrorBoundary } from "@/components/error-boundary"
import { PostComposer } from "@/components/features/post-composer"
import { type MediaFile } from "@/components/features/media-upload"
import { type GenerationContext } from "@/components/features/ai-inline-panel"
import { ComposeSkeleton } from "@/components/skeletons/page-skeletons"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { useDraft } from "@/lib/store/draft-context"
import { createClient } from "@/lib/supabase/client"
import { usePageMeta } from "@/lib/dashboard-context"

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
 * @returns Compose content with auto-save draft functionality
 */
function ComposeContent() {
  const { user, profile } = useAuthContext()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const { draft } = useDraft()

  // State for editing an existing scheduled post
  const [editingPost, setEditingPost] = React.useState<EditingPost | null>(null)

  // Parse schedule date from query params (from dashboard calendar click)
  const initialScheduleDate = React.useMemo(() => {
    const dateParam = searchParams.get('scheduleDate')
    if (!dateParam) return undefined
    const date = new Date(dateParam)
    return isNaN(date.getTime()) ? undefined : date
  }, [searchParams])

  // Track the latest generation context (topic, tone, context, etc.)
  const generationContextRef = React.useRef<GenerationContext | null>(null)

  // Track whether draft has already been saved to avoid double-saves
  const draftSavedRef = React.useRef(false)

  // Track user in a ref so cleanup effects always have the current value
  const userRef = React.useRef(user)
  userRef.current = user

  // Track the current content for auto-save (via ref to avoid stale closures)
  const contentRef = React.useRef(draft.content || "")

  /**
   * Update contentRef whenever draft content changes
   */
  React.useEffect(() => {
    contentRef.current = draft.content || ""
  }, [draft.content])

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
   * Handle generation context from the AI inline panel.
   * Stores the context so it can be included with auto-saved drafts.
   * @param ctx - The generation context data
   */
  const handleGenerationContext = React.useCallback((ctx: GenerationContext) => {
    generationContextRef.current = ctx
  }, [])

  /**
   * Auto-save draft on browser close/refresh (beforeunload)
   */
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      const currentContent = contentRef.current.trim()
      if (!currentContent || draftSavedRef.current || !user) return

      // Use sendBeacon for reliable save on page unload
      const ctx = generationContextRef.current
      const wordCount = currentContent.split(/\s+/).filter(Boolean).length

      const payload = JSON.stringify({
        content: currentContent,
        postType: ctx?.postType || 'general',
        topic: ctx?.topic || null,
        tone: ctx?.tone || null,
        context: ctx?.context || null,
        wordCount,
      })

      navigator.sendBeacon('/api/drafts/auto-save', payload)
      draftSavedRef.current = true
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user])

  /**
   * Auto-save draft on Next.js route change (component unmount).
   * This fires when the user navigates to a different dashboard page.
   * Uses userRef.current to avoid stale closure over user.
   */
  React.useEffect(() => {
    return () => {
      const currentContent = contentRef.current.trim()
      if (currentContent && !draftSavedRef.current && userRef.current) {
        // Fire-and-forget save on unmount
        const ctx = generationContextRef.current
        const wordCount = currentContent.split(/\s+/).filter(Boolean).length

        // Use sendBeacon as a reliable fallback for component unmount
        const payload = JSON.stringify({
          content: currentContent,
          postType: ctx?.postType || 'general',
          topic: ctx?.topic || null,
          tone: ctx?.tone || null,
          context: ctx?.context || null,
          wordCount,
        })

        navigator.sendBeacon('/api/drafts/auto-save', payload)
        draftSavedRef.current = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Reset draftSavedRef when content changes (new content = new potential draft)
   */
  React.useEffect(() => {
    if (draft.content) {
      draftSavedRef.current = false
    }
  }, [draft.content])

  /**
   * Periodic auto-save every 30 seconds as a safety net.
   * Uses fetch (more reliable than sendBeacon) since the page is still active.
   */
  React.useEffect(() => {
    /** Track the last content we successfully saved to avoid redundant saves */
    let lastSavedContent = ""

    const interval = setInterval(async () => {
      const currentContent = contentRef.current.trim()
      if (
        !currentContent ||
        draftSavedRef.current ||
        !user ||
        currentContent === lastSavedContent
      ) return

      const ctx = generationContextRef.current
      try {
        const res = await fetch("/api/drafts/auto-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: currentContent,
            postType: ctx?.postType || "general",
            topic: ctx?.topic || null,
            tone: ctx?.tone || null,
            context: ctx?.context || null,
            wordCount: currentContent.split(/\s+/).filter(Boolean).length,
          }),
        })
        if (res.ok) {
          lastSavedContent = currentContent
        }
      } catch {
        // Silently fail — will retry on next interval
      }
    }, 30_000)

    return () => clearInterval(interval)
  }, [user])

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
   * Convert a File to a base64 data URL string
   * @param file - File object to convert
   * @returns Base64-encoded string (without data URL prefix)
   */
  const fileToBase64 = React.useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  /**
   * Handle posting to LinkedIn
   * Calls the /api/linkedin/post endpoint
   * Returns the API response data (may include draft: true when posting is disabled)
   */
  const handlePost = React.useCallback(async (content: string, mediaFiles?: MediaFile[]) => {
    // Mark as saved to prevent auto-save on unmount after posting
    draftSavedRef.current = true

    // Build request body
    const body: Record<string, unknown> = {
      content,
      visibility: 'PUBLIC',
    }

    // If media files are provided, convert to base64 and include
    if (mediaFiles && mediaFiles.length > 0) {
      const imageFiles = mediaFiles.filter((f) => f.type === 'image')
      if (imageFiles.length > 0) {
        const mediaBase64 = await Promise.all(
          imageFiles.map(async (mf) => ({
            data: await fileToBase64(mf.file),
            contentType: mf.file.type || 'image/jpeg',
          }))
        )
        body.mediaBase64 = mediaBase64
      }
    }

    const response = await fetch('/api/linkedin/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      draftSavedRef.current = false
      throw new Error(data.error || data.message || 'Failed to post to LinkedIn')
    }

    // Return data so PostComposer can detect draft responses
    return data
  }, [fileToBase64])

  /**
   * Handle scheduling a post
   * Saves to scheduled_posts table (insert for new, update for edit)
   */
  const handleSchedule = React.useCallback(async (content: string, scheduledFor: Date, _timezone: string) => {
    if (!user) {
      throw new Error('Please log in to schedule posts')
    }

    // Mark as saved to prevent auto-save on unmount after scheduling
    draftSavedRef.current = true

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
        draftSavedRef.current = false
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
      draftSavedRef.current = false
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
          onGenerationContext={handleGenerationContext}
          initialScheduleDate={initialScheduleDate}
        />
      </ErrorBoundary>
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
