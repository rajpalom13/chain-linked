/**
 * App Template
 * @description Global template for page transitions
 * @module app/template
 */

"use client"

import { PageTransition } from "@/components/page-transition"

/**
 * Template component that wraps all pages with transition animations
 *
 * @param props - Template props
 * @param props.children - Page content
 * @returns Page content wrapped with transitions
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
