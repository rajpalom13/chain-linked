import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Props for the Textarea component
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea component
 * @description A styled textarea element following the new-york design system
 * @example
 * <Textarea placeholder="Enter your text here..." />
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "border-input bg-background placeholder:text-muted-foreground flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
