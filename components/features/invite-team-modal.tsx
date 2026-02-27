/**
 * Invite Team Modal Component
 * @description Modal for inviting team members via email
 * @module components/features/invite-team-modal
 */

'use client'

import * as React from 'react'
import {
  IconLoader2,
  IconMail,
  IconPlus,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInvitations } from '@/hooks/use-invitations'

/**
 * Props for the InviteTeamModal component
 */
export interface InviteTeamModalProps {
  /** Team ID to send invitations for */
  teamId: string
  /** Team name for display */
  teamName?: string
  /** Custom trigger element (uses Dialog pattern) */
  trigger?: React.ReactNode
  /** Callback fired when invitations are sent successfully */
  onSuccess?: () => void
  /** Custom class name */
  className?: string
}

/**
 * Email entry with validation state
 */
interface EmailEntry {
  id: string
  email: string
  isValid: boolean
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Whether email is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Invite Team Modal Component
 *
 * A modal dialog for inviting new team members via email.
 * Uses the Resend-powered invitation system.
 *
 * Features:
 * - Add multiple email addresses
 * - Role selection (admin/member)
 * - Email validation
 * - Loading state during sending
 * - Error display
 *
 * @param props - Component props
 * @returns Modal dialog JSX
 * @example
 * ```tsx
 * <InviteTeamModal
 *   teamId="team-123"
 *   teamName="Marketing Team"
 *   onSuccess={() => refetch()}
 *   trigger={<Button>Invite</Button>}
 * />
 * ```
 */
export function InviteTeamModal({
  teamId,
  teamName = 'your team',
  trigger,
  onSuccess,
  className,
}: InviteTeamModalProps) {
  const [open, setOpen] = React.useState(false)
  const [emails, setEmails] = React.useState<EmailEntry[]>([
    { id: crypto.randomUUID(), email: '', isValid: false },
  ])
  const [role, setRole] = React.useState<'admin' | 'member'>('member')
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Use invitations hook with proper options object
  const { sendInvitations } = useInvitations({ teamId })

  /**
   * Reset form state
   */
  const resetForm = () => {
    setEmails([{ id: crypto.randomUUID(), email: '', isValid: false }])
    setRole('member')
    setError(null)
  }

  /**
   * Handle modal close
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    setOpen(newOpen)
  }

  /**
   * Add new email entry
   */
  const addEmailEntry = () => {
    setEmails((prev) => [
      ...prev,
      { id: crypto.randomUUID(), email: '', isValid: false },
    ])
  }

  /**
   * Remove email entry
   */
  const removeEmailEntry = (id: string) => {
    setEmails((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((e) => e.id !== id)
    })
  }

  /**
   * Update email entry
   */
  const updateEmailEntry = (id: string, email: string) => {
    setEmails((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, email, isValid: isValidEmail(email) }
          : e
      )
    )
    setError(null)
  }

  /**
   * Handle send invitations
   */
  const handleSend = async () => {
    // Get valid emails
    const validEmails = emails
      .map((e) => e.email.trim())
      .filter((e) => isValidEmail(e))

    if (validEmails.length === 0) {
      setError('Please enter at least one valid email address')
      return
    }

    if (!teamId) {
      setError('Team ID is required to send invitations')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      // Call the hook's sendInvitations with teamId, emails array, and role
      const result = await sendInvitations(teamId, validEmails, role)

      if (result.sent.length > 0) {
        // At least some invitations were sent - close and report success
        handleOpenChange(false)
        onSuccess?.()
      }

      if (result.failed && result.failed.length > 0 && result.sent.length === 0) {
        // Only show error if NO invitations were sent
        const failedMessages = result.failed.map(f => `${f.email}: ${f.reason}`).join(', ')
        setError(failedMessages)
      } else if (result.sent.length === 0 && result.failed.length === 0) {
        setError('Failed to send invitations')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitations')
    } finally {
      setIsSending(false)
    }
  }

  // Check if any valid emails exist
  const hasValidEmails = emails.some((e) => e.isValid)

  const dialogContent = (
    <>
      <DialogHeader>
        <DialogTitle>Invite team members</DialogTitle>
        <DialogDescription>
          Send email invitations to add new members to {teamName}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Email entries */}
        <div className="space-y-3">
          <Label>Email addresses</Label>
          {emails.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2">
              <div className="relative flex-1">
                <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={entry.email}
                  onChange={(e) => updateEmailEntry(entry.id, e.target.value)}
                  className={cn(
                    'pl-10',
                    entry.email && !entry.isValid && 'border-destructive'
                  )}
                  disabled={isSending}
                />
              </div>
              {emails.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmailEntry(entry.id)}
                  disabled={isSending}
                >
                  <IconTrash className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEmailEntry}
            disabled={isSending}
          >
            <IconPlus className="size-4 mr-2" />
            Add another
          </Button>
        </div>

        {/* Role selection */}
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as 'admin' | 'member')}
            disabled={isSending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {role === 'admin'
              ? 'Admins can manage team members and settings'
              : 'Members can view and use team resources'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => handleOpenChange(false)}
          disabled={isSending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={!hasValidEmails || isSending}
        >
          {isSending ? (
            <>
              <IconLoader2 className="size-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <IconUserPlus className="size-4 mr-2" />
              Send invitations
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  )

  // With trigger
  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className={cn('sm:max-w-md', className)}>
          {dialogContent}
        </DialogContent>
      </Dialog>
    )
  }

  // Without trigger (controlled externally)
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        {dialogContent}
      </DialogContent>
    </Dialog>
  )
}
