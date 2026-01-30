import { cn } from "@/lib/utils"

/**
 * Skeleton loading placeholder with shimmer animation
 * @param props - Standard div props with optional className
 * @returns Animated skeleton placeholder element
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md shimmer",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
