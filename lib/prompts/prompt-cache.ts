/**
 * Prompt Cache
 * @description In-memory caching for prompts to reduce database calls.
 * Uses a simple TTL-based cache with automatic invalidation.
 * @module lib/prompts/prompt-cache
 */

import type { PromptType, SystemPrompt } from './prompt-types'

/**
 * Cached prompt entry with timestamp for TTL checking
 */
interface CachedPrompt {
  /** The cached prompt data */
  prompt: SystemPrompt
  /** Unix timestamp when the prompt was cached */
  cachedAt: number
}

/**
 * In-memory cache for active prompts.
 *
 * Features:
 * - 5 minute TTL (Time To Live)
 * - Automatic invalidation on prompt update/activation
 * - Per-type caching for active prompts
 *
 * Note: This is a simple in-memory cache. In a production environment with
 * multiple server instances, consider using Redis or similar distributed cache.
 *
 * @example
 * // Get a cached prompt
 * const cached = PromptCache.get(PromptType.REMIX_PROFESSIONAL)
 * if (cached) {
 *   return cached // Use cached version
 * }
 *
 * // Fetch from DB and cache
 * const prompt = await fetchFromDatabase()
 * PromptCache.set(PromptType.REMIX_PROFESSIONAL, prompt)
 *
 * // Invalidate on update
 * PromptCache.invalidate(PromptType.REMIX_PROFESSIONAL)
 */
export class PromptCache {
  /** Internal cache storage mapping prompt types to cached entries */
  private static cache = new Map<PromptType, CachedPrompt>()

  /** Cache time-to-live in milliseconds (5 minutes) */
  private static TTL_MS = 5 * 60 * 1000

  /**
   * Get a cached prompt if it exists and is still valid
   * @param type - The prompt type to retrieve from cache
   * @returns The cached SystemPrompt if valid, or null if not cached/expired
   * @example
   * const cached = PromptCache.get(PromptType.REMIX_PROFESSIONAL)
   * if (cached) {
   *   console.log('Cache hit:', cached.name)
   * }
   */
  static get(type: PromptType): SystemPrompt | null {
    const cached = this.cache.get(type)

    if (!cached) {
      return null
    }

    if (!this.isValid(cached)) {
      // Cache entry expired, remove it
      this.cache.delete(type)
      return null
    }

    return cached.prompt
  }

  /**
   * Cache a prompt for future retrieval
   * @param type - The prompt type to cache
   * @param prompt - The SystemPrompt to cache
   * @example
   * const prompt = await fetchPromptFromDB(type)
   * PromptCache.set(type, prompt)
   */
  static set(type: PromptType, prompt: SystemPrompt): void {
    this.cache.set(type, {
      prompt,
      cachedAt: Date.now(),
    })
  }

  /**
   * Invalidate (remove) the cache entry for a specific prompt type.
   * Call this when a prompt is updated or activated to ensure
   * fresh data is fetched on the next request.
   * @param type - The prompt type to invalidate
   * @example
   * // After updating a prompt
   * await updatePromptInDB(type, newContent)
   * PromptCache.invalidate(type)
   */
  static invalidate(type: PromptType): void {
    this.cache.delete(type)
  }

  /**
   * Clear the entire cache.
   * Useful during deployments, config changes, or testing.
   * @example
   * // Clear all cached prompts during a full refresh
   * PromptCache.invalidateAll()
   */
  static invalidateAll(): void {
    this.cache.clear()
  }

  /**
   * Check if a cached entry is still within its TTL
   * @param cached - The cached prompt entry to check
   * @returns True if the cache entry is still valid, false if expired
   */
  private static isValid(cached: CachedPrompt): boolean {
    const now = Date.now()
    const age = now - cached.cachedAt
    return age < this.TTL_MS
  }

  /**
   * Get the current cache size (number of entries)
   * Useful for debugging and monitoring
   * @returns The number of entries in the cache
   * @example
   * console.log(`Cache contains ${PromptCache.size()} entries`)
   */
  static size(): number {
    return this.cache.size
  }

  /**
   * Get cache statistics for debugging/monitoring
   * @returns Object with cache statistics
   * @example
   * const stats = PromptCache.getStats()
   * console.log(`Cache: ${stats.entries} entries, ${stats.validEntries} valid`)
   */
  static getStats(): {
    entries: number
    validEntries: number
    cachedTypes: PromptType[]
  } {
    const entries = this.cache.size
    let validEntries = 0
    const cachedTypes: PromptType[] = []

    this.cache.forEach((cached, type) => {
      if (this.isValid(cached)) {
        validEntries++
        cachedTypes.push(type)
      }
    })

    return {
      entries,
      validEntries,
      cachedTypes,
    }
  }

  /**
   * Set a custom TTL for testing purposes
   * @param ttlMs - TTL in milliseconds
   * @internal This method is primarily for testing
   */
  static setTTL(ttlMs: number): void {
    this.TTL_MS = ttlMs
  }

  /**
   * Reset TTL to default value (5 minutes)
   * @internal This method is primarily for testing
   */
  static resetTTL(): void {
    this.TTL_MS = 5 * 60 * 1000
  }
}
