import { toast } from "sonner"

/**
 * Toast utility functions for consistent messaging across the app.
 * Uses Sonner toast library with predefined styles and behaviors.
 */

/**
 * Show a success toast message.
 * @param message - The success message to display
 * @param description - Optional description for more details
 */
export function showSuccess(message: string, description?: string) {
  toast.success(message, { description })
}

/**
 * Show an error toast message.
 * @param message - The error message to display
 * @param description - Optional description with error details
 */
export function showError(message: string, description?: string) {
  toast.error(message, { description })
}

/**
 * Show an info toast message.
 * @param message - The info message to display
 * @param description - Optional description for more details
 */
export function showInfo(message: string, description?: string) {
  toast.info(message, { description })
}

/**
 * Show a warning toast message.
 * @param message - The warning message to display
 * @param description - Optional description for more details
 */
export function showWarning(message: string, description?: string) {
  toast.warning(message, { description })
}

/**
 * Show a loading toast that can be updated.
 * @param message - The loading message to display
 * @returns Toast ID that can be used to dismiss or update the toast
 */
export function showLoading(message: string) {
  return toast.loading(message)
}

/**
 * Dismiss a specific toast or all toasts.
 * @param toastId - Optional toast ID to dismiss. If not provided, dismisses all toasts.
 */
export function dismissToast(toastId?: string | number) {
  toast.dismiss(toastId)
}

/**
 * Show a toast with an undo action button.
 * Useful for destructive actions that can be reversed.
 * @param message - The message to display
 * @param onUndo - Callback function when undo is clicked
 * @param duration - How long to show the toast (default: 5000ms)
 */
export function showUndo(
  message: string,
  onUndo: () => void,
  duration: number = 5000
) {
  toast(message, {
    action: {
      label: "Undo",
      onClick: onUndo,
    },
    duration,
  })
}

/**
 * Show a promise toast that updates based on promise state.
 * @param promise - The promise to track
 * @param messages - Messages for loading, success, and error states
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) {
  return toast.promise(promise, messages)
}

/**
 * Show a toast for post-related actions.
 */
export const postToast = {
  scheduled: (date: string) =>
    showSuccess("Post scheduled", `Your post will be published on ${date}`),

  published: () =>
    showSuccess("Post published", "Your post is now live on LinkedIn"),

  saved: () =>
    showSuccess("Draft saved", "Your draft has been saved"),

  mediaSaved: () =>
    showSuccess("Media added", "Your file has been attached"),

  mediaRemoved: () =>
    showInfo("Media removed", "File has been detached"),

  deleted: (onUndo?: () => void) => {
    if (onUndo) {
      showUndo("Post deleted", onUndo)
    } else {
      showSuccess("Post deleted")
    }
  },

  failed: (reason?: string) =>
    showError("Failed to publish", reason || "Please try again"),
}

/**
 * Show a toast for template-related actions.
 */
export const templateToast = {
  created: (name: string) =>
    showSuccess("Template created", `"${name}" is now available`),

  updated: (name: string) =>
    showSuccess("Template updated", `"${name}" has been saved`),

  deleted: (name: string, onUndo?: () => void) => {
    if (onUndo) {
      showUndo(`Template "${name}" deleted`, onUndo)
    } else {
      showSuccess("Template deleted")
    }
  },

  applied: (name: string) =>
    showInfo("Template applied", `"${name}" loaded into composer`),
}

/**
 * Show a toast for inspiration/remix actions.
 */
export const inspirationToast = {
  remixed: () =>
    showInfo("Post loaded for remix", "Edit and make it your own"),

  saved: () =>
    showSuccess("Inspiration saved", "Added to your saved posts"),
}
