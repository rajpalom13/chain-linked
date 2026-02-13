"use client"

/**
 * Settings Page
 * @description Application settings for configuring user preferences and account options
 * @module app/dashboard/settings/page
 */

import { PageContent } from "@/components/shared/page-content"
import { Settings } from "@/components/features/settings"
import { SettingsSkeleton } from "@/components/skeletons/page-skeletons"
import { useSettings } from "@/hooks/use-settings"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react"
import { usePageMeta } from "@/lib/dashboard-context"

/**
 * Settings page content component with real data
 */
function SettingsContent() {
  const {
    user,
    linkedinConnected,
    linkedinProfile,
    teamMembers,
    isLoading,
    error,
    refetch,
    updateProfile,
    updateTeamMemberRole,
  } = useSettings()

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-destructive">
              <IconAlertCircle className="h-5 w-5" />
              <span>Failed to load settings: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return <SettingsSkeleton />
  }

  // Transform team members for Settings component
  const settingsTeamMembers = teamMembers.map(member => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    avatarUrl: member.avatarUrl,
  }))

  // Transform LinkedIn profile for Settings component
  // Note: Some fields come from raw_data captured by the extension
  const rawData = linkedinProfile?.raw_data as Record<string, unknown> | null
  const settingsLinkedinProfile = linkedinProfile ? {
    name: (rawData?.name as string) ||
          (linkedinProfile.first_name && linkedinProfile.last_name
            ? `${linkedinProfile.first_name} ${linkedinProfile.last_name}`
            : linkedinProfile.first_name || undefined),
    headline: linkedinProfile.headline || (rawData?.headline as string | undefined),
    profileUrl: (rawData?.profileUrl as string | undefined) ||
                (linkedinProfile.public_identifier
                  ? `https://www.linkedin.com/in/${linkedinProfile.public_identifier}`
                  : undefined),
    location: linkedinProfile.location || (rawData?.location as string | undefined),
    industry: linkedinProfile.industry || (rawData?.industry as string | undefined),
    about: linkedinProfile.summary || (rawData?.about as string | undefined),
    avatarUrl: linkedinProfile.profile_picture_url || (rawData?.profilePhotoUrl as string | undefined),
    backgroundImageUrl: linkedinProfile.background_image_url || (rawData?.backgroundPhotoUrl as string | undefined),
    followersCount: linkedinProfile.followers_count ?? undefined,
    connectionsCount: linkedinProfile.connections_count ?? undefined,
    currentCompany: rawData?.currentCompany as string | undefined,
    education: rawData?.education as string | undefined,
    lastSynced: linkedinProfile.updated_at || linkedinProfile.captured_at || undefined,
  } : undefined

  return (
    <PageContent>
      <Settings
        user={user ? {
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        } : undefined}
        linkedinConnected={linkedinConnected}
        linkedinProfile={settingsLinkedinProfile}
        teamMembers={settingsTeamMembers}
        onSave={async (settings) => {
          // Handle save based on section
          if (settings.section === 'profile' && settings.profile) {
            const profile = settings.profile as { name: string; email: string }
            await updateProfile({ name: profile.name, email: profile.email })
          } else if (settings.section === 'team' && settings.team) {
            // Team updates are handled inline via role changes
            console.log('Team settings saved:', settings)
          } else {
            console.log('Settings saved:', settings)
          }
        }}
      />
    </PageContent>
  )
}

/**
 * Settings page component
 * @returns Settings page with user preferences and account configuration options
 */
export default function SettingsPage() {
  usePageMeta({ title: "Settings" })

  return <SettingsContent />
}
