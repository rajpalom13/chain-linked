/**
 * Retry utilities with exponential backoff
 * Implements robust error handling for extension messaging
 */

import type { ExtensionMessage } from './types';

// ============================================
// CONFIGURATION
// ============================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
};

// ============================================
// RETRY STATE TRACKING
// ============================================

interface RetryStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  lastFailure: string | null;
  lastSuccess: string | null;
}

const retryStats: RetryStats = {
  totalAttempts: 0,
  successfulAttempts: 0,
  failedAttempts: 0,
  lastFailure: null,
  lastSuccess: null,
};

export function getRetryStats(): RetryStats {
  return { ...retryStats };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
export function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Check if extension context is still valid
 */
export function isExtensionContextValid(): boolean {
  try {
    return !!(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Non-retryable errors
  const nonRetryablePatterns = [
    'Extension context invalidated',
    'message port closed unexpectedly',
    'Could not establish connection',
    'Receiving end does not exist',
  ];

  for (const pattern of nonRetryablePatterns) {
    if (errorMessage.includes(pattern)) {
      return false;
    }
  }

  return true;
}

// ============================================
// CORE RETRY FUNCTION
// ============================================

/**
 * Execute a function with retry logic and exponential backoff
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Promise with result or throws after all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    retryStats.totalAttempts++;

    try {
      const result = await fn();
      retryStats.successfulAttempts++;
      retryStats.lastSuccess = new Date().toISOString();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        console.warn(`[Retry] Non-retryable error, failing immediately:`, lastError.message);
        retryStats.failedAttempts++;
        retryStats.lastFailure = new Date().toISOString();
        throw lastError;
      }

      // If we have more retries, wait and try again
      if (attempt < config.maxRetries) {
        const delay = calculateBackoffDelay(attempt, config);
        console.log(`[Retry] Attempt ${attempt + 1}/${config.maxRetries + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  retryStats.failedAttempts++;
  retryStats.lastFailure = new Date().toISOString();
  console.error(`[Retry] All ${config.maxRetries + 1} attempts failed`);
  throw lastError || new Error('Unknown error after retries');
}

// ============================================
// MESSAGE SENDING WITH RETRY
// ============================================

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Send message to background with retry logic
 * @param message - Extension message to send
 * @param config - Optional retry configuration
 * @returns Promise with response or null if extension context invalid
 */
export async function sendMessageWithRetry(
  message: ExtensionMessage,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<MessageResponse | null> {
  if (!isExtensionContextValid()) {
    console.log('[Retry] Extension context invalidated, skipping message');
    return null;
  }

  return withRetry(async () => {
    return new Promise<MessageResponse>((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message || '';
            if (errorMsg.includes('Extension context invalidated') ||
                errorMsg.includes('message port closed')) {
              // Extension reloaded, don't retry
              resolve({ success: false, error: 'Extension context lost' });
            } else {
              reject(new Error(errorMsg));
            }
          } else {
            resolve(response || { success: true });
          }
        });
      } catch (error) {
        if ((error as Error).message?.includes('Extension context invalidated')) {
          resolve({ success: false, error: 'Extension context lost' });
        } else {
          reject(error);
        }
      }
    });
  }, config);
}

// ============================================
// OFFLINE QUEUE FOR FAILED MESSAGES
// ============================================

interface QueuedMessage {
  id: string;
  message: ExtensionMessage;
  attempts: number;
  createdAt: string;
  lastAttempt: string | null;
}

const messageQueue: QueuedMessage[] = [];
const MAX_QUEUE_SIZE = 100;
let isProcessingQueue = false;

/**
 * Add message to offline queue for later retry
 */
export function queueMessage(message: ExtensionMessage): string {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (messageQueue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest message
    messageQueue.shift();
  }

  messageQueue.push({
    id,
    message,
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastAttempt: null,
  });

  console.log(`[Queue] Message queued: ${id}, queue size: ${messageQueue.length}`);
  return id;
}

/**
 * Process queued messages
 */
export async function processMessageQueue(): Promise<void> {
  if (isProcessingQueue || messageQueue.length === 0) return;

  isProcessingQueue = true;
  console.log(`[Queue] Processing ${messageQueue.length} queued messages`);

  const maxAttempts = 3;
  const successfulIds: string[] = [];
  const failedIds: string[] = [];

  for (const item of messageQueue) {
    if (item.attempts >= maxAttempts) {
      failedIds.push(item.id);
      continue;
    }

    try {
      item.attempts++;
      item.lastAttempt = new Date().toISOString();

      const response = await sendMessageWithRetry(item.message, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1, // Reduced retries for queue processing
      });

      if (response?.success) {
        successfulIds.push(item.id);
        console.log(`[Queue] Message ${item.id} sent successfully`);
      } else if (item.attempts >= maxAttempts) {
        failedIds.push(item.id);
      }
    } catch (error) {
      console.warn(`[Queue] Message ${item.id} failed:`, error);
      if (item.attempts >= maxAttempts) {
        failedIds.push(item.id);
      }
    }
  }

  // Remove processed messages
  const idsToRemove = new Set([...successfulIds, ...failedIds]);
  const remaining = messageQueue.filter((m) => !idsToRemove.has(m.id));
  messageQueue.length = 0;
  messageQueue.push(...remaining);

  console.log(`[Queue] Processed: ${successfulIds.length} success, ${failedIds.length} failed, ${messageQueue.length} remaining`);
  isProcessingQueue = false;
}

/**
 * Get queue status
 */
export function getQueueStatus(): { size: number; processing: boolean } {
  return {
    size: messageQueue.length,
    processing: isProcessingQueue,
  };
}

// ============================================
// AUTO-PROCESS QUEUE ON INTERVAL
// ============================================

let queueProcessorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start automatic queue processing
 */
export function startQueueProcessor(intervalMs: number = 30000): void {
  if (queueProcessorInterval) return;

  queueProcessorInterval = setInterval(() => {
    if (isExtensionContextValid()) {
      processMessageQueue();
    }
  }, intervalMs);

  console.log(`[Queue] Auto-processor started (${intervalMs}ms interval)`);
}

/**
 * Stop automatic queue processing
 */
export function stopQueueProcessor(): void {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
    console.log('[Queue] Auto-processor stopped');
  }
}

export type { QueuedMessage };
