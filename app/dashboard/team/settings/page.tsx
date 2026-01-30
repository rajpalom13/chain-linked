/**
 * Team Settings Page
 * @description Team management page for members, invitations, and settings
 * @module app/dashboard/team/settings
 */

'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { TeamManagement } from '@/components/features/team-management'
import { SiteHeader } from '@/components/site-header'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

/**
 * Team Settings page component
 * @returns Team settings page with member and invitation management
 */
export default function TeamSettingsPage() {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Team Settings" />
        <main id="main-content" className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-500">
              <TeamManagement />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
