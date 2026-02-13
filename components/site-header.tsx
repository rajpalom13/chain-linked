/**
 * Site Header Component
 * @description Top navigation header with sidebar trigger, breadcrumbs,
 * optional actions slot, and user menu. Reads title from dashboard context
 * when available.
 * @module components/site-header
 */

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/** Title map for proper casing of URL segments */
const SEGMENT_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  compose: "Compose",
  schedule: "Schedule",
  team: "Team",
  posts: "Posts",
  templates: "Templates",
  prompts: "Prompt Playground",
  inspiration: "Inspiration",
  discover: "Discover",
  swipe: "Swipe",
  wishlist: "Wishlist",
  carousels: "Carousels",
  settings: "Settings",
}

/**
 * Site header with sidebar trigger and breadcrumbs.
 * Auto-generates breadcrumbs from the current pathname.
 * @returns Header component with navigation elements
 */
export function SiteHeader() {
  const pathname = usePathname()

  // Build breadcrumb segments from pathname
  const segments = pathname
    ?.replace(/^\/dashboard\/?/, "")
    .split("/")
    .filter(Boolean) ?? []

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {segments.length === 0 ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1
                    const href =
                      "/dashboard/" +
                      segments.slice(0, index + 1).join("/")
                    const label =
                      SEGMENT_TITLES[segment] ??
                      segment.charAt(0).toUpperCase() + segment.slice(1)

                    return (
                      <span key={href} className="contents">
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage>{label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link href={href}>{label}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </span>
                    )
                  })}
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
    </header>
  )
}
