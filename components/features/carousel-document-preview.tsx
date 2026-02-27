"use client"

/**
 * LinkedIn-style carousel document preview component.
 * Renders slide images with prev/next navigation, a page counter,
 * and a remove button — mimicking how LinkedIn displays carousel posts.
 * @module carousel-document-preview
 */

import * as React from "react"
import Image from "next/image"
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Props for the CarouselDocumentPreview component
 * @param slideImages - Array of data URL strings for each slide
 * @param onRemove - Callback when the user removes the carousel attachment
 * @param className - Optional additional CSS classes
 */
interface CarouselDocumentPreviewProps {
  slideImages: string[]
  onRemove: () => void
  className?: string
}

/**
 * LinkedIn-style carousel preview with slide navigation.
 * Shows one slide at a time with left/right arrows on hover,
 * a centered page counter, and a remove button.
 * @param props - Component props
 * @returns JSX element rendering the carousel preview
 */
export function CarouselDocumentPreview({
  slideImages,
  onRemove,
  className,
}: CarouselDocumentPreviewProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const total = slideImages.length
  const isFirst = currentIndex === 0
  const isLast = currentIndex === total - 1

  /**
   * Navigate to the previous slide
   */
  const goToPrev = React.useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }, [])

  /**
   * Navigate to the next slide
   */
  const goToNext = React.useCallback(() => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1))
  }, [total])

  /**
   * Handle keyboard navigation when the carousel is focused
   */
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        goToNext()
      }
    },
    [goToPrev, goToNext]
  )

  return (
    <div
      ref={containerRef}
      role="group"
      aria-roledescription="carousel"
      aria-label="Carousel document preview"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "group/carousel relative w-full overflow-hidden rounded-md border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {/* Slide image */}
      <div className="relative aspect-square w-full">
        <Image
          src={slideImages[currentIndex]}
          alt={`Slide ${currentIndex + 1} of ${total}`}
          fill
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      {/* Previous arrow */}
      {!isFirst && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-1/2 size-8 -translate-y-1/2 rounded-full opacity-0 shadow-md transition-opacity group-hover/carousel:opacity-100"
          onClick={goToPrev}
          aria-label="Previous slide"
        >
          <IconChevronLeft className="size-5" />
        </Button>
      )}

      {/* Next arrow */}
      {!isLast && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-full opacity-0 shadow-md transition-opacity group-hover/carousel:opacity-100"
          onClick={goToNext}
          aria-label="Next slide"
        >
          <IconChevronRight className="size-5" />
        </Button>
      )}

      {/* Remove button */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute right-2 top-2 size-6 rounded-full opacity-0 shadow-md transition-opacity group-hover/carousel:opacity-100"
        onClick={onRemove}
        aria-label="Remove carousel"
      >
        <IconX className="size-3.5" />
      </Button>

      {/* Page counter */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-black/50 py-1.5">
        <span className="text-xs font-medium text-white tabular-nums">
          {currentIndex + 1} of {total}
        </span>
      </div>
    </div>
  )
}
