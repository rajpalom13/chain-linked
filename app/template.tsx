/**
 * App Template
 * @description Global template that re-mounts on every navigation.
 *
 * NOTE: Framer Motion AnimatePresence with key={pathname} does NOT work
 * reliably with Next.js App Router client-side navigation. The motion.div
 * gets stuck at opacity:0 after the exit/enter lifecycle because
 * AnimatePresence's cleanup conflicts with how the App Router preserves
 * layout state across navigations. Individual pages handle their own
 * entrance animations via stagger containers and fade-in sections instead.
 *
 * @module app/template
 */

/**
 * Template component — passes children through directly
 *
 * @param props - Template props
 * @param props.children - Page content
 * @returns Page content
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return children
}
