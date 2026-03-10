"use client"

/**
 * Post Series Composer
 * @description Two-column layout for creating a series of related LinkedIn posts.
 * Left: AI chat for series planning. Right: carousel of generated posts.
 * @module components/features/compose/post-series-composer
 */

import * as React from "react"
import { motion } from "framer-motion"
import { IconSparkles, IconPlus, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { fadeSlideUpVariants } from "@/lib/animations"
import { useConversationPersistence } from "@/hooks/use-conversation-persistence"
import { useApiKeys } from "@/hooks/use-api-keys"
import { ComposeSeriesMode } from "./compose-series-mode"
import { SeriesPostCarousel } from "./series-post-carousel"
import type { SeriesPost } from "@/types/compose"
import type { UIMessage } from "ai"

/**
 * Props for PostSeriesComposer
 */
interface PostSeriesComposerProps {
  /** User profile for LinkedIn preview */
  userProfile: {
    name: string
    headline: string
    avatarUrl?: string
  }
  /** Callback when user wants to schedule the series */
  onScheduleConfirm?: (posts: SeriesPost[]) => void
  /** Whether user has API key configured */
  hasApiKey?: boolean
}

/**
 * Post Series Composer — two-column layout for creating LinkedIn post series
 * @param props - Component props
 * @returns Series composer JSX element
 */
export function PostSeriesComposer({
  userProfile,
  onScheduleConfirm,
  hasApiKey: hasApiKeyProp,
}: PostSeriesComposerProps) {
  const [posts, setPosts] = React.useState<SeriesPost[]>([])
  const [currentPostIndex, setCurrentPostIndex] = React.useState(0)
  const { status: apiKeyStatus } = useApiKeys()
  const hasApiKey = hasApiKeyProp ?? (apiKeyStatus?.hasKey ?? false)

  // Conversation persistence for series mode
  const {
    persistedMessages,
    conversationId,
    saveMessages,
    clearConversation,
    isLoading: convoLoading,
  } = useConversationPersistence('series')

  /**
   * Handle series generation from AI
   */
  const handleSeriesGenerated = React.useCallback((generatedPosts: SeriesPost[]) => {
    setPosts(generatedPosts)
    setCurrentPostIndex(0)
  }, [])

  /**
   * Handle content change for a specific post
   */
  const handleContentChange = React.useCallback((index: number, newContent: string) => {
    setPosts((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], post: newContent }
      return updated
    })
  }, [])

  /**
   * Handle new chat
   */
  const handleNewChat = React.useCallback(async () => {
    await clearConversation()
    setPosts([])
    setCurrentPostIndex(0)
  }, [clearConversation])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left Column — Series Chat */}
      <motion.div
        variants={fadeSlideUpVariants}
        initial="initial"
        animate="animate"
      >
        <Card className="relative flex flex-col overflow-hidden border-destructive/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconSparkles className="size-4 text-destructive" />
                <CardTitle>Post Series</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="text-xs text-muted-foreground gap-1"
              >
                <IconPlus className="size-3" />
                New Chat
              </Button>
            </div>
            <CardDescription>
              Create a series of related posts around a central theme
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col">
            <ComposeSeriesMode
              onSeriesGenerated={handleSeriesGenerated}
              hasApiKey={hasApiKey}
              persistedMessages={persistedMessages.length > 0 ? persistedMessages as unknown as UIMessage[] : undefined}
              onMessagesChange={(msgs) => saveMessages(msgs as unknown as Array<{ id: string; role: string; parts: Array<{ type: string; text?: string; [key: string]: unknown }> }>)}
              onNewChat={handleNewChat}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Right Column — Series Post Carousel */}
      <motion.div
        variants={fadeSlideUpVariants}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              Series Preview
              {posts.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {posts.length} post{posts.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {posts.length === 0
                ? "Your post series will appear here"
                : `Viewing post ${currentPostIndex + 1} of ${posts.length}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            {posts.length > 0 ? (
              <SeriesPostCarousel
                posts={posts}
                currentIndex={currentPostIndex}
                onIndexChange={setCurrentPostIndex}
                onContentChange={handleContentChange}
                userProfile={userProfile}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted/60 p-4 mb-3">
                  <IconSparkles className="size-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Chat with AI to generate your post series
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your series of 2-5 related posts will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
