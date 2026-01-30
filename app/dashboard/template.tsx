/**
 * Dashboard Template
 * @description Dashboard-specific page transitions
 * @module app/dashboard/template
 */

"use client"

import { PageTransition } from "@/components/page-transition"

/**
 * Dashboard template with optimized transitions for dashboard navigation
 *
 * @param props - Template props
 * @param props.children - Dashboard page content
 * @returns Dashboard content wrapped with transitions
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageTransition className="flex-1">
      {children}
    </PageTransition>
  )
}
