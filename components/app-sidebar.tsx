/**
 * App Sidebar Component
 * @description Main navigation sidebar for the ChainLinked application
 * @module components/app-sidebar
 */

"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconCalendar,
  IconChartBar,
  IconCompass,
  IconDashboard,
  IconHelp,
  IconLink,
  IconPencil,
  IconPresentation,
  IconSettings,
  IconSparkles,
  IconSwipe,
  IconTemplate,
  IconUsers,
} from "@tabler/icons-react"

import { NavContent } from "@/components/nav-content"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { LinkedInStatusBadge } from "@/components/features/linkedin-status-badge"

/**
 * Static navigation data for the ChainLinked application sidebar.
 * This data structure defines the complete navigation hierarchy.
 */
const navigationData = {
  /**
   * Main navigation items - primary app features.
   * These are always visible in the sidebar.
   */
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: IconChartBar,
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
  ],

  /**
   * Content section navigation - collapsible group for content management.
   * Includes templates, inspiration, discover, swipe interface, and carousel management.
   */
  navContent: [
    {
      title: "Templates",
      url: "/dashboard/templates",
      icon: IconTemplate,
    },
    {
      title: "Prompt Playground",
      url: "/dashboard/prompts",
      icon: IconSparkles,
    },
    {
      title: "Inspiration",
      url: "/dashboard/inspiration",
      icon: IconSparkles,
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
  ],

  /**
   * Secondary navigation items - utility and support links.
   * Positioned at the bottom of the sidebar content area.
   */
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Help",
      url: "#",
      icon: IconHelp,
    },
  ],
}

/**
 * ChainLinked Application Sidebar Component
 *
 * The main navigation sidebar for the ChainLinked LinkedIn content management platform.
 * Provides access to all major features including:
 * - Dashboard and analytics
 * - Content composition and scheduling
 * - Team collaboration
 * - Content templates and inspiration
 * - Settings and help
 *
 * Uses real user data from auth context including LinkedIn profile information.
 *
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <AppSidebar />
 *   <SidebarInset>
 *     <main>Page content</main>
 *   </SidebarInset>
 * </SidebarProvider>
 * ```
 *
 * @param props - Standard React component props extending Sidebar component props
 * @returns The rendered sidebar component with full navigation structure
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, profile, signOut, isLoading } = useAuthContext()

  /**
   * Derive user display data from auth context
   * Prioritizes LinkedIn profile data, falls back to Supabase user data
   * Always ensures user metadata is available as final fallback
   */
  const userData = React.useMemo(() => {
    if (!user) {
      return {
        name: "Guest",
        email: "",
        avatar: "",
        headline: undefined,
      }
    }

    // Get name: LinkedIn raw_data.name > profile.full_name > profile.name > user metadata > email
    const linkedInName = profile?.linkedin_profile?.raw_data?.name
    const profileFullName = profile?.full_name
    const profileName = profile?.name
    const metadataName = user.user_metadata?.name || user.user_metadata?.full_name
    const emailName = user.email?.split('@')[0] || 'User'

    const name = linkedInName || profileFullName || profileName || metadataName || emailName

    // Get avatar: LinkedIn profilePhotoUrl > profile.linkedin_avatar_url > profile.avatar_url > profile_picture_url > user metadata
    const linkedInAvatar = profile?.linkedin_profile?.raw_data?.profilePhotoUrl ||
                          profile?.linkedin_profile?.profile_picture_url ||
                          profile?.linkedin_avatar_url // From profiles table (saved during OAuth)
    const profileAvatar = profile?.avatar_url
    const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture

    const avatar = linkedInAvatar || profileAvatar || metadataAvatar || ""

    // Get headline from LinkedIn profile or profiles table
    const headline = profile?.linkedin_profile?.headline ||
                     profile?.linkedin_profile?.raw_data?.headline ||
                     profile?.linkedin_headline // From profiles table

    return {
      name: name as string,
      email: user.email || "",
      avatar: avatar as string,
      headline: headline as string | undefined,
    }
  }, [user, profile])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* Sidebar Header - Company Branding */}
      <SidebarHeader>
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
        {/* LinkedIn Connection Status Indicator */}
        <div className="px-2 pb-1">
          <LinkedInStatusBadge variant="dot" showReconnect />
        </div>
      </SidebarHeader>

      {/* Sidebar Content - Navigation Groups */}
      <SidebarContent id="sidebar-navigation">
        {/* Main Navigation - Primary features */}
        <NavMain items={navigationData.navMain} />

        {/* Content Section - Collapsible content management */}
        <NavContent
          items={navigationData.navContent}
          label="Content"
          defaultOpen={true}
        />

        {/* Secondary Navigation - Settings and support */}
        <NavSecondary items={navigationData.navSecondary} className="mt-auto" />
      </SidebarContent>

      {/* Sidebar Footer - User profile and actions */}
      <SidebarFooter>
        <NavUser user={userData} onSignOut={signOut} />
      </SidebarFooter>
    </Sidebar>
  )
}
