/**
 * LinkedIn API Client
 * @description HTTP client for LinkedIn API with automatic retry and token refresh
 * @module lib/linkedin/api-client
 */

import {
  LINKEDIN_API_VERSION,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type LinkedInApiError,
  type LinkedInTokenData,
} from './types'
import { getValidAccessToken, refreshAccessToken, calculateExpiresAt } from './oauth'

/**
 * LinkedIn API Client class
 * Handles authenticated requests with automatic retry and token refresh
 */
export class LinkedInApiClient {
  private accessToken: string
  private tokenData: LinkedInTokenData
  private retryConfig: RetryConfig
  private onTokenRefresh?: (newTokenData: Partial<LinkedInTokenData>) => Promise<void>

  /**
   * Create a new LinkedIn API Client
   * @param tokenData - Stored token data from database
   * @param onTokenRefresh - Callback to update tokens in database when refreshed
   * @param retryConfig - Optional custom retry configuration
   */
  constructor(
    tokenData: LinkedInTokenData,
    onTokenRefresh?: (newTokenData: Partial<LinkedInTokenData>) => Promise<void>,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.tokenData = tokenData
    this.accessToken = tokenData.access_token
    this.onTokenRefresh = onTokenRefresh
    this.retryConfig = retryConfig
  }

  /**
   * Get the LinkedIn URN for the authenticated user
   * @returns LinkedIn URN (e.g., "urn:li:person:ABC123")
   */
  getLinkedInUrn(): string {
    return this.tokenData.linkedin_urn
  }

  /**
   * Get the current access token (refreshed if needed via ensureValidToken)
   * @returns Current access token string
   */
  getAccessToken(): string {
    return this.accessToken
  }

  /**
   * Ensure we have a valid access token, refreshing if needed
   */
  private async ensureValidToken(): Promise<void> {
    if (this.onTokenRefresh) {
      this.accessToken = await getValidAccessToken(this.tokenData, this.onTokenRefresh)
    }
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param attempt - Current retry attempt (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt)
    const jitter = Math.random() * this.retryConfig.baseDelayMs
    const delay = Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs)
    return delay
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Check if an error is retryable
   * @param status - HTTP status code
   * @returns True if request should be retried
   */
  private isRetryable(status: number): boolean {
    return this.retryConfig.retryableStatuses.includes(status)
  }

  /**
   * Handle a 401 error by attempting token refresh
   * @returns True if token was refreshed successfully
   */
  private async handleUnauthorized(): Promise<boolean> {
    if (!this.tokenData.refresh_token || !this.onTokenRefresh) {
      return false
    }

    try {
      const newTokens = await refreshAccessToken(this.tokenData.refresh_token)

      const newTokenData: Partial<LinkedInTokenData> = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || this.tokenData.refresh_token,
        expires_at: calculateExpiresAt(newTokens.expires_in),
        updated_at: new Date().toISOString(),
      }

      await this.onTokenRefresh(newTokenData)
      this.accessToken = newTokens.access_token
      this.tokenData = { ...this.tokenData, ...newTokenData } as LinkedInTokenData

      return true
    } catch (error) {
      console.error('Failed to refresh token after 401:', error)
      return false
    }
  }

  /**
   * Parse error response from LinkedIn API
   * @param response - Fetch response object
   * @returns Parsed error object
   */
  private async parseError(response: Response): Promise<LinkedInApiError> {
    try {
      const data = await response.json()
      return {
        status: response.status,
        serviceErrorCode: data.serviceErrorCode,
        code: data.code,
        message: data.message || `LinkedIn API error: ${response.status}`,
      }
    } catch {
      return {
        status: response.status,
        message: `LinkedIn API error: ${response.status} ${response.statusText}`,
      }
    }
  }

  /**
   * Make an authenticated request to LinkedIn API with retry logic
   * @param url - Full URL to request
   * @param options - Fetch options
   * @returns Response data
   * @throws LinkedInApiError on failure
   */
  async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureValidToken()

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'LinkedIn-Version': LINKEDIN_API_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
      ...(options.headers as Record<string, string> || {}),
    }

    // Add Content-Type for requests with body
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
    }

    let lastError: LinkedInApiError | null = null
    let hasTriedTokenRefresh = false

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions)

        if (response.ok) {
          // Handle empty responses (e.g., 201 Created)
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            return await response.json() as T
          }

          // For non-JSON responses, return the response info
          const responseId = response.headers.get('x-restli-id') ||
                            response.headers.get('x-linkedin-id')

          return {
            success: true,
            id: responseId,
            status: response.status,
          } as T
        }

        // Handle 401 - attempt token refresh once
        if (response.status === 401 && !hasTriedTokenRefresh) {
          hasTriedTokenRefresh = true
          const refreshed = await this.handleUnauthorized()

          if (refreshed) {
            // Update headers with new token
            requestOptions.headers = {
              ...requestOptions.headers,
              Authorization: `Bearer ${this.accessToken}`,
            } as Record<string, string>
            // Don't count this as a retry attempt
            attempt--
            continue
          }
        }

        lastError = await this.parseError(response)

        // Check if we should retry
        if (!this.isRetryable(response.status) || attempt === this.retryConfig.maxRetries) {
          throw lastError
        }

        // Wait before retrying
        const delay = this.calculateBackoffDelay(attempt)
        console.log(`LinkedIn API retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} after ${delay}ms`)
        await this.sleep(delay)

      } catch (error) {
        // If it's already a LinkedInApiError, rethrow
        if (error && typeof error === 'object' && 'status' in error) {
          throw error
        }

        // Network or other errors
        lastError = {
          status: 0,
          message: error instanceof Error ? error.message : 'Network error',
        }

        if (attempt === this.retryConfig.maxRetries) {
          throw lastError
        }

        const delay = this.calculateBackoffDelay(attempt)
        await this.sleep(delay)
      }
    }

    throw lastError || { status: 0, message: 'Request failed after retries' }
  }

  /**
   * Make a GET request to LinkedIn API
   * @param url - Full URL to request
   * @returns Response data
   */
  async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' })
  }

  /**
   * Make a POST request to LinkedIn API
   * @param url - Full URL to request
   * @param body - Request body (will be JSON stringified)
   * @returns Response data
   */
  async post<T>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Make a PUT request to LinkedIn API (for media uploads)
   * @param url - Full URL to request
   * @param body - Request body (binary data)
   * @param contentType - Content type of the upload
   * @returns Response data
   */
  async put<T>(
    url: string,
    body: ArrayBuffer | Blob,
    contentType: string
  ): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body,
      headers: {
        'Content-Type': contentType,
      },
    })
  }
}

/**
 * Create a LinkedIn API client from token data
 * @param tokenData - Stored token data from database
 * @param onTokenRefresh - Callback to update tokens when refreshed
 * @returns Configured LinkedIn API client
 * @example
 * const client = createLinkedInClient(tokenData, async (newData) => {
 *   await supabase.from('linkedin_tokens').update(newData).eq('user_id', userId)
 * })
 */
export function createLinkedInClient(
  tokenData: LinkedInTokenData,
  onTokenRefresh?: (newTokenData: Partial<LinkedInTokenData>) => Promise<void>
): LinkedInApiClient {
  return new LinkedInApiClient(tokenData, onTokenRefresh)
}
