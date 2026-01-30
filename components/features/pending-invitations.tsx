/**
 * Pending Invitations Component
 * @description Displays and manages pending team invitations
 * @module components/features/pending-invitations
 */

'use client'

import * as React from 'react'
import {
  IconClock,
  IconDotsVertical,
  IconLoader2,
  IconMail,
  IconMailForward,
  IconShield,
  IconUser,
  IconX,
} from '@tabler/icons-react'
import { formatDistanceToNow, format, isPast } from 'date-fns'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toast } from 'sonner'
import type { TeamInvitationEnriched } from '@/hooks/use-team-invitations'

/**
 * Props for the PendingInvitations component
 */
export interface PendingInvitationsProps {
  /** List of invitations */
  invitations: TeamInvitationEnriched[]
  /** Loading state */
  isLoading: boolean
  /** Whether user can manage invitations */
  canManage: boolean
  /** Callback to cancel an invitation */
  onCancel: (invitationId: string) => Promise<boolean>
  /** Callback to resend an invitation */
  onResend: (invitationId: string) => Promise<boolean>
  /** Custom class name */
  className?: string
}

/**
 * Get status badge variant
 * @param status - Invitation status
 * @param isExpired - Whether invitation is expired
 * @returns Badge variant and color
 */
function getStatusBadge(status: string, isExpired: boolean) {
  if (isExpired || status === 'expired') {
    return {
      variant: 'destructive' as const,
      label: 'Expired',
    }
  }

  switch (status) {
    case 'pending':
      return {
        variant: 'secondary' as const,
        label: 'Pending',
      }
    case 'accepted':
      return {
        variant: 'default' as const,
        label: 'Accepted',
      }
    case 'cancelled':
      return {
        variant: 'outline' as const,
        label: 'Cancelled',
      }
    default:
      return {
        variant: 'outline' as const,
        label: status,
      }
  }
}

/**
 * Pending Invitations Component
 *
 * Displays a list of pending team invitations with management options.
 *
 * Features:
 * - Shows invitation email and role
 * - Status badges (pending, expired, accepted)
 * - Cancel invitation option
 * - Resend invitation option
 * - Loading state
 *
 * @param props - Component props
 * @returns Pending invitations list JSX
 * @example
 * <PendingInvitations
 *   invitations={invitations}
 *   isLoading={false}
 *   canManage={true}
 *   onCancel={handleCancel}
 *   onResend={handleResend}
 * />
 */
export function PendingInvitations({
  invitations,
  isLoading,
  canManage,
  onCancel,
  onResend,
  className,
}: PendingInvitationsProps) {
  const [cancellingId, setCancellingId] = React.useState<string | null>(null)
  const [resendingId, setResendingId] = React.useState<string | null>(null)
  const [invitationToCancel, setInvitationToCancel] = React.useState<TeamInvitationEnriched | null>(null)

  /**
   * Handle resend invitation
   */
  const handleResend = async (invitation: TeamInvitationEnriched) => {
    setResendingId(invitation.id)
    try {
      const success = await onResend(invitation.id)
      if (success) {
        toast.success('Invitation resent', {
          description: `New invitation email sent to ${invitation.email}`,
        })
      } else {
        toast.error('Failed to resend invitation')
      }
    } finally {
      setResendingId(null)
    }
  }

  /**
   * Handle cancel confirmation
   */
  const handleConfirmCancel = async () => {
    if (!invitationToCancel) return

    setCancellingId(invitationToCancel.id)
    try {
      const success = await onCancel(invitationToCancel.id)
      if (success) {
        toast.success('Invitation cancelled', {
          description: `Invitation to ${invitationToCancel.email} has been cancelled`,
        })
      } else {
        toast.error('Failed to cancel invitation')
      }
    } finally {
      setCancellingId(null)
      setInvitationToCancel(null)
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

  // Filter to only pending invitations for display
  const pendingInvitations = invitations.filter(
    inv => inv.status === 'pending' && !inv.is_expired
  )
  const expiredInvitations = invitations.filter(
    inv => inv.status === 'expired' || inv.is_expired
  )

  // Empty state
  if (invitations.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <IconMail className="size-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">No pending invitations</p>
        <p className="text-muted-foreground text-xs mt-1">
          Invite team members to get started
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Pending ({pendingInvitations.length})
            </h4>
            <div className="divide-y rounded-lg border">
              {pendingInvitations.map((invitation) => {
                const isActioning = cancellingId === invitation.id || resendingId === invitation.id
                const expiresAt = new Date(invitation.expires_at)
                const isExpiringSoon = !isPast(expiresAt) &&
                  (expiresAt.getTime() - Date.now()) < 2 * 24 * 60 * 60 * 1000 // 2 days

                return (
                  <div
                    key={invitation.id}
                    className="flex items-center gap-3 p-3"
                  >
                    {/* Email Icon */}
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <IconMail className="size-5 text-muted-foreground" />
                    </div>

                    {/* Invitation Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{invitation.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {invitation.role === 'admin' ? (
                            <IconShield className="size-3" />
                          ) : (
                            <IconUser className="size-3" />
                          )}
                          {invitation.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                        <span className="text-muted-foreground/50">-</span>
                        <span className={cn(
                          'flex items-center gap-1',
                          isExpiringSoon && 'text-amber-600'
                        )}>
                          <IconClock className="size-3" />
                          Expires {formatDistanceToNow(expiresAt, { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge variant="secondary" className="shrink-0">
                      Pending
                    </Badge>

                    {/* Actions */}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            disabled={isActioning}
                          >
                            {isActioning ? (
                              <IconLoader2 className="size-4 animate-spin" />
                            ) : (
                              <IconDotsVertical className="size-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleResend(invitation)}
                          >
                            <IconMailForward className="size-4 mr-2" />
                            Resend invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setInvitationToCancel(invitation)}
                          >
                            <IconX className="size-4 mr-2" />
                            Cancel invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Expired Invitations */}
        {expiredInvitations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Expired ({expiredInvitations.length})
            </h4>
            <div className="divide-y rounded-lg border border-dashed opacity-60">
              {expiredInvitations.map((invitation) => {
                const isActioning = resendingId === invitation.id

                return (
                  <div
                    key={invitation.id}
                    className="flex items-center gap-3 p-3"
                  >
                    {/* Email Icon */}
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <IconMail className="size-5 text-muted-foreground" />
                    </div>

                    {/* Invitation Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{invitation.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {invitation.role === 'admin' ? (
                            <IconShield className="size-3" />
                          ) : (
                            <IconUser className="size-3" />
                          )}
                          {invitation.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                        <span className="text-muted-foreground/50">-</span>
                        <span>
                          Expired {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge variant="destructive" className="shrink-0">
                      Expired
                    </Badge>

                    {/* Resend Action */}
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResend(invitation)}
                        disabled={isActioning}
                      >
                        {isActioning ? (
                          <IconLoader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            <IconMailForward className="size-4 mr-2" />
                            Resend
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!invitationToCancel}
        onOpenChange={(open) => !open && setInvitationToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{' '}
              <strong>{invitationToCancel?.email}</strong>? They will no longer
              be able to join the team using the existing link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!cancellingId}>
              Keep invitation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={!!cancellingId}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancellingId ? (
                <>
                  <IconLoader2 className="size-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel invitation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
