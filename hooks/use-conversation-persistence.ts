/**
 * Conversation Persistence Hook
 * @description Manages loading and saving AI chat conversations to Supabase.
 * Provides debounced auto-save, active conversation tracking, and new chat creation.
 * @module hooks/use-conversation-persistence
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthContext } from '@/lib/auth/auth-provider'

interface PersistedMessage {
  id: string
  role: string
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>
}

interface ConversationPersistenceReturn {
  /** Messages loaded from the database */
  persistedMessages: PersistedMessage[]
  /** Current conversation ID */
  conversationId: string | null
  /** Save messages to database (debounced) */
  saveMessages: (messages: PersistedMessage[]) => void
  /** Clear current conversation and start fresh */
  clearConversation: () => Promise<void>
  /** Whether the initial load is in progress */
  isLoading: boolean
}

/**
 * Hook for persisting AI chat conversations to Supabase
 * @param mode - The conversation mode ('advanced' or 'series')
 * @returns Conversation persistence state and actions
 */
export function useConversationPersistence(
  mode: 'advanced' | 'series'
): ConversationPersistenceReturn {
  const { user } = useAuthContext()
  const supabase = createClient()

  const [persistedMessages, setPersistedMessages] = useState<PersistedMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const conversationIdRef = useRef<string | null>(null)

  // Keep ref in sync
  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  // Load active conversation on mount
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const loadConversation = async () => {
      try {
        const { data } = await supabase
          .from('compose_conversations')
          .select('id, messages, tone')
          .eq('user_id', user.id)
          .eq('mode', mode)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (data) {
          setConversationId(data.id)
          conversationIdRef.current = data.id
          const msgs = (data.messages as unknown as PersistedMessage[]) || []
          setPersistedMessages(msgs)
        }
      } catch {
        // No active conversation found — that's fine
      } finally {
        setIsLoading(false)
      }
    }

    loadConversation()
  }, [user, mode, supabase])

  /**
   * Save messages to database with 2-second debounce
   */
  const saveMessages = useCallback(
    (messages: PersistedMessage[]) => {
      if (!user) return

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const currentId = conversationIdRef.current

          // Auto-generate title from first user message
          const firstUserMsg = messages.find((m) => m.role === 'user')
          const title = firstUserMsg?.parts
            ?.filter((p) => p.type === 'text' && p.text)
            .map((p) => p.text)
            .join('')
            .slice(0, 50) || 'Untitled'

          if (currentId) {
            // Update existing conversation
            await supabase
              .from('compose_conversations')
              .update({
                messages: JSON.parse(JSON.stringify(messages)),
                title,
                updated_at: new Date().toISOString(),
              })
              .eq('id', currentId)
          } else {
            // Create new conversation
            const { data } = await supabase
              .from('compose_conversations')
              .insert({
                user_id: user.id,
                mode,
                title,
                messages: JSON.parse(JSON.stringify(messages)),
                is_active: true,
              })
              .select('id')
              .single()

            if (data) {
              setConversationId(data.id)
              conversationIdRef.current = data.id
            }
          }
        } catch (err) {
          console.error('Failed to save conversation:', err)
        }
      }, 2000)
    },
    [user, mode, supabase]
  )

  /**
   * Clear the current conversation (mark inactive) and reset state
   */
  const clearConversation = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    const currentId = conversationIdRef.current
    if (currentId && user) {
      try {
        await supabase
          .from('compose_conversations')
          .update({ is_active: false })
          .eq('id', currentId)
      } catch (err) {
        console.error('Failed to deactivate conversation:', err)
      }
    }

    setConversationId(null)
    conversationIdRef.current = null
    setPersistedMessages([])
  }, [user, supabase])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    persistedMessages,
    conversationId,
    saveMessages,
    clearConversation,
    isLoading,
  }
}
