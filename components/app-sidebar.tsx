/**
 * App Sidebar Component
 * @description Main navigation sidebar for the ChainLinked application
 * Clean minimal design with collapsible sections and tree connectors
 * @module components/app-sidebar
 */

"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconArticle,
  IconBulb,
  IconCalendar,
  IconChartBar,
  IconChevronRight,
  IconCirclePlusFilled,
  IconCompass,
  IconDashboard,
  IconLink,
  IconPencil,
  IconPresentation,
  IconSwipe,
  IconTemplate,
  IconTerminal2,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuthContext } from "@/lib/auth/auth-provider"
// LinkedInStatusBadge removed from sidebar — status is shown in settings page

// ============================================================================
// Animation Configuration
// ============================================================================

const smoothEase = [0.16, 1, 0.3, 1] as const

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  title: string
  url: string
  icon: Icon
  exact?: boolean
}

// ============================================================================
// Navigation Configuration
// ============================================================================

const overviewNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
    exact: true,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: IconChartBar,
  },
  {
    title: "Posts",
    url: "/dashboard/posts",
    icon: IconArticle,
  },
  {
    title: "Compose",
    url: "/dashboard/compose",
    icon: IconPencil,
  },
  {
    title: "Schedule",
    url: "/dashboard/schedule",
    icon: IconCalendar,
  },
  {
    title: "Team",
    url: "/dashboard/team",
    icon: IconUsers,
  },
]

const contentNavItems: NavItem[] = [
  {
    title: "Templates",
    url: "/dashboard/templates",
    icon: IconTemplate,
  },
  {
    title: "Prompt Playground",
    url: "/dashboard/prompts",
    icon: IconTerminal2,
  },
  {
    title: "Inspiration",
    url: "/dashboard/inspiration",
    icon: IconBulb,
  },
  {
    title: "Discover",
    url: "/dashboard/discover",
    icon: IconCompass,
  },
  {
    title: "Swipe",
    url: "/dashboard/swipe",
    icon: IconSwipe,
  },
  {
    title: "Carousels",
    url: "/dashboard/carousels",
    icon: IconPresentation,
  },
]

// ============================================================================
// Main Component
// ============================================================================

/**
 * ChainLinked Application Sidebar Component
 *
 * Clean minimal design with:
 * - Collapsible sections with smooth animations
 * - Tree connector lines showing hierarchy
 * - Compact layout for better navigation
 *
 * @param props - Standard React component props extending Sidebar component props
 * @returns The rendered sidebar component with full navigation structure
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, profile, signOut, isLoading } = useAuthContext()
  const pathname = usePathname()

  // Track which sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    content: true,
  })

  // Prevent hydration mismatch with Radix IDs
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-open sections based on current path
  useEffect(() => {
    if (pathname === '/dashboard' ||
        pathname?.includes('/dashboard/analytics') ||
        pathname?.includes('/dashboard/posts') ||
        pathname?.includes('/dashboard/compose') ||
        pathname?.includes('/dashboard/schedule') ||
        pathname?.includes('/dashboard/team')) {
      setOpenSections(prev => ({ ...prev, overview: true }))
    }
    if (pathname?.includes('/dashboard/templates') ||
        pathname?.includes('/dashboard/prompts') ||
        pathname?.includes('/dashboard/inspiration') ||
        pathname?.includes('/dashboard/discover') ||
        pathname?.includes('/dashboard/swipe') ||
        pathname?.includes('/dashboard/carousels')) {
      setOpenSections(prev => ({ ...prev, content: true }))
    }
  }, [pathname])

  /**
   * Check if a path is currently active
   */
  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path
    return pathname?.startsWith(path)
  }

  /**
   * Toggle a collapsible section
   */
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  /**
   * Derive user display data from auth context.
   * Handles multiple data sources: LinkedIn profile (extension sync),
   * profiles table, and Supabase auth metadata.
   */
  const userData = useMemo(() => {
    if (!user) {
      return {
        name: "Guest",
        email: "",
        avatar: "",
        headline: undefined,
      }
    }

    // Name: prioritize LinkedIn profile → profiles table → auth metadata
    const linkedInFirstLast = profile?.linkedin_profile?.first_name && profile?.linkedin_profile?.last_name
      ? `${profile.linkedin_profile.first_name} ${profile.linkedin_profile.last_name}`
      : null
    const linkedInRawName = profile?.linkedin_profile?.raw_data?.full_name ||
                            profile?.linkedin_profile?.raw_data?.name
    const profileFullName = profile?.full_name
    const profileName = profile?.name
    const metadataName = user.user_metadata?.name || user.user_metadata?.full_name
    const emailName = user.email?.split('@')[0] || 'User'

    const name = linkedInFirstLast || linkedInRawName || profileFullName || profileName || metadataName || emailName

    // Avatar: prioritize LinkedIn profile_picture_url → profiles table → auth metadata
    const linkedInAvatar = profile?.linkedin_profile?.profile_picture_url ||
                          profile?.linkedin_profile?.raw_data?.profilePhotoUrl ||
                          profile?.linkedin_avatar_url
    const profileAvatar = profile?.avatar_url
    const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture

    const avatar = linkedInAvatar || profileAvatar || metadataAvatar || ""

    // Headline: prioritize linkedin_profiles column → raw_data → profiles table
    const headline = profile?.linkedin_profile?.headline ||
                     profile?.linkedin_profile?.raw_data?.headline ||
                     profile?.linkedin_headline

    return {
      name: name as string,
      email: user.email || "",
      avatar: avatar as string,
      headline: headline as string | undefined,
    }
  }, [user, profile])

  // ============================================================================
  // Nav Link Components
  // ============================================================================

  /**
   * Sub-navigation link with tree connectors
   */
  const SubNavLink = ({ item, isLast }: { item: NavItem; isLast: boolean }) => {
    const active = isActive(item.url, item.exact)

    return (
      <div className="relative">
        {/* Tree connector lines */}
        <div className={cn(
          "absolute left-[11px] top-0 w-px",
          isLast ? "h-[14px]" : "h-full",
          active ? "bg-primary/40" : "bg-border"
        )} />
        <div className={cn(
          "absolute left-[11px] top-[14px] w-2 h-px",
          active ? "bg-primary/40" : "bg-border"
        )} />

        <Link
          href={item.url}
          className={cn(
            "block pl-6 pr-2.5 py-1 text-sm transition-colors duration-150 rounded-md mx-0.5",
            active
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground font-normal"
          )}
        >
          {item.title}
        </Link>
      </div>
    )
  }

  /**
   * Section header with collapse control
   */
  const SectionHeader = ({
    label,
    isOpen,
  }: {
    label: string
    isOpen: boolean
  }) => (
    <CollapsibleTrigger
      className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-150"
    >
      <span className="flex-1 text-left">{label}</span>
      <IconChevronRight
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-90"
        )}
      />
    </CollapsibleTrigger>
  )

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* Sidebar Header - Company Branding */}
      <SidebarHeader className="px-3 py-2.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconLink className="!size-5" />
                <span className="text-base font-semibold">ChainLinked</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Sidebar Content - Navigation Groups */}
      <SidebarContent className="px-2 py-2">
        {/* Quick Create Button */}
        <div className="mb-1" data-tour="quick-create">
          <Link
            href="/dashboard/compose"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
          >
            <IconCirclePlusFilled className="size-4" />
            <span>Quick Create</span>
          </Link>
        </div>

        {/* Overview Section - Collapsible */}
        {mounted ? (
          <Collapsible
            open={openSections.overview}
            onOpenChange={() => toggleSection('overview')}
            data-tour="sidebar-overview"
          >
            <SectionHeader
              label="Overview"
              isOpen={openSections.overview}
            />
            <AnimatePresence initial={false}>
              {openSections.overview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: smoothEase }}
                  className="overflow-hidden mt-1 ml-1"
                >
                  {overviewNavItems.map((item, idx) => (
                    <SubNavLink
                      key={item.url}
                      item={item}
                      isLast={idx === overviewNavItems.length - 1}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Collapsible>
        ) : (
          /* Static server-side render to prevent hydration mismatch */
          <div>
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Overview</span>
              <IconChevronRight className="ml-auto size-3.5" />
            </div>
            <div className="mt-1 ml-1">
              {overviewNavItems.map((item, idx) => (
                <SubNavLink key={item.url} item={item} isLast={idx === overviewNavItems.length - 1} />
              ))}
            </div>
          </div>
        )}

        {/* Content Section - Collapsible */}
        {mounted ? (
          <Collapsible
            open={openSections.content}
            onOpenChange={() => toggleSection('content')}
            data-tour="sidebar-content"
          >
            <SectionHeader
              label="Content"
              isOpen={openSections.content}
            />
            <AnimatePresence initial={false}>
              {openSections.content && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: smoothEase }}
                  className="overflow-hidden mt-1 ml-1"
                >
                  {contentNavItems.map((item, idx) => (
                    <SubNavLink
                      key={item.url}
                      item={item}
                      isLast={idx === contentNavItems.length - 1}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Collapsible>
        ) : (
          /* Static server-side render to prevent hydration mismatch */
          <div>
            <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Content</span>
              <IconChevronRight className="ml-auto size-3.5" />
            </div>
            <div className="mt-1 ml-1">
              {contentNavItems.map((item, idx) => (
                <SubNavLink key={item.url} item={item} isLast={idx === contentNavItems.length - 1} />
              ))}
            </div>
          </div>
        )}
      </SidebarContent>

      <SidebarSeparator />

      {/* Sidebar Footer - User profile and actions */}
      <SidebarFooter className="px-3 py-2">
        <NavUser user={userData} onSignOut={signOut} />
      </SidebarFooter>
    </Sidebar>
  )
}
