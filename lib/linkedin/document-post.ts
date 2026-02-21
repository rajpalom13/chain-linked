/**
 * LinkedIn Document Post Module
 * @description Functions for uploading documents (PDFs) and creating document posts on LinkedIn
 * Uses the versioned REST API (/rest/documents and /rest/posts)
 * @module lib/linkedin/document-post
 */

import {
  LINKEDIN_REST_API,
  type LinkedInInitializeDocumentUploadRequest,
  type LinkedInInitializeDocumentUploadResponse,
  type LinkedInRestPostRequest,
  type LinkedInRestPostResponse,
  type LinkedInVisibility,
  type CreateDocumentPostRequest,
  type CreatePostResponse,
} from './types'
import { LinkedInApiClient } from './api-client'
import { validatePostContent } from './post'

/**
 * Maximum document size for LinkedIn uploads (100MB per docs)
 */
export const MAX_DOCUMENT_SIZE_BYTES = 100 * 1024 * 1024

/**
 * Initialize a document upload with LinkedIn
 * @param client - LinkedIn API client
 * @param linkedInUrn - Owner's LinkedIn URN (e.g., "urn:li:person:ABC123")
 * @returns Upload URL and document URN
 */
export async function initializeDocumentUpload(
  client: LinkedInApiClient,
  linkedInUrn: string
): Promise<LinkedInInitializeDocumentUploadResponse> {
  const request: LinkedInInitializeDocumentUploadRequest = {
    initializeUploadRequest: {
      owner: linkedInUrn,
    },
  }

  const response = await client.post<LinkedInInitializeDocumentUploadResponse>(
    `${LINKEDIN_REST_API.DOCUMENTS}?action=initializeUpload`,
    request
  )

  return response
}

/**
 * Upload document binary data to LinkedIn's upload URL
 * Per LinkedIn docs, the upload URL only requires the Authorization header.
 * Do NOT send Content-Type, LinkedIn-Version, or other API headers to the
 * dms-uploads endpoint — it's a different service from the REST API.
 * @param accessToken - Valid LinkedIn access token
 * @param uploadUrl - URL from initializeUpload response
 * @param pdfBuffer - PDF binary data
 * @returns True if upload succeeded
 */
export async function uploadDocumentBinary(
  accessToken: string,
  uploadUrl: string,
  pdfBuffer: Buffer
): Promise<boolean> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: new Uint8Array(pdfBuffer),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown')
    console.error(`Document upload failed: ${response.status} ${response.statusText}`, errorText)
  }

  return response.ok
}

/**
 * Create a post with a document attachment via the LinkedIn REST API
 * @param client - LinkedIn API client
 * @param content - Post caption text
 * @param documentUrn - URN of the uploaded document
 * @param title - Display title for the document
 * @param visibility - Post visibility (PUBLIC or CONNECTIONS)
 * @returns Post creation response
 */
export async function createRestPost(
  client: LinkedInApiClient,
  content: string,
  documentUrn: string,
  title: string = 'Carousel',
  visibility: LinkedInVisibility = 'PUBLIC'
): Promise<LinkedInRestPostResponse> {
  const linkedInUrn = client.getLinkedInUrn()

  const request: LinkedInRestPostRequest = {
    author: linkedInUrn,
    commentary: content,
    visibility,
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        title,
        id: documentUrn,
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  const response = await client.post<LinkedInRestPostResponse>(
    LINKEDIN_REST_API.POSTS,
    request
  )

  return response
}

/**
 * Post a document (PDF) to LinkedIn
 * Orchestrates the full flow: validate -> initialize upload -> upload binary -> create post
 * @param client - LinkedIn API client
 * @param request - Document post request with content, PDF buffer, and options
 * @returns Standardized post response
 * @example
 * const response = await postDocument(client, {
 *   content: "Check out my carousel!",
 *   pdfBuffer: pdfData,
 *   documentTitle: "My Carousel",
 *   visibility: "PUBLIC"
 * })
 */
export async function postDocument(
  client: LinkedInApiClient,
  request: CreateDocumentPostRequest
): Promise<CreatePostResponse> {
  try {
    const {
      content,
      visibility = 'PUBLIC',
      pdfBuffer,
      documentTitle = 'Carousel',
    } = request

    // Validate post content
    validatePostContent(content)

    // Validate document size
    if (pdfBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
      throw new Error(
        `Document size (${(pdfBuffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum of 100MB`
      )
    }

    const linkedInUrn = client.getLinkedInUrn()

    // Step 1: Initialize the document upload
    console.log('[DocumentPost] Step 1: Initializing document upload...')
    const uploadInit = await initializeDocumentUpload(client, linkedInUrn)
    const { uploadUrl, document: documentUrn } = uploadInit.value
    console.log('[DocumentPost] Step 1 complete. Document URN:', documentUrn)

    // Step 2: Upload the PDF binary
    // Use the client's access token (guaranteed valid after step 1's ensureValidToken call)
    console.log('[DocumentPost] Step 2: Uploading document binary...')
    const accessToken = client.getAccessToken()
    const uploadSuccess = await uploadDocumentBinary(
      accessToken,
      uploadUrl,
      pdfBuffer
    )

    if (!uploadSuccess) {
      throw new Error('Failed to upload document to LinkedIn. The upload server rejected the file.')
    }
    console.log('[DocumentPost] Step 2 complete. Upload successful.')

    // Step 3: Create the post with the document attachment
    console.log('[DocumentPost] Step 3: Creating post with document attachment...')
    const postResponse = await createRestPost(
      client,
      content,
      documentUrn,
      documentTitle,
      visibility
    )
    console.log('[DocumentPost] Step 3 complete. Post response:', postResponse)

    return {
      success: true,
      postId: postResponse.id ?? undefined,
      linkedinPostUrn: postResponse.id ?? undefined,
    }
  } catch (error) {
    console.error('[DocumentPost] Error:', error)

    // Extract detailed error info from LinkedIn API errors
    let errorMessage: string
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      const apiError = error as { status: number; message: string; serviceErrorCode?: number }
      errorMessage = `LinkedIn API error (${apiError.status}): ${apiError.message}`
      if (apiError.serviceErrorCode) {
        errorMessage += ` (code: ${apiError.serviceErrorCode})`
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    } else {
      errorMessage = 'Failed to create LinkedIn document post'
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}
