/**
 * Admin Sidebar Component
 * @description Dedicated sidebar navigation for the admin panel
 * @module components/admin-sidebar
 */

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconArrowLeft,
  IconDashboard,
  IconFileText,
  IconSettings,
  IconShield,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

/**
 * Navigation items for the admin sidebar main section
 */
const adminNavItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: IconDashboard,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: IconUsers,
  },
  {
    title: "Prompts",
    url: "/admin/prompts",
    icon: IconSparkles,
  },
  {
    title: "Content",
    url: "/admin/content",
    icon: IconFileText,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: IconSettings,
  },
]

/**
 * AdminSidebar Component
 *
 * Dedicated sidebar for the admin panel with navigation to all admin sections.
 * Includes a "Back to Dashboard" link and admin branding.
 *
 * @param props - Standard React component props extending Sidebar component props
 * @returns The rendered admin sidebar component
 *
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <AdminSidebar />
 *   <SidebarInset>
 *     <main>Admin content</main>
 *   </SidebarInset>
 * </SidebarProvider>
 * ```
 */
export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* Header with Admin Branding */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/admin">
                <IconShield className="!size-5 text-primary" />
                <span className="text-base font-semibold">Admin Panel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={
                      item.url === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.url)
                    }
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Back to Dashboard */}
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Dashboard">
              <Link href="/dashboard">
                <IconArrowLeft />
                <span>Back to Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
