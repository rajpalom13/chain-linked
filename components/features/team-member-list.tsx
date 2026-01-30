/**
 * Team Member List Component
 * @description Displays list of team members with role management
 * @module components/features/team-member-list
 */

'use client'

import * as React from 'react'
import {
  IconCrown,
  IconDotsVertical,
  IconLoader2,
  IconShield,
  IconTrash,
  IconUser,
  IconUserCog,
  IconUsers,
} from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { TeamMemberWithUser } from '@/hooks/use-team'
import type { TeamMemberRole } from '@/types/database'

/**
 * Props for the TeamMemberList component
 */
export interface TeamMemberListProps {
  /** List of team members */
  members: TeamMemberWithUser[]
  /** Loading state */
  isLoading: boolean
  /** Current user's role in the team */
  currentUserRole: TeamMemberRole | null
  /** Callback to remove a member */
  onRemoveMember: (userId: string) => Promise<void>
  /** Callback to change a member's role */
  onRoleChange: (userId: string, role: 'admin' | 'member') => Promise<void>
  /** Custom class name */
  className?: string
}

/**
 * Get initials from a name or email
 * @param name - Name or email to extract initials from
 * @returns Up to 2 character initials
 */
function getInitials(name: string | null, email: string): string {
  const source = name || email.split('@')[0]
  return source
    .split(/[\s._-]/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get display name from user info
 * @param user - User object
 * @returns Display name
 */
function getDisplayName(user: { full_name: string | null; email: string }): string {
  return user.full_name || user.email.split('@')[0]
}

/**
 * Get role badge variant and icon
 * @param role - Team member role
 * @returns Badge props
 */
function getRoleBadgeProps(role: TeamMemberRole) {
  switch (role) {
    case 'owner':
      return {
        variant: 'default' as const,
        icon: IconCrown,
        label: 'Owner',
      }
    case 'admin':
      return {
        variant: 'secondary' as const,
        icon: IconShield,
        label: 'Admin',
      }
    default:
      return {
        variant: 'outline' as const,
        icon: IconUser,
        label: 'Member',
      }
  }
}

/**
 * Team Member List Component
 *
 * Displays a list of team members with their roles.
 * Allows owners to manage member roles and remove members.
 *
 * Features:
 * - Avatar and name display
 * - Role badges
 * - Role management dropdown (for owners)
 * - Member removal with confirmation
 * - Loading state
 *
 * @param props - Component props
 * @returns Team member list JSX
 * @example
 * <TeamMemberList
 *   members={members}
 *   isLoading={false}
 *   currentUserRole="owner"
 *   onRemoveMember={handleRemove}
 *   onRoleChange={handleRoleChange}
 * />
 */
export function TeamMemberList({
  members,
  isLoading,
  currentUserRole,
  onRemoveMember,
  onRoleChange,
  className,
}: TeamMemberListProps) {
  const [memberToRemove, setMemberToRemove] = React.useState<TeamMemberWithUser | null>(null)
  const [isRemoving, setIsRemoving] = React.useState(false)
  const [changingRoleFor, setChangingRoleFor] = React.useState<string | null>(null)

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'
  const canChangeRoles = currentUserRole === 'owner'

  /**
   * Handle role change
   */
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    setChangingRoleFor(userId)
    try {
      await onRoleChange(userId, newRole)
    } finally {
      setChangingRoleFor(null)
    }
  }

  /**
   * Handle member removal confirmation
   */
  const handleConfirmRemove = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      await onRemoveMember(memberToRemove.user_id)
    } finally {
      setIsRemoving(false)
      setMemberToRemove(null)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Empty state
  if (members.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <IconUsers className="size-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">No team members yet</p>
      </div>
    )
  }

  return (
    <>
      <div className={cn('divide-y', className)}>
        {members.map((member) => {
          const roleProps = getRoleBadgeProps(member.role)
          const RoleIcon = roleProps.icon
          const isChangingRole = changingRoleFor === member.user_id
          const canManageThisMember =
            canManageMembers &&
            member.role !== 'owner' &&
            (currentUserRole === 'owner' || member.role === 'member')

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              {/* Avatar */}
              <Avatar className="size-10">
                {member.user.avatar_url ? (
                  <AvatarImage
                    src={member.user.avatar_url}
                    alt={getDisplayName(member.user)}
                  />
                ) : null}
                <AvatarFallback className="text-sm">
                  {getInitials(member.user.full_name, member.user.email)}
                </AvatarFallback>
              </Avatar>

              {/* Member Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {getDisplayName(member.user)}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {member.user.email}
                </p>
              </div>

              {/* Role Badge */}
              <Badge variant={roleProps.variant} className="gap-1 shrink-0">
                <RoleIcon className="size-3" />
                {roleProps.label}
              </Badge>

              {/* Joined Date */}
              <span className="text-xs text-muted-foreground hidden sm:block shrink-0">
                {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
              </span>

              {/* Actions Menu */}
              {canManageThisMember && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      disabled={isChangingRole}
                    >
                      {isChangingRole ? (
                        <IconLoader2 className="size-4 animate-spin" />
                      ) : (
                        <IconDotsVertical className="size-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canChangeRoles && (
                      <>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              member.user_id,
                              member.role === 'admin' ? 'member' : 'admin'
                            )
                          }
                        >
                          <IconUserCog className="size-4 mr-2" />
                          {member.role === 'admin'
                            ? 'Demote to Member'
                            : 'Promote to Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setMemberToRemove(member)}
                    >
                      <IconTrash className="size-4 mr-2" />
                      Remove from team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {memberToRemove
                  ? getDisplayName(memberToRemove.user)
                  : 'this member'}
              </strong>{' '}
              from the team? They will lose access to all team resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <IconLoader2 className="size-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
