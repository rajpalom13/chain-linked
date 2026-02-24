/**
 * Shared category utility functions for mapping post categories to badge variants.
 * @module lib/category-utils
 */

/**
 * Returns the badge variant based on a post category string.
 * Used by post-detail-modal and inspiration-post-card components.
 * @param category - The category string
 * @returns Badge variant string for shadcn/ui Badge component
 */
export function getCategoryBadgeVariant(
  category: string
): "default" | "secondary" | "outline" {
  const lowerCategory = category.toLowerCase()
  if (
    lowerCategory.includes("thought") ||
    lowerCategory.includes("leadership")
  ) {
    return "default"
  }
  if (lowerCategory.includes("personal") || lowerCategory.includes("story")) {
    return "secondary"
  }
  if (lowerCategory.includes("sales") || lowerCategory.includes("business")) {
    return "default"
  }
  if (lowerCategory.includes("how-to") || lowerCategory.includes("tutorial")) {
    return "secondary"
  }
  return "outline"
}
