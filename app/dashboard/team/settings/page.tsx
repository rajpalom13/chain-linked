/**
 * Team Settings Page
 * @description Team management page for members, invitations, and settings
 * @module app/dashboard/team/settings
 */

'use client'

import { PageContent } from "@/components/shared/page-content"
import { TeamManagement } from '@/components/features/team-management'
import { usePageMeta } from '@/lib/dashboard-context'

/**
 * Team Settings page component
 * @returns Team settings page with member and invitation management
 */
export default function TeamSettingsPage() {
  usePageMeta({ title: "Team Settings" })

  return (
    <PageContent>
      <TeamManagement />
    </PageContent>
  )
}
