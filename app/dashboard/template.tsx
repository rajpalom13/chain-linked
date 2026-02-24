/**
 * Dashboard Template
 * @description Dashboard-specific template that passes through children directly.
 * The app-level template (app/template.tsx) already wraps all pages with
 * PageTransition, so adding another here would cause double animation nesting.
 * @module app/dashboard/template
 */

/**
 * Dashboard template that passes children through without additional wrappers
 *
 * @param props - Template props
 * @param props.children - Dashboard page content
 * @returns Dashboard page content directly
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
