"use client"

/**
 * CrossNav - Reusable "Related Pages" navigation row
 * @description Eliminates dead-end pages by providing contextual navigation
 * links to related sections of the app. Uses stagger animations from the
 * shared animation system.
 * @module components/shared/cross-nav
 */

import Link from "next/link"
import { motion } from "framer-motion"
import { IconArrowRight } from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations"

/**
 * Supported color keys for cross-nav items.
 * Each maps to a set of static Tailwind classes so JIT can detect them.
 */
type CrossNavColor = "primary" | "blue-500" | "emerald-500" | "amber-500"

/**
 * Static class map for each color - avoids dynamic Tailwind class interpolation
 */
const colorStyles: Record<CrossNavColor, {
  border: string
  bg: string
  icon: string
  arrow: string
}> = {
  primary: {
    border: "hover:border-primary/40",
    bg: "from-primary/15 to-primary/5 ring-primary/10",
    icon: "text-primary",
    arrow: "group-hover:text-primary",
  },
  "blue-500": {
    border: "hover:border-blue-500/40",
    bg: "from-blue-500/15 to-blue-500/5 ring-blue-500/10",
    icon: "text-blue-500",
    arrow: "group-hover:text-blue-500",
  },
  "emerald-500": {
    border: "hover:border-emerald-500/40",
    bg: "from-emerald-500/15 to-emerald-500/5 ring-emerald-500/10",
    icon: "text-emerald-500",
    arrow: "group-hover:text-emerald-500",
  },
  "amber-500": {
    border: "hover:border-amber-500/40",
    bg: "from-amber-500/15 to-amber-500/5 ring-amber-500/10",
    icon: "text-amber-500",
    arrow: "group-hover:text-amber-500",
  },
}

/**
 * Configuration for a single cross-navigation item
 */
export interface CrossNavItem {
  /** Route path to navigate to */
  href: string
  /** Tabler icon component to display */
  icon: React.ElementType
  /** Short label for the navigation link */
  label: string
  /** Brief description of what the user will find */
  description: string
  /** Color key from the supported palette */
  color: CrossNavColor
}

/**
 * Props for the CrossNav component
 */
interface CrossNavProps {
  /** Array of navigation items to display */
  items: CrossNavItem[]
}

/**
 * CrossNav displays a row of navigation cards linking to related pages.
 * Prevents dead-end UX by giving users clear next actions.
 *
 * @param props - Component props
 * @param props.items - Navigation items to render
 * @returns Animated grid of navigation cards
 *
 * @example
 * <CrossNav items={[
 *   { href: "/dashboard/compose", icon: IconPencil, label: "Compose a Post", description: "Write new content", color: "primary" },
 *   { href: "/dashboard/analytics", icon: IconChartBar, label: "View Analytics", description: "Track performance", color: "emerald-500" },
 * ]} />
 */
export function CrossNav({ items }: CrossNavProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
    >
      {items.map((item) => {
        const Icon = item.icon
        const styles = colorStyles[item.color]

        return (
          <motion.div key={item.href} variants={staggerItemVariants}>
            <Link href={item.href} className="group block">
              <Card className={`h-full border-border/50 ${styles.border} transition-all duration-200 hover:shadow-sm`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`rounded-xl bg-gradient-to-br ${styles.bg} p-2.5 ring-1 shrink-0`}>
                    <Icon className={`size-5 ${styles.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <IconArrowRight className={`size-4 text-muted-foreground/30 ${styles.arrow} group-hover:translate-x-0.5 transition-all duration-200 shrink-0`} />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
