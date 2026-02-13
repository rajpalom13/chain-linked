"use client"

/**
 * Empty State Component
 * @description Reusable empty state placeholder with icon, title, description, optional CTA,
 * and smooth entrance animations so pages never feel barren.
 * @module components/shared/empty-state
 */

import Link from "next/link"
import { motion } from "framer-motion"
import { type Icon } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

/**
 * Props for the EmptyState component
 */
interface EmptyStateProps {
  /** Tabler icon component to display */
  icon: Icon
  /** Heading text */
  title: string
  /** Descriptive paragraph */
  description: string
  /** Primary action */
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** Optional secondary action */
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

/**
 * Consistent empty-state placeholder for pages with no data.
 * Features staggered entrance animations: icon bounces in, then title/description
 * fade-slide up, followed by action buttons.
 * @param props - Component props
 * @returns Centered empty state with icon, text, and optional CTAs
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 p-8 text-center"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 p-5"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.1,
          type: "spring",
          stiffness: 300,
          damping: 18,
        }}
      >
        <Icon className="size-9 text-primary/70" />
      </motion.div>
      <motion.div
        className="space-y-1.5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </motion.div>
      {(action || secondaryAction) && (
        <motion.div
          className="flex items-center gap-3 pt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {action && (
            action.href ? (
              <Button asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button variant="outline" asChild>
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
