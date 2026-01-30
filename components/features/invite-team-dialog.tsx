/**
 * Invite Team Member Dialog
 * @description Dialog for inviting team members via email
 * @module components/features/invite-team-dialog
 */

'use client'

import { useState, useCallback } from 'react'
import {
  IconMail,
  IconUserPlus,
  IconLoader2,
  IconX,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTeamInvitations, type SendInvitationsResult } from '@/hooks/use-team-invitations'
import type { TeamMemberRole } from '@/types/database'

/**
 * Props for InviteTeamDialog
 */
interface InviteTeamDialogProps {
  /** Team ID to invite members to */
  teamId: string | null
  /** Team name for display */
  teamName?: string
  /** Optional trigger element (uses default button if not provided) */
  trigger?: React.ReactNode
  /** Callback when invitations are sent */
  onInvited?: (result: SendInvitationsResult) => void
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
 * Invite Team Member Dialog
 *
 * Allows team admins/owners to invite new members by email.
 * Supports multiple email addresses and role selection.
 *
 * @param props - Component props
 * @returns Dialog component JSX
 */
export function InviteTeamDialog({
  teamId,
  teamName,
  trigger,
  onInvited,
}: InviteTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [role, setRole] = useState<TeamMemberRole>('member')
  const [inputError, setInputError] = useState<string | null>(null)

  const { sendInvitations, isSending } = useTeamInvitations({ teamId })

  /**
   * Add email to the list
   */
  const handleAddEmail = useCallback(() => {
    const email = emailInput.trim().toLowerCase()

    if (!email) {
      return
    }

    if (!isValidEmail(email)) {
      setInputError('Please enter a valid email address')
      return
    }

    if (emails.includes(email)) {
      setInputError('This email is already added')
      return
    }

    setEmails(prev => [...prev, email])
    setEmailInput('')
    setInputError(null)
  }, [emailInput, emails])

  /**
   * Handle key press in email input
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddEmail()
    }
  }, [handleAddEmail])

  /**
   * Remove email from list
   */
  const handleRemoveEmail = useCallback((emailToRemove: string) => {
    setEmails(prev => prev.filter(e => e !== emailToRemove))
  }, [])

  /**
   * Send invitations
   */
  const handleSendInvitations = useCallback(async () => {
    // Add current input if valid
    const allEmails = [...emails]
    if (emailInput.trim()) {
      const email = emailInput.trim().toLowerCase()
      if (isValidEmail(email) && !allEmails.includes(email)) {
        allEmails.push(email)
      }
    }

    if (allEmails.length === 0) {
      setInputError('Please add at least one email address')
      return
    }

    const result = await sendInvitations(allEmails, role)

    if (result.sent.length > 0) {
      toast.success(`Invitations sent to ${result.sent.length} recipient${result.sent.length > 1 ? 's' : ''}`)
    }

    if (result.failed.length > 0) {
      toast.error(`Failed to send ${result.failed.length} invitation${result.failed.length > 1 ? 's' : ''}`, {
        description: result.failed.map(f => `${f.email}: ${f.reason}`).join(', '),
      })
    }

    onInvited?.(result)

    // Close dialog if at least some invitations were sent
    if (result.sent.length > 0) {
      setOpen(false)
      setEmails([])
      setEmailInput('')
      setRole('member')
    }
  }, [emails, emailInput, role, sendInvitations, onInvited])

  /**
   * Reset state when dialog closes
   */
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setEmails([])
      setEmailInput('')
      setRole('member')
      setInputError(null)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <IconUserPlus className="w-4 h-4 mr-2" />
            Invite Members
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconMail className="w-5 h-5" />
            Invite Team Members
          </DialogTitle>
          <DialogDescription>
            {teamName
              ? `Invite people to join ${teamName}. They'll receive an email with a link to join.`
              : 'Send email invitations to join your team.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="email-input">Email addresses</Label>
            <div className="flex gap-2">
              <Input
                id="email-input"
                type="email"
                placeholder="colleague@company.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value)
                  setInputError(null)
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleAddEmail}
                disabled={isSending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEmail}
                disabled={isSending || !emailInput.trim()}
              >
                Add
              </Button>
            </div>
            {inputError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <IconAlertCircle className="w-4 h-4" />
                {inputError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Press Enter or comma to add multiple emails
            </p>
          </div>

          {/* Email badges */}
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emails.map((email) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 flex items-center gap-1"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    disabled={isSending}
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Role selection */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as TeamMemberRole)}
              disabled={isSending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex flex-col items-start">
                    <span>Member</span>
                    <span className="text-xs text-muted-foreground">
                      Can view content and post
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span>Admin</span>
                    <span className="text-xs text-muted-foreground">
                      Can manage team members and settings
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            onClick={handleSendInvitations}
            disabled={isSending || (emails.length === 0 && !emailInput.trim())}
          >
            {isSending ? (
              <>
                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <IconCheck className="w-4 h-4 mr-2" />
                Send Invitation{emails.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
