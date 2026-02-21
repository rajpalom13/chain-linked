"use client"

/**
 * Brand Kit Preview Component
 * @description Displays extracted brand colors, fonts, and logo with edit capabilities
 * @module components/features/brand-kit-preview
 */

import * as React from "react"
import Image from "next/image"
import {
  IconCheck,
  IconColorSwatch,
  IconEdit,
  IconPhoto,
  IconRefresh,
  IconTypography,
  IconUpload,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Brand kit data structure for preview
 */
export interface BrandKitPreviewData {
  /** Website URL the brand was extracted from */
  websiteUrl: string
  /** Primary brand color (hex) */
  primaryColor: string
  /** Secondary brand color (hex) */
  secondaryColor?: string | null
  /** Accent color (hex) */
  accentColor?: string | null
  /** Background color (hex) */
  backgroundColor?: string | null
  /** Text color (hex) */
  textColor?: string | null
  /** Primary font family */
  fontPrimary?: string | null
  /** Secondary font family */
  fontSecondary?: string | null
  /** Logo URL */
  logoUrl?: string | null
}

/**
 * Props for the BrandKitPreview component
 */
export interface BrandKitPreviewProps {
  /** Brand kit data to display */
  brandKit: BrandKitPreviewData
  /** Whether the component is in loading state */
  isLoading?: boolean
  /** Whether colors/fonts can be edited */
  editable?: boolean
  /** Callback when brand kit is updated */
  onUpdate?: (updates: Partial<BrandKitPreviewData>) => void
  /** Callback when logo is uploaded */
  onLogoUpload?: (file: File) => void
  /** Callback when brand kit is saved */
  onSave?: () => void
  /** Callback when extraction is retried */
  onRetry?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Color swatch component with optional edit functionality
 */
interface ColorSwatchProps {
  /** Color name for label */
  name: string
  /** Hex color value */
  color: string | null | undefined
  /** Whether color can be edited */
  editable?: boolean
  /** Callback when color changes */
  onChange?: (color: string) => void
}

function ColorSwatch({ name, color, editable, onChange }: ColorSwatchProps) {
  const [editValue, setEditValue] = React.useState(color || "")
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setEditValue(color || "")
  }, [color])

  if (!color) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="h-12 w-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
          title={`${name}: Not detected`}
        >
          <span className="text-muted-foreground text-xs">N/A</span>
        </div>
        <span className="text-xs text-muted-foreground capitalize">{name}</span>
      </div>
    )
  }

  const SwatchButton = (
    <button
      className={cn(
        "h-12 w-12 rounded-lg border-2 border-border shadow-sm transition-all",
        editable && "cursor-pointer hover:scale-105 hover:shadow-md"
      )}
      style={{ backgroundColor: color }}
      title={`${name}: ${color}`}
      disabled={!editable}
    />
  )

  if (!editable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center gap-2">
              {SwatchButton}
              <span className="text-xs text-muted-foreground capitalize">{name}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{color}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex flex-col items-center gap-2">
          {SwatchButton}
          <span className="text-xs text-muted-foreground capitalize">{name}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex flex-col gap-3">
          <Label htmlFor={`color-${name}`}>Edit {name} color</Label>
          <div className="flex gap-2">
            <Input
              id={`color-${name}`}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="#000000"
              className="font-mono text-sm"
            />
            <input
              type="color"
              value={editValue || "#000000"}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border p-1"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (editValue && onChange) {
                onChange(editValue)
              }
              setIsOpen(false)
            }}
          >
            <IconCheck className="mr-2 h-4 w-4" />
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Font preview component
 */
interface FontPreviewProps {
  /** Font role (primary/secondary) */
  role: "primary" | "secondary"
  /** Font family name */
  font: string | null | undefined
  /** Whether font can be edited */
  editable?: boolean
  /** Callback when font changes */
  onChange?: (font: string) => void
}

function FontPreview({ role, font, editable, onChange }: FontPreviewProps) {
  const [editValue, setEditValue] = React.useState(font || "")
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setEditValue(font || "")
  }, [font])

  const sampleText = role === "primary"
    ? "The Quick Brown Fox"
    : "Jumps over the lazy dog"

  if (!font) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4">
        <p className="text-xs text-muted-foreground mb-1 capitalize">{role} Font</p>
        <p className="text-muted-foreground text-sm">Not detected</p>
      </div>
    )
  }

  const PreviewContent = (
    <div className={cn(
      "rounded-lg border p-4 transition-all",
      editable && "cursor-pointer hover:border-primary hover:shadow-sm"
    )}>
      <p className="text-xs text-muted-foreground mb-1 capitalize">{role} Font</p>
      <p
        className={cn(
          "text-lg",
          role === "primary" ? "font-semibold" : "font-normal"
        )}
        style={{ fontFamily: `${font}, system-ui, sans-serif` }}
      >
        {sampleText}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{font}</p>
    </div>
  )

  if (!editable) {
    return PreviewContent
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {PreviewContent}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-3">
          <Label htmlFor={`font-${role}`}>Edit {role} font</Label>
          <Input
            id={`font-${role}`}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Inter, Arial, sans-serif"
          />
          <Button
            size="sm"
            onClick={() => {
              if (editValue && onChange) {
                onChange(editValue)
              }
              setIsOpen(false)
            }}
          >
            <IconCheck className="mr-2 h-4 w-4" />
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Brand Kit Preview component for displaying and editing extracted brand elements
 * @param props - Component props
 * @returns JSX element
 * @example
 * <BrandKitPreview
 *   brandKit={{
 *     websiteUrl: "https://stripe.com",
 *     primaryColor: "#635BFF",
 *     fontPrimary: "Inter"
 *   }}
 *   editable
 *   onUpdate={(updates) => console.log(updates)}
 * />
 */
export function BrandKitPreview({
  brandKit,
  isLoading = false,
  editable = false,
  onUpdate,
  onLogoUpload,
  onSave,
  onRetry,
  className,
}: BrandKitPreviewProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  /**
   * Handles color update
   */
  const handleColorUpdate = (colorKey: keyof BrandKitPreviewData, value: string) => {
    if (onUpdate) {
      onUpdate({ [colorKey]: value })
    }
  }

  /**
   * Handles font update
   */
  const handleFontUpdate = (fontKey: "fontPrimary" | "fontSecondary", value: string) => {
    if (onUpdate) {
      onUpdate({ [fontKey]: value })
    }
  }

  /**
   * Handles logo file selection
   */
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onLogoUpload) {
      onLogoUpload(file)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Colors skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fonts skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Logo skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-24 rounded-lg" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Source URL */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Extracted from: <span className="font-medium text-foreground">{brandKit.websiteUrl}</span></span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <IconRefresh className="mr-2 h-4 w-4" />
            Re-extract
          </Button>
        )}
      </div>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconColorSwatch className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            {editable ? "Click on a color to edit it" : "Your extracted brand palette"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <ColorSwatch
              name="primary"
              color={brandKit.primaryColor}
              editable={editable}
              onChange={(c) => handleColorUpdate("primaryColor", c)}
            />
            <ColorSwatch
              name="secondary"
              color={brandKit.secondaryColor}
              editable={editable}
              onChange={(c) => handleColorUpdate("secondaryColor", c)}
            />
            <ColorSwatch
              name="accent"
              color={brandKit.accentColor}
              editable={editable}
              onChange={(c) => handleColorUpdate("accentColor", c)}
            />
            <ColorSwatch
              name="background"
              color={brandKit.backgroundColor}
              editable={editable}
              onChange={(c) => handleColorUpdate("backgroundColor", c)}
            />
            <ColorSwatch
              name="text"
              color={brandKit.textColor}
              editable={editable}
              onChange={(c) => handleColorUpdate("textColor", c)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTypography className="h-5 w-5" />
            Typography
          </CardTitle>
          <CardDescription>
            {editable ? "Click on a font to edit it" : "Your brand fonts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <FontPreview
              role="primary"
              font={brandKit.fontPrimary}
              editable={editable}
              onChange={(f) => handleFontUpdate("fontPrimary", f)}
            />
            <FontPreview
              role="secondary"
              font={brandKit.fontSecondary}
              editable={editable}
              onChange={(f) => handleFontUpdate("fontSecondary", f)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconPhoto className="h-5 w-5" />
            Logo
          </CardTitle>
          <CardDescription>
            {editable ? "Upload a different logo or use the extracted one" : "Your brand logo"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Logo preview */}
            <div
              className={cn(
                "relative flex h-24 w-24 items-center justify-center rounded-lg border-2 overflow-hidden",
                brandKit.logoUrl ? "border-border" : "border-dashed border-muted-foreground/30"
              )}
            >
              {brandKit.logoUrl ? (
                <Image
                  src={brandKit.logoUrl}
                  alt="Brand logo"
                  fill
                  className="object-contain p-2"
                  unoptimized // Allow external URLs
                />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <IconPhoto className="h-8 w-8 mb-1" />
                  <span className="text-xs">No logo</span>
                </div>
              )}
            </div>

            {/* Logo with different backgrounds */}
            {brandKit.logoUrl && (
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative h-16 w-16 rounded-lg bg-white border overflow-hidden">
                        <Image
                          src={brandKit.logoUrl}
                          alt="Logo on light"
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>On light background</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative h-16 w-16 rounded-lg bg-gray-900 border overflow-hidden">
                        <Image
                          src={brandKit.logoUrl}
                          alt="Logo on dark"
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>On dark background</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {brandKit.primaryColor && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="relative h-16 w-16 rounded-lg border overflow-hidden"
                          style={{ backgroundColor: brandKit.primaryColor }}
                        >
                          <Image
                            src={brandKit.logoUrl}
                            alt="Logo on brand"
                            fill
                            className="object-contain p-1"
                            unoptimized
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>On brand color</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

            {/* Upload button */}
            {editable && onLogoUpload && (
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconUpload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, SVG, or JPG (max 2MB)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            See how your brand looks applied to a sample card
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border p-6 transition-all"
            style={{
              backgroundColor: brandKit.backgroundColor || "#ffffff",
              borderColor: brandKit.primaryColor,
            }}
          >
            <div className="flex items-start gap-4">
              {brandKit.logoUrl && (
                <div className="relative h-12 w-12 shrink-0">
                  <Image
                    src={brandKit.logoUrl}
                    alt="Logo"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1">
                <h3
                  className="text-lg font-semibold mb-1"
                  style={{
                    fontFamily: brandKit.fontPrimary ? `${brandKit.fontPrimary}, system-ui` : undefined,
                    color: brandKit.textColor || "#1a1a1a",
                  }}
                >
                  Your Brand Title
                </h3>
                <p
                  className="text-sm mb-3"
                  style={{
                    fontFamily: brandKit.fontSecondary ? `${brandKit.fontSecondary}, system-ui` : undefined,
                    color: brandKit.textColor ? `${brandKit.textColor}cc` : "#666666",
                  }}
                >
                  This is how your content will look with your brand colors and fonts applied.
                </p>
                <div className="flex gap-2">
                  <button
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: brandKit.primaryColor }}
                  >
                    Primary Action
                  </button>
                  {brandKit.secondaryColor && (
                    <button
                      className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: brandKit.secondaryColor,
                        color: "#ffffff",
                      }}
                    >
                      Secondary
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {editable && onSave && (
        <div className="flex justify-end">
          <Button onClick={onSave} size="lg">
            <IconCheck className="mr-2 h-4 w-4" />
            Save Brand Kit
          </Button>
        </div>
      )}
    </div>
  )
}
