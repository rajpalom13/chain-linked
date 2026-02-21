/**
 * LinkedIn Document Post Hook
 * @description React hook for posting documents (PDFs/carousels) to LinkedIn
 * and generating AI captions for carousel content
 * @module hooks/use-linkedin-document-post
 */

'use client'

import { useState, useCallback } from 'react'
import type { LinkedInVisibility } from '@/lib/linkedin/types'
import type { DocumentPostStage } from '@/lib/linkedin/types'

/**
 * Options for posting a document to LinkedIn
 */
interface PostDocumentOptions {
  /** Post caption text */
  content: string
  /** Post visibility */
  visibility?: LinkedInVisibility
  /** PDF as a Blob */
  pdfBlob: Blob
  /** Display title for the document */
  documentTitle?: string
}

/**
 * Response from posting a document
 */
interface PostDocumentResponse {
  success: boolean
  postId?: string
  linkedinPostUrn?: string
  message?: string
  error?: string
  draft?: boolean
}

/**
 * Options for generating an AI caption
 */
interface GenerateCaptionOptions {
  /** Combined text content from carousel slides */
  carouselContent: string
  /** Optional topic/theme */
  topic?: string
  /** Optional tone */
  tone?: string
}

/**
 * Return type for the LinkedIn document post hook
 */
interface UseLinkedInDocumentPostReturn {
  /** Post a document (PDF) to LinkedIn */
  postDocument: (options: PostDocumentOptions) => Promise<PostDocumentResponse>
  /** Generate an AI caption for carousel content */
  generateCaption: (options: GenerateCaptionOptions) => Promise<string>
  /** Current stage of the posting flow */
  stage: DocumentPostStage | null
  /** Whether a document post is in progress */
  isPosting: boolean
  /** Whether AI caption generation is in progress */
  isGeneratingCaption: boolean
  /** Current error message if any */
  error: string | null
}

/**
 * Convert a Blob to a base64 string
 * @param blob - Blob to convert
 * @returns Base64 encoded string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Hook for posting documents to LinkedIn and generating AI captions
 * @returns Document posting functions and state
 * @example
 * const { postDocument, generateCaption, stage, isPosting } = useLinkedInDocumentPost()
 *
 * // Generate caption
 * const caption = await generateCaption({ carouselContent: "..." })
 *
 * // Post document
 * const result = await postDocument({
 *   content: caption,
 *   pdfBlob: pdfFile,
 *   documentTitle: "My Carousel"
 * })
 */
export function useLinkedInDocumentPost(): UseLinkedInDocumentPostReturn {
  const [stage, setStage] = useState<DocumentPostStage | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Post a document (PDF) to LinkedIn
   */
  const postDocument = useCallback(async (
    options: PostDocumentOptions
  ): Promise<PostDocumentResponse> => {
    try {
      setIsPosting(true)
      setError(null)
      setStage('uploading-document')

      // Convert Blob to base64
      const pdfBase64 = await blobToBase64(options.pdfBlob)

      setStage('creating-post')

      const response = await fetch('/api/linkedin/post-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: options.content,
          visibility: options.visibility || 'PUBLIC',
          pdfBase64,
          documentTitle: options.documentTitle,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.message || data.error || 'Failed to post document to LinkedIn'
        setError(errorMessage)
        setStage('error')
        return {
          success: false,
          error: errorMessage,
        }
      }

      setStage('complete')
      return {
        success: true,
        postId: data.postId,
        linkedinPostUrn: data.linkedinPostUrn,
        message: data.message,
        draft: data.draft,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to post document to LinkedIn'
      setError(errorMessage)
      setStage('error')
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setIsPosting(false)
    }
  }, [])

  /**
   * Generate an AI caption for carousel content
   */
  const generateCaption = useCallback(async (
    options: GenerateCaptionOptions
  ): Promise<string> => {
    try {
      setIsGeneratingCaption(true)
      setError(null)

      const response = await fetch('/api/ai/carousel-caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carouselContent: options.carouselContent,
          topic: options.topic,
          tone: options.tone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate caption')
      }

      return data.content
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate caption'
      setError(errorMessage)
      return ''
    } finally {
      setIsGeneratingCaption(false)
    }
  }, [])

  return {
    postDocument,
    generateCaption,
    stage,
    isPosting,
    isGeneratingCaption,
    error,
  }
}
