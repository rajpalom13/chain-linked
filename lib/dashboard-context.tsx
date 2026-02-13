'use client'

/**
 * Dashboard Context
 * @description Provides shared state for dashboard pages, including page title
 * and header actions. Feeds the shared SiteHeader component.
 * @module lib/dashboard-context
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

/**
 * Page metadata that individual pages declare via usePageMeta
 */
interface PageMeta {
  /** Page title displayed in the header */
  title: string
  /** Optional action buttons rendered in the header's right area */
  headerActions?: ReactNode
}

/**
 * Dashboard context type
 */
interface DashboardContextType {
  /** Current page metadata */
  pageMeta: PageMeta
  /** Set page metadata (called by usePageMeta) */
  setPageMeta: (meta: PageMeta) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

/**
 * DashboardProvider wraps all dashboard children and manages shared state.
 * @param props - Provider props
 * @param props.children - Dashboard content
 * @returns Dashboard context provider
 */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [pageMeta, setPageMeta] = useState<PageMeta>({ title: 'Dashboard' })

  return (
    <DashboardContext.Provider value={{ pageMeta, setPageMeta }}>
      {children}
    </DashboardContext.Provider>
  )
}

/**
 * Hook for pages to declare their title and optional header actions.
 * Must be called at the top of each dashboard page component.
 * @param meta - Page metadata (title and optional headerActions)
 * @example
 * usePageMeta({ title: "Analytics" })
 * usePageMeta({ title: "Dashboard", headerActions: <Button>New Post</Button> })
 */
export function usePageMeta(meta: PageMeta) {
  const context = useContext(DashboardContext)

  const setPageMeta = context?.setPageMeta

  useEffect(() => {
    if (setPageMeta) {
      setPageMeta(meta)
    }
    // Only re-run when title changes (headerActions are intentionally not in deps
    // to avoid infinite loops from inline JSX)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.title, setPageMeta])
}

/**
 * Hook to read current page metadata (used by SiteHeader)
 * @returns Current page metadata
 */
export function useDashboardContext(): DashboardContextType {
  const context = useContext(DashboardContext)
  if (!context) {
    return {
      pageMeta: { title: 'Dashboard' },
      setPageMeta: () => {},
    }
  }
  return context
}
