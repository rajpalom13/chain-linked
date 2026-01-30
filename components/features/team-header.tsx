/**
 * Team Header Component
 * @description Header for team page with team info and invite button
 * @module components/features/team-header
 */

'use client'

import { IconUsers, IconSettings, IconUserPlus, IconCalendar } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { InviteTeamDialog } from './invite-team-dialog'
import type { TeamWithMeta } from '@/hooks/use-team'
import type { TeamMemberRole } from '@/types/database'

/**
 * Props for TeamHeader component
 */
interface TeamHeaderProps {
  /** Team data */
  team: TeamWithMeta
  /** Current user's role */
  userRole: TeamMemberRole | null
  /** Number of pending invitations */
  pendingInvitationsCount?: number
  /** Callback when settings clicked */
  onSettingsClick?: () => void
  /** Callback when invitations sent */
  onInvitationsSent?: () => void
}

/**
 * Format date to readable string
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Team Header Component
 *
 * Displays team info with prominent invite button for owners/admins.
 *
 * @param props - Component props
 * @returns Team header JSX
 */
export function TeamHeader({
  team,
  userRole,
  pendingInvitationsCount = 0,
  onSettingsClick,
  onInvitationsSent,
}: TeamHeaderProps) {
  const canInvite = userRole === 'owner' || userRole === 'admin'
  const canManage = userRole === 'owner' || userRole === 'admin'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 md:p-6 border-b bg-card">
      <div className="flex items-center gap-4">
        {/* Team Avatar/Logo */}
        <Avatar className="h-14 w-14 border-2 border-primary/10">
          {team.logo_url ? (
            <AvatarImage src={team.logo_url} alt={team.name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {team.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Team Info */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <IconUsers className="h-4 w-4" />
              {team.member_count} member{team.member_count !== 1 ? 's' : ''}
            </span>
            {pendingInvitationsCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <IconUserPlus className="h-4 w-4" />
                {pendingInvitationsCount} pending
              </span>
            )}
            <span className="flex items-center gap-1">
              <IconCalendar className="h-4 w-4" />
              Created {formatDate(team.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconSettings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSettingsClick}>
                Team Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Leave Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {canInvite && (
          <InviteTeamDialog
            teamId={team.id}
            teamName={team.name}
            onInvited={onInvitationsSent}
            trigger={
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <IconUserPlus className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
