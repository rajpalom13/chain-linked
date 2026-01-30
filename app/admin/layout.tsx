/**
 * Admin Layout
 * @description Layout wrapper for all admin panel pages with dedicated sidebar and header
 * @module app/admin/layout
 */

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { ADMIN_EMAILS } from "@/lib/admin/constants"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { IconShield } from "@tabler/icons-react"

/**
 * AdminLayout Component
 *
 * Wraps all admin pages with the admin sidebar, header, and admin access check.
 * Redirects non-admin users to the dashboard.
 *
 * @param props - Layout props
 * @param props.children - Child page content
 * @returns Admin layout with sidebar and access control
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading: authLoading } = useAuthContext()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  /**
   * Check if the current user has admin access.
   * Redirects to /dashboard if the user is not an admin.
   */
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    const email = user.email || ""
    const isAdmin = ADMIN_EMAILS.includes(email)

    if (!isAdmin) {
      router.push("/dashboard")
      return
    }

    setIsAuthorized(true)
    setCheckingAuth(false)
  }, [user, authLoading, router])

  if (authLoading || checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        {/* Admin Header */}
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
          <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4"
              />
              <h1 className="text-base font-medium">Admin Panel</h1>
            </div>
            <Badge
              variant="outline"
              className="gap-1 border-primary/30 bg-primary/5 text-primary"
            >
              <IconShield className="size-3" />
              Admin
            </Badge>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
