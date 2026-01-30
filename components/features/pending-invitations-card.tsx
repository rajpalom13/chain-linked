/**
 * Pending Invitations Card Component
 * @description Displays pending team invitations with resend/cancel actions
 * @module components/features/pending-invitations-card
 */

'use client'

import { useState } from 'react'
import {
  IconMail,
  IconClock,
  IconRefresh,
  IconX,
  IconLoader2,
  IconUserPlus,
  IconMailFast,
} from '@tabler/icons-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { TeamMemberRole } from '@/types/database'

/**
 * Pending invitation data structure
 */
export interface PendingInvitation {
  id: string
  email: string
  role: TeamMemberRole
  created_at: string
  expires_at: string
  invited_by: {
    full_name: string | null
    email: string
  }
}

/**
 * Props for PendingInvitationsCard
 */
interface PendingInvitationsCardProps {
  /** List of pending invitations */
  invitations: PendingInvitation[]
  /** Loading state */
  isLoading?: boolean
  /** Team ID for actions */
  teamId: string
  /** Whether user can manage invitations */
  canManage?: boolean
  /** Callback when invitation is resent */
  onResend?: (invitationId: string) => Promise<boolean>
  /** Callback when invitation is cancelled */
  onCancel?: (invitationId: string) => Promise<boolean>
  /** Compact mode for overview */
  compact?: boolean
}

/**
 * Format relative time
 * @param dateString - ISO date string
 * @returns Relative time string
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  }
  return 'Just now'
}

/**
 * Check if invitation is expiring soon (within 24 hours)
 * @param expiresAt - Expiration date string
 * @returns Whether invitation expires soon
 */
function isExpiringSoon(expiresAt: string): boolean {
  const expires = new Date(expiresAt)
  const now = new Date()
  const diffMs = expires.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours < 24 && diffHours > 0
}

/**
 * Single invitation item
 */
function InvitationItem({
  invitation,
  canManage,
  onResend,
  onCancel,
}: {
  invitation: PendingInvitation
  canManage: boolean
  onResend?: (id: string) => Promise<boolean>
  onCancel?: (id: string) => Promise<boolean>
}) {
  const [isResending, setIsResending] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const expiringSoon = isExpiringSoon(invitation.expires_at)

  const handleResend = async () => {
    if (!onResend) return
    setIsResending(true)
    try {
      const success = await onResend(invitation.id)
      if (success) {
        toast.success(`Invitation resent to ${invitation.email}`)
      } else {
        toast.error('Failed to resend invitation')
      }
    } finally {
      setIsResending(false)
    }
  }

  const handleCancel = async () => {
    if (!onCancel) return
    setIsCancelling(true)
    try {
      const success = await onCancel(invitation.id)
      if (success) {
        toast.success(`Invitation to ${invitation.email} cancelled`)
      } else {
        toast.error('Failed to cancel invitation')
      }
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <IconMail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{invitation.email}</p>
            <Badge variant="outline" className="text-xs capitalize">
              {invitation.role}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <IconClock className="h-3 w-3" />
              Sent {formatRelativeTime(invitation.created_at)}
            </span>
            {expiringSoon && (
              <span className="text-amber-600 dark:text-amber-400">
                Expires soon
              </span>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending || isCancelling}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            {isResending ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4" />
            )}
            <span className="sr-only md:not-sr-only md:ml-1">Resend</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isResending || isCancelling}
                className="h-8 px-2 text-muted-foreground hover:text-destructive"
              >
                {isCancelling ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconX className="h-4 w-4" />
                )}
                <span className="sr-only md:not-sr-only md:ml-1">Cancel</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel the invitation to{' '}
                  <span className="font-medium">{invitation.email}</span>?
                  They will no longer be able to join the team using this link.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Cancel Invitation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

/**
 * Loading skeleton for invitations
 */
function InvitationsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-4 border rounded-lg">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state when no invitations
 */
function EmptyInvitations({ canManage }: { canManage: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <IconMailFast className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        {canManage
          ? 'No pending invitations. Invite teammates to get started!'
          : 'No pending invitations'}
      </p>
    </div>
  )
}

/**
 * Pending Invitations Card Component
 *
 * Shows pending team invitations with actions to resend or cancel.
 *
 * @param props - Component props
 * @returns Pending invitations card JSX
 */
export function PendingInvitationsCard({
  invitations,
  isLoading,
  teamId,
  canManage = false,
  onResend,
  onCancel,
  compact = false,
}: PendingInvitationsCardProps) {
  const displayedInvitations = compact ? invitations.slice(0, 3) : invitations
  const hasMore = compact && invitations.length > 3

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">
              Pending Invitations
            </CardTitle>
            {invitations.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {invitations.length}
              </Badge>
            )}
          </div>
          {compact && hasMore && (
            <Button variant="link" size="sm" className="text-xs h-auto p-0">
              View all
            </Button>
          )}
        </div>
        {!compact && (
          <CardDescription>
            People who have been invited to join the team
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <InvitationsSkeleton count={compact ? 2 : 3} />
        ) : invitations.length === 0 ? (
          <EmptyInvitations canManage={canManage} />
        ) : (
          <div className="space-y-2">
            {displayedInvitations.map((invitation) => (
              <InvitationItem
                key={invitation.id}
                invitation={invitation}
                canManage={canManage}
                onResend={onResend}
                onCancel={onCancel}
              />
            ))}
            {hasMore && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{invitations.length - 3} more invitations
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
