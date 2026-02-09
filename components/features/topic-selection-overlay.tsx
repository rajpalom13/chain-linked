/**
 * Topic Selection Overlay Component
 * @description Full-screen overlay for first-time topic selection on the Discover page.
 * Allows users to select 3-10 topics to personalize their content feed.
 * @module components/features/topic-selection-overlay
 */

"use client"

import * as React from "react"
import {
  IconBrain,
  IconTargetArrow,
  IconHome,
  IconCloud,
  IconCrown,
  IconSpeakerphone,
  IconLayout,
  IconRocket,
  IconHeartHandshake,
  IconChartBar,
  IconUser,
  IconPencil,
  IconDevices,
  IconUsers,
  IconCash,
  IconLeaf,
  IconShield,
  IconClock,
  IconLoader2,
  IconCheck,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Minimum number of topics a user must select */
const MIN_TOPICS = 3

/** Maximum number of topics a user can select */
const MAX_TOPICS = 10

/**
 * Represents a selectable topic with metadata
 */
interface TopicItem {
  /** URL-friendly identifier (kebab-case) */
  slug: string
  /** Display name shown on the card */
  name: string
  /** Short description of the topic */
  description: string
  /** Tabler icon component for visual representation */
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Props for the TopicSelectionOverlay component
 */
interface TopicSelectionOverlayProps {
  /** Callback fired after topics are successfully saved, receives the selected topic slugs */
  onComplete: (selectedTopics: string[]) => void
  /** Controls whether the overlay is visible */
  isOpen: boolean
}

/**
 * Predefined list of available topics for the Discover page
 */
const TOPICS: TopicItem[] = [
  {
    slug: "ai",
    name: "AI",
    description: "Artificial Intelligence & Machine Learning",
    icon: IconBrain,
  },
  {
    slug: "sales",
    name: "Sales",
    description: "Sales Enablement & Strategy",
    icon: IconTargetArrow,
  },
  {
    slug: "remote-work",
    name: "Remote Work",
    description: "Remote & Hybrid Work",
    icon: IconHome,
  },
  {
    slug: "saas",
    name: "SaaS",
    description: "SaaS Growth & B2B",
    icon: IconCloud,
  },
  {
    slug: "leadership",
    name: "Leadership",
    description: "Leadership & Management",
    icon: IconCrown,
  },
  {
    slug: "marketing",
    name: "Marketing",
    description: "Digital Marketing",
    icon: IconSpeakerphone,
  },
  {
    slug: "product-management",
    name: "Product Management",
    description: "Product Strategy",
    icon: IconLayout,
  },
  {
    slug: "startups",
    name: "Startups",
    description: "Startup & Entrepreneurship",
    icon: IconRocket,
  },
  {
    slug: "customer-success",
    name: "Customer Success",
    description: "Customer Success & Support",
    icon: IconHeartHandshake,
  },
  {
    slug: "data-analytics",
    name: "Data Analytics",
    description: "Data & Analytics",
    icon: IconChartBar,
  },
  {
    slug: "personal-branding",
    name: "Personal Branding",
    description: "Personal Branding",
    icon: IconUser,
  },
  {
    slug: "content-creation",
    name: "Content Creation",
    description: "Content Creation & Strategy",
    icon: IconPencil,
  },
  {
    slug: "digital-transformation",
    name: "Digital Transformation",
    description: "Digital Transformation",
    icon: IconDevices,
  },
  {
    slug: "hiring-talent",
    name: "Hiring/Talent",
    description: "Hiring & Talent Management",
    icon: IconUsers,
  },
  {
    slug: "fintech",
    name: "FinTech",
    description: "Financial Technology",
    icon: IconCash,
  },
  {
    slug: "sustainability",
    name: "Sustainability",
    description: "Sustainability & ESG",
    icon: IconLeaf,
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity",
    description: "Cybersecurity",
    icon: IconShield,
  },
  {
    slug: "productivity",
    name: "Productivity",
    description: "Productivity & Tools",
    icon: IconClock,
  },
]

/**
 * Full-screen overlay for first-time topic selection on the Discover page.
 * Displays a grid of selectable topic cards with icons and descriptions.
 * Users must select between 3 and 10 topics before continuing.
 *
 * Topics are saved via POST /api/discover/topics and on success the
 * onComplete callback is invoked with the selected topic slugs.
 *
 * @param props - Component props
 * @param props.onComplete - Callback fired with selected topic slugs after successful save
 * @param props.isOpen - Whether the overlay is currently visible
 * @returns Full-screen overlay with topic selection grid, or null when closed
 *
 * @example
 * ```tsx
 * <TopicSelectionOverlay
 *   isOpen={showOverlay}
 *   onComplete={(topics) => {
 *     setShowOverlay(false)
 *     loadDiscoverFeed(topics)
 *   }}
 * />
 * ```
 */
export function TopicSelectionOverlay({
  onComplete,
  isOpen,
}: TopicSelectionOverlayProps) {
  const [selectedSlugs, setSelectedSlugs] = React.useState<Set<string>>(
    new Set()
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(false)

  /**
   * Trigger entrance animation after mount when isOpen becomes true
   */
  React.useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the initial state renders before animating in
      const timer = requestAnimationFrame(() => {
        setIsVisible(true)
      })
      return () => cancelAnimationFrame(timer)
    }
    setIsVisible(false)
  }, [isOpen])

  /**
   * Toggle a topic's selection state.
   * Prevents selecting more than MAX_TOPICS and shows a toast warning.
   * @param slug - The topic slug to toggle
   */
  const handleToggleTopic = React.useCallback(
    (slug: string) => {
      setSelectedSlugs((prev) => {
        const next = new Set(prev)
        if (next.has(slug)) {
          next.delete(slug)
        } else {
          if (next.size >= MAX_TOPICS) {
            toast.error(`You can select up to ${MAX_TOPICS} topics`)
            return prev
          }
          next.add(slug)
        }
        return next
      })
    },
    []
  )

  /**
   * Save selected topics to the backend and invoke onComplete on success.
   */
  const handleContinue = React.useCallback(async () => {
    const selected = Array.from(selectedSlugs)

    if (selected.length < MIN_TOPICS) {
      toast.error(`Please select at least ${MIN_TOPICS} topics`)
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/discover/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: selected }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.message || `Failed to save topics (${response.status})`
        )
      }

      onComplete(selected)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save topics"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }, [selectedSlugs, onComplete])

  if (!isOpen) {
    return null
  }

  const selectedCount = selectedSlugs.size
  const canContinue = selectedCount >= MIN_TOPICS && !isSaving

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        "transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Select your topics of interest"
    >
      <Card
        className={cn(
          "relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto",
          "transition-all duration-300 ease-out",
          isVisible
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-8 opacity-0 scale-95"
        )}
      >
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              What topics interest you?
            </h2>
            <p className="text-muted-foreground mt-2">
              Select {MIN_TOPICS}-{MAX_TOPICS} topics to personalize your
              Discover feed
            </p>
          </div>

          {/* Selected count badge */}
          <div className="flex justify-center mb-6">
            <Badge
              variant={selectedCount >= MIN_TOPICS ? "default" : "secondary"}
              className="text-sm px-3 py-1"
            >
              {selectedCount} of {MIN_TOPICS}-{MAX_TOPICS} selected
            </Badge>
          </div>

          {/* Topic grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOPICS.map((topic) => {
              const isSelected = selectedSlugs.has(topic.slug)
              const TopicIcon = topic.icon

              return (
                <button
                  key={topic.slug}
                  type="button"
                  onClick={() => handleToggleTopic(topic.slug)}
                  disabled={isSaving}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center",
                    "transition-all duration-200 cursor-pointer",
                    "hover:border-primary/40 hover:bg-accent/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card"
                  )}
                  aria-pressed={isSelected}
                  aria-label={`${topic.name}: ${topic.description}`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                      <IconCheck className="size-3 text-primary-foreground" />
                    </div>
                  )}

                  <TopicIcon
                    className={cn(
                      "size-7 shrink-0 transition-colors duration-200",
                      isSelected
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold leading-tight",
                        isSelected && "text-primary"
                      )}
                    >
                      {topic.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {topic.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Continue button */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="w-full max-w-xs"
              disabled={!canContinue}
              onClick={handleContinue}
            >
              {isSaving ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
            {selectedCount > 0 && selectedCount < MIN_TOPICS && (
              <p className="text-xs text-muted-foreground">
                Select {MIN_TOPICS - selectedCount} more topic
                {MIN_TOPICS - selectedCount !== 1 ? "s" : ""} to continue
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
