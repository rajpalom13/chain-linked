"use client"

/**
 * Font Picker Component
 * @description Popover-based Unicode font style selector for the compose toolbar.
 * Lets users apply LinkedIn-compatible Unicode text formatting (bold, italic,
 * script, monospace, double-struck) to selected text.
 * @module components/features/font-picker
 */

import * as React from "react"
import { IconChevronDown } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import {
  type UnicodeFontStyle,
  UNICODE_FONTS,
  transformText,
} from "@/lib/unicode-fonts"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Props for FontPicker component
 */
export interface FontPickerProps {
  /** Currently active font style */
  activeFontStyle: UnicodeFontStyle
  /** Callback when a font style is selected */
  onFontSelect: (style: UnicodeFontStyle) => void
  /** Whether the picker is disabled */
  disabled?: boolean
}

/** Font styles displayed in the picker grid */
const FONT_OPTIONS: UnicodeFontStyle[] = [
  'normal',
  'bold',
  'italic',
  'boldItalic',
  'monospace',
  'script',
  'doubleStruck',
]

/**
 * Popover-based font style selector for the formatting toolbar.
 *
 * Shows a grid of Unicode font previews. Clicking a style applies it
 * to the current text selection, or sets it as the active style for
 * new typing.
 *
 * @param props - Component props
 * @param props.activeFontStyle - Currently active font style
 * @param props.onFontSelect - Callback when a font style is selected
 * @param props.disabled - Whether the picker is disabled
 * @returns FontPicker JSX element
 *
 * @example
 * <FontPicker
 *   activeFontStyle={fontStyle}
 *   onFontSelect={(style) => applyFont(style)}
 * />
 */
export function FontPicker({
  activeFontStyle,
  onFontSelect,
  disabled = false,
}: FontPickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              className="gap-0.5 w-auto px-1.5"
              aria-label="Font style"
            >
              <span className="text-sm font-bold leading-none">
                {activeFontStyle === 'normal' ? 'A' : transformText('A', activeFontStyle)}
              </span>
              <span className="text-sm italic leading-none text-muted-foreground">
                {activeFontStyle === 'normal' ? 'a' : transformText('a', activeFontStyle)}
              </span>
              <IconChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Unicode font style</TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-56 p-2"
        align="start"
        sideOffset={8}
      >
        <div className="mb-1.5 px-1">
          <p className="text-xs font-medium text-muted-foreground">
            Font Style
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {FONT_OPTIONS.map((style) => {
            const font = UNICODE_FONTS[style]
            const isActive = activeFontStyle === style
            const previewText = style === 'normal' ? 'Hello' : transformText('Hello', style)

            return (
              <button
                key={style}
                type="button"
                onClick={() => {
                  onFontSelect(style)
                  setOpen(false)
                }}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left transition-all",
                  "hover:bg-accent focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
                  isActive && "bg-primary/10 ring-1 ring-primary"
                )}
              >
                <span className="text-sm leading-tight truncate w-full">
                  {previewText}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  {font.label}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
