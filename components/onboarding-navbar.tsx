"use client"

/**
 * Onboarding Navbar
 * @description Minimal branding header used in onboarding flow
 * @module components/onboarding-navbar
 */

import { IconLink } from "@tabler/icons-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

/**
 * Props for OnboardingNavbar
 */
interface OnboardingNavbarProps {
  /** Optional class name */
  className?: string
}

/**
 * Onboarding navbar component
 * @param props - Component props
 * @returns Navbar JSX element
 */
export function OnboardingNavbar({ className }: OnboardingNavbarProps) {
  return (
    <nav
      className={`w-full max-w-3xl h-20 flex items-center justify-between rounded-[40px] px-7 border border-border/40 bg-background/60 backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${className || ""}`}
    >
      <span className="flex gap-2 items-center">
        <IconLink className="size-5 text-primary" />
        <span className="text-xl font-semibold text-foreground">ChainLinked</span>
      </span>
      <AnimatedThemeToggler />
    </nav>
  )
}
