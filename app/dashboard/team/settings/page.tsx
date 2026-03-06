/**
 * Team Settings Page
 * @description Team management page for members, invitations, and team settings
 * @module app/dashboard/team/settings
 */

'use client'

import { useCallback } from 'react'
import { IconUsers, IconSettings } from '@tabler/icons-react'

import { PageContent } from "@/components/shared/page-content"
import { TeamManagement } from '@/components/features/team-management'
import { TeamSettingsPanel } from '@/components/features/team-settings-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePageMeta } from '@/lib/dashboard-context'
import { useTeam } from '@/hooks/use-team'

/**
 * Team Settings page component
 * @description Renders a tabbed layout with Members management and Team Settings panels.
 * Members tab wraps the existing TeamManagement component; Settings tab renders
 * the new TeamSettingsPanel with inline name editing and danger zone.
 * @returns Team settings page JSX
 */
export default function TeamSettingsPage() {
  usePageMeta({ title: "Team Settings" })

  const {
    currentTeam,
    currentUserRole,
    updateTeam,
    refetchTeams,
  } = useTeam()

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  /**
   * Handle updating team name via the settings panel
   * @param name - New team name
   */
  const handleUpdateTeamName = useCallback(async (name: string) => {
    if (!currentTeam) return
    await updateTeam(currentTeam.id, { name })
    await refetchTeams()
  }, [currentTeam, updateTeam, refetchTeams])

  /**
   * Handle deleting the team via the settings panel
   */
  const handleDeleteTeam = useCallback(async () => {
    if (!currentTeam) return
    const response = await fetch(`/api/teams?id=${currentTeam.id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete team')
    }
    await refetchTeams()
  }, [currentTeam, refetchTeams])

  return (
    <PageContent>
      <Tabs defaultValue="members">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="members" className="gap-2">
            <IconUsers className="size-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <IconSettings className="size-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <TeamManagement />
        </TabsContent>


        <TabsContent value="settings" className="mt-6">
          {currentTeam ? (
            <div className="max-w-2xl">
              <TeamSettingsPanel
                team={currentTeam}
                currentUserRole={currentUserRole}
                canManage={canManage}
                onUpdateTeamName={handleUpdateTeamName}
                onDeleteTeam={handleDeleteTeam}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No team selected.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </PageContent>
  )
}
