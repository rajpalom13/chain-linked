/**
 * Team Members Preview Component
 * @description Quick preview of team members with avatar stack
 * @module components/features/team-members-preview
 */

'use client'

import { IconCrown, IconShieldCheck, IconUser } from '@tabler/icons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getInitials } from '@/lib/utils'
import type { TeamMemberWithUser } from '@/hooks/use-team'

/**
 * Props for TeamMembersPreview
 */
interface TeamMembersPreviewProps {
  /** List of team members */
  members: TeamMemberWithUser[]
  /** Loading state */
  isLoading?: boolean
  /** Maximum members to show before "+X more" */
  maxDisplay?: number
  /** Current user ID to highlight */
  currentUserId?: string
  /** Callback when "View all" clicked */
  onViewAll?: () => void
}


/**
 * Get role icon and color
 * @param role - Member role
 * @returns Icon component and color class
 */
function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return { icon: IconCrown, colorClass: 'text-amber-500' }
    case 'admin':
      return { icon: IconShieldCheck, colorClass: 'text-blue-500' }
    default:
      return { icon: IconUser, colorClass: 'text-muted-foreground' }
  }
}

/**
 * Single member item in the preview
 */
function MemberItem({
  member,
  isCurrentUser,
}: {
  member: TeamMemberWithUser
  isCurrentUser: boolean
}) {
  const { icon: RoleIcon, colorClass } = getRoleIcon(member.role)
  const displayName = member.user.full_name || member.user.email.split('@')[0]

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-9 w-9">
        {member.user.avatar_url && (
          <AvatarImage src={member.user.avatar_url} alt={displayName} />
        )}
        <AvatarFallback className="text-xs">
          {getInitials(member.user.full_name || member.user.email)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {displayName}
          </span>
          {isCurrentUser && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              You
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RoleIcon className={`h-3 w-3 ${colorClass}`} />
          <span className="capitalize">{member.role}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Avatar stack for compact view
 */
function AvatarStack({
  members,
  maxDisplay,
}: {
  members: TeamMemberWithUser[]
  maxDisplay: number
}) {
  const displayMembers = members.slice(0, maxDisplay)
  const remaining = members.length - maxDisplay

  return (
    <TooltipProvider>
      <div className="flex -space-x-2">
        {displayMembers.map((member) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 border-2 border-background">
                {member.user.avatar_url && (
                  <AvatarImage
                    src={member.user.avatar_url}
                    alt={member.user.full_name || member.user.email}
                  />
                )}
                <AvatarFallback className="text-xs">
                  {getInitials(member.user.full_name || member.user.email)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{member.user.full_name || member.user.email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {member.role}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remaining > 0 && (
          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
            +{remaining}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

/**
 * Loading skeleton
 */
function MembersSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Team Members Preview Component
 *
 * Shows a quick preview of team members with role badges.
 *
 * @param props - Component props
 * @returns Team members preview JSX
 */
export function TeamMembersPreview({
  members,
  isLoading,
  maxDisplay = 5,
  currentUserId,
  onViewAll,
}: TeamMembersPreviewProps) {
  const displayMembers = members.slice(0, maxDisplay)
  const hasMore = members.length > maxDisplay

  // Sort to show owner first, then admins, then members
  const sortedMembers = [...displayMembers].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 }
    return (roleOrder[a.role] || 2) - (roleOrder[b.role] || 2)
  })

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Team Members
          </CardTitle>
          {!isLoading && members.length > 0 && (
            <AvatarStack members={members} maxDisplay={6} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <MembersSkeleton count={4} />
        ) : members.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No team members yet
          </div>
        ) : (
          <>
            <div className="divide-y">
              {sortedMembers.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  isCurrentUser={member.user_id === currentUserId}
                />
              ))}
            </div>
            {hasMore && onViewAll && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-muted-foreground"
                onClick={onViewAll}
              >
                View all {members.length} members
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
