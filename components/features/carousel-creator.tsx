"use client"

import Image from "next/image"

import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconLoader2,
  IconPalette,
  IconPlus,
  IconDeviceFloppy,
  IconTrash,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Represents a single slide in a carousel
 */
export interface CarouselSlide {
  /** Unique identifier for the slide */
  id: string
  /** Text content of the slide */
  content: string
  /** Type of slide determining its purpose and styling */
  type: "title" | "content" | "stat" | "cta"
}

/**
 * Brand kit configuration for carousel styling
 */
export interface BrandKit {
  /** Primary brand color (hex format) */
  primaryColor: string
  /** Secondary brand color (hex format) */
  secondaryColor: string
  /** Font family name */
  fontFamily: string
  /** Optional logo URL */
  logoUrl?: string
}

/**
 * Props for the CarouselCreator component
 */
export interface CarouselCreatorProps {
  /** Initial slides to populate the editor with */
  initialSlides?: CarouselSlide[]
  /** Brand kit for styling the carousel */
  brandKit?: BrandKit
  /** Callback fired when export button is clicked */
  onExport?: (slides: CarouselSlide[], template: string) => Promise<void>
  /** Callback fired when save draft button is clicked */
  onSave?: (slides: CarouselSlide[]) => void
}

/**
 * Available carousel template types
 */
type TemplateType = "bold" | "minimalist" | "data" | "story"

/**
 * Template configuration with display name and description
 */
interface TemplateConfig {
  name: string
  description: string
}

/** Template configurations for the selector */
const TEMPLATES: Record<TemplateType, TemplateConfig> = {
  bold: {
    name: "Bold",
    description: "Large text, strong colors",
  },
  minimalist: {
    name: "Minimalist",
    description: "Clean, lots of whitespace",
  },
  data: {
    name: "Data-Focused",
    description: "Numbers prominent",
  },
  story: {
    name: "Story-Style",
    description: "Narrative flow",
  },
}

/** Default brand kit colors */
const DEFAULT_BRAND_KIT: BrandKit = {
  primaryColor: "#0077B5",
  secondaryColor: "#00A0DC",
  fontFamily: "Inter, sans-serif",
}

/** Default slides for new carousels */
const DEFAULT_SLIDES: CarouselSlide[] = [
  {
    id: "slide-1",
    content: "5 Tips for LinkedIn Success",
    type: "title",
  },
  {
    id: "slide-2",
    content: "Tip 1: Post consistently to build your audience",
    type: "content",
  },
  {
    id: "slide-3",
    content: "78% of professionals say LinkedIn helps them grow",
    type: "stat",
  },
  {
    id: "slide-4",
    content: "Tip 2: Engage with your network daily",
    type: "content",
  },
  {
    id: "slide-5",
    content: "Follow for more tips! Link in comments",
    type: "cta",
  },
]

/**
 * Generates a unique ID for new slides
 * @returns A unique string ID
 */
function generateSlideId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Returns template-specific styles for the slide preview
 * @param template - The selected template type
 * @param slideType - The type of slide
 * @param brandKit - The brand kit configuration
 * @param brandKitApplied - Whether brand kit colors should be applied
 * @returns CSS style object for the slide
 */
function getTemplateStyles(
  template: TemplateType,
  slideType: CarouselSlide["type"],
  brandKit: BrandKit,
  brandKitApplied: boolean
): React.CSSProperties {
  const primaryColor = brandKitApplied ? brandKit.primaryColor : "#0077B5"
  const secondaryColor = brandKitApplied ? brandKit.secondaryColor : "#00A0DC"
  const fontFamily = brandKitApplied ? brandKit.fontFamily : "Inter, sans-serif"

  const baseStyles: React.CSSProperties = {
    fontFamily,
  }

  switch (template) {
    case "bold":
      return {
        ...baseStyles,
        backgroundColor: slideType === "title" || slideType === "cta" ? primaryColor : "#ffffff",
        color: slideType === "title" || slideType === "cta" ? "#ffffff" : "#1a1a1a",
        fontSize: slideType === "stat" ? "2rem" : slideType === "title" ? "1.75rem" : "1.25rem",
        fontWeight: slideType === "title" || slideType === "stat" ? 700 : 500,
        padding: "2rem",
        textAlign: "center",
      }
    case "minimalist":
      return {
        ...baseStyles,
        backgroundColor: "#fafafa",
        color: "#333333",
        fontSize: slideType === "title" ? "1.5rem" : "1rem",
        fontWeight: slideType === "title" ? 600 : 400,
        padding: "3rem 2rem",
        textAlign: "center",
        borderLeft: slideType === "title" || slideType === "cta" ? `4px solid ${primaryColor}` : "none",
      }
    case "data":
      return {
        ...baseStyles,
        backgroundColor: slideType === "stat" ? primaryColor : "#ffffff",
        color: slideType === "stat" ? "#ffffff" : "#1a1a1a",
        fontSize: slideType === "stat" ? "2.5rem" : slideType === "title" ? "1.5rem" : "1.125rem",
        fontWeight: slideType === "stat" ? 800 : slideType === "title" ? 600 : 400,
        padding: "2rem",
        textAlign: "center",
        borderBottom: slideType !== "stat" ? `3px solid ${secondaryColor}` : "none",
      }
    case "story":
      return {
        ...baseStyles,
        background:
          slideType === "title"
            ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
            : "#ffffff",
        color: slideType === "title" ? "#ffffff" : "#333333",
        fontSize: slideType === "title" ? "1.625rem" : "1.125rem",
        fontWeight: slideType === "title" ? 600 : 400,
        padding: "2rem",
        textAlign: slideType === "cta" ? "center" : "left",
        lineHeight: 1.6,
      }
    default:
      return baseStyles
  }
}

/**
 * Returns CSS classes for template-specific styling
 * @param template - The selected template type
 * @param slideType - The type of slide
 * @returns Tailwind CSS class string
 */
function getTemplateClasses(template: TemplateType, slideType: CarouselSlide["type"]): string {
  const baseClasses = "flex items-center justify-center transition-all duration-300"

  switch (template) {
    case "bold":
      return cn(baseClasses, "rounded-lg shadow-lg")
    case "minimalist":
      return cn(baseClasses, "rounded-sm shadow-sm")
    case "data":
      return cn(baseClasses, "rounded-md shadow-md")
    case "story":
      return cn(
        baseClasses,
        "rounded-lg",
        slideType === "title" ? "shadow-xl" : "shadow-sm border"
      )
    default:
      return baseClasses
  }
}

/**
 * A carousel creator component for building LinkedIn PDF carousel posts.
 *
 * Features:
 * - Slide editor with add/remove functionality
 * - Text input for each slide with type selection
 * - Template selection (Bold, Minimalist, Data-Focused, Story-Style)
 * - Brand kit auto-application with preview
 * - Visual preview of carousel slides with navigation
 * - Export and save draft functionality
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CarouselCreator
 *   onExport={async (slides, template) => {
 *     await generatePDF(slides, template)
 *   }}
 *   onSave={(slides) => {
 *     saveDraft(slides)
 *   }}
 * />
 *
 * // With brand kit and initial slides
 * <CarouselCreator
 *   initialSlides={mySlides}
 *   brandKit={{
 *     primaryColor: "#FF6B35",
 *     secondaryColor: "#F7C59F",
 *     fontFamily: "Poppins, sans-serif",
 *     logoUrl: "/logo.png"
 *   }}
 * />
 * ```
 */
export function CarouselCreator({
  initialSlides,
  brandKit = DEFAULT_BRAND_KIT,
  onExport,
  onSave,
}: CarouselCreatorProps) {
  const [slides, setSlides] = React.useState<CarouselSlide[]>(
    initialSlides ?? DEFAULT_SLIDES
  )
  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplateType>("bold")
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0)
  const [brandKitApplied, setBrandKitApplied] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  /**
   * Adds a new slide to the carousel
   */
  const handleAddSlide = () => {
    const newSlide: CarouselSlide = {
      id: generateSlideId(),
      content: "",
      type: "content",
    }
    setSlides((prev) => [...prev, newSlide])
    setCurrentSlideIndex(slides.length)
  }

  /**
   * Removes a slide from the carousel
   * @param slideId - The ID of the slide to remove
   */
  const handleRemoveSlide = (slideId: string) => {
    if (slides.length <= 1) return // Keep at least one slide

    const slideIndex = slides.findIndex((s) => s.id === slideId)
    setSlides((prev) => prev.filter((s) => s.id !== slideId))

    // Adjust current slide index if necessary
    if (currentSlideIndex >= slides.length - 1) {
      setCurrentSlideIndex(Math.max(0, slides.length - 2))
    } else if (slideIndex <= currentSlideIndex && currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
    }
  }

  /**
   * Updates a slide's content
   * @param slideId - The ID of the slide to update
   * @param content - The new content
   */
  const handleContentChange = (slideId: string, content: string) => {
    setSlides((prev) =>
      prev.map((slide) =>
        slide.id === slideId ? { ...slide, content } : slide
      )
    )
  }

  /**
   * Updates a slide's type
   * @param slideId - The ID of the slide to update
   * @param type - The new slide type
   */
  const handleTypeChange = (slideId: string, type: CarouselSlide["type"]) => {
    setSlides((prev) =>
      prev.map((slide) =>
        slide.id === slideId ? { ...slide, type } : slide
      )
    )
  }

  /**
   * Navigates to the previous slide in the preview
   */
  const handlePreviousSlide = () => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1))
  }

  /**
   * Navigates to the next slide in the preview
   */
  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))
  }

  /**
   * Handles the export button click
   */
  const handleExport = async () => {
    if (!onExport) return

    setIsExporting(true)
    try {
      await onExport(slides, selectedTemplate)
    } catch (error) {
      console.error("Failed to export carousel:", error)
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Handles the save draft button click
   */
  const handleSave = () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      onSave(slides)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Toggles brand kit application
   */
  const handleToggleBrandKit = () => {
    setBrandKitApplied((prev) => !prev)
  }

  const currentSlide = slides[currentSlideIndex]

  return (
    <div className="flex flex-col gap-6">
      {/* Main Editor and Preview Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Slide Editor Column */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Slide Editor</CardTitle>
            <CardDescription>
              Create and edit your carousel slides
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4">
            {/* Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="template-select">Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(value) => setSelectedTemplate(value as TemplateType)}
              >
                <SelectTrigger id="template-select" className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TEMPLATES) as [TemplateType, TemplateConfig][]).map(
                    ([key, template]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {template.description}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Slides List */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
              <Label>Slides ({slides.length})</Label>
              <div className="space-y-3 pr-1">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={cn(
                      "group relative flex items-start gap-2 rounded-lg border p-3 transition-colors",
                      currentSlideIndex === index
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/30"
                    )}
                    onClick={() => setCurrentSlideIndex(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setCurrentSlideIndex(index)
                      }
                    }}
                    aria-label={`Select slide ${index + 1}`}
                    aria-pressed={currentSlideIndex === index}
                  >
                    {/* Slide Number */}
                    <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                      {index + 1}
                    </span>

                    {/* Slide Content and Type */}
                    <div className="flex flex-1 flex-col gap-2">
                      <Input
                        value={slide.content}
                        onChange={(e) => handleContentChange(slide.id, e.target.value)}
                        placeholder={`Slide ${index + 1} content...`}
                        className="h-auto py-1.5"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Slide ${index + 1} content`}
                      />
                      <Select
                        value={slide.type}
                        onValueChange={(value) =>
                          handleTypeChange(slide.id, value as CarouselSlide["type"])
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-32"
                          onClick={(e) => e.stopPropagation()}
                          size="sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="title">Title</SelectItem>
                          <SelectItem value="content">Content</SelectItem>
                          <SelectItem value="stat">Statistic</SelectItem>
                          <SelectItem value="cta">Call to Action</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveSlide(slide.id)
                      }}
                      disabled={slides.length <= 1}
                      aria-label={`Remove slide ${index + 1}`}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Slide Button */}
            <Button
              variant="outline"
              onClick={handleAddSlide}
              className="w-full"
            >
              <IconPlus className="size-4" />
              Add Slide
            </Button>
          </CardContent>
        </Card>

        {/* Preview Column */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              See how your carousel will look
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4">
            {/* Slide Preview */}
            <div
              className={cn(
                "relative aspect-square w-full overflow-hidden",
                getTemplateClasses(selectedTemplate, currentSlide?.type ?? "content")
              )}
              style={getTemplateStyles(
                selectedTemplate,
                currentSlide?.type ?? "content",
                brandKit,
                brandKitApplied
              )}
            >
              {/* Brand Logo */}
              {brandKitApplied && brandKit.logoUrl && (
                <Image
                  src={brandKit.logoUrl}
                  alt="Brand logo"
                  width={80}
                  height={32}
                  className="absolute top-4 left-4 h-8 w-auto object-contain"
                  unoptimized
                />
              )}

              {/* Slide Content */}
              <div className="flex h-full w-full items-center justify-center p-8">
                <p className="text-center">
                  {currentSlide?.content || "Enter slide content..."}
                </p>
              </div>

              {/* Slide Number Indicator */}
              <div className="absolute bottom-4 right-4 rounded-full bg-black/20 px-3 py-1 text-sm text-white backdrop-blur-sm">
                {currentSlideIndex + 1} / {slides.length}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousSlide}
                disabled={currentSlideIndex === 0}
                aria-label="Previous slide"
              >
                <IconChevronLeft className="size-4" />
              </Button>

              <span className="text-muted-foreground min-w-[3rem] text-center text-sm tabular-nums">
                {currentSlideIndex + 1} / {slides.length}
              </span>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextSlide}
                disabled={currentSlideIndex === slides.length - 1}
                aria-label="Next slide"
              >
                <IconChevronRight className="size-4" />
              </Button>
            </div>

            {/* Brand Kit Toggle */}
            <Button
              variant={brandKitApplied ? "default" : "outline"}
              onClick={handleToggleBrandKit}
              className="w-full"
            >
              <IconPalette className="size-4" />
              {brandKitApplied ? "Brand Kit Applied" : "Apply Brand Kit"}
            </Button>

            {/* Brand Kit Info */}
            {brandKitApplied && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-3 rounded-lg border p-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className="size-4 rounded-full border"
                    style={{ backgroundColor: brandKit.primaryColor }}
                    title="Primary Color"
                  />
                  <span>Primary</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="size-4 rounded-full border"
                    style={{ backgroundColor: brandKit.secondaryColor }}
                    title="Secondary Color"
                  />
                  <span>Secondary</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontFamily: brandKit.fontFamily }}>Aa</span>
                  <span>{brandKit.fontFamily.split(",")[0]}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <Card>
        <CardFooter className="flex justify-end gap-2 py-4">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || isExporting || slides.length === 0}
          >
            {isSaving ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="size-4" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || isSaving || slides.length === 0}
          >
            {isExporting ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconDownload className="size-4" />
            )}
            Export PDF
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
