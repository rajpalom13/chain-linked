/**
 * Invite Teammates Form Component
 * @description Form for inviting team members via email during onboarding
 * @module components/features/invite-teammates-form
 */

'use client'

import * as React from 'react'
import {
  IconCheck,
  IconLoader2,
  IconMail,
  IconPlus,
  IconSend,
  IconTrash,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInvitations, type SendInvitationsResult } from '@/hooks/use-invitations'
import type { TeamMemberRole } from '@/types/database'

/**
 * Props for the InviteTeammatesForm component
 */
export interface InviteTeammatesFormProps {
  /** Team ID to send invitations for */
  teamId: string
  /** Company name for display */
  companyName: string
  /** Callback fired when invitations are sent successfully */
  onComplete: () => void
  /** Callback fired when user chooses to skip */
  onSkip: () => void
  /** Custom class name */
  className?: string
}

/**
 * Email input state
 */
interface EmailInput {
  id: string
  email: string
  role: TeamMemberRole
  error?: string
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
 * Generate unique ID
 * @returns Unique string ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Invite Teammates Form Component
 *
 * A form for inviting team members via email during onboarding.
 * Supports multiple email inputs, role selection, and bulk invitations.
 *
 * Features:
 * - Multiple email input fields with individual validation
 * - Role selection per invite (admin/member)
 * - Add/remove email rows dynamically
 * - Bulk invitation sending
 * - Success/failure feedback per email
 * - Skip option to complete later
 *
 * @param props - Component props
 * @returns Invite teammates form JSX
 * @example
 * ```tsx
 * <InviteTeammatesForm
 *   teamId="uuid-123"
 *   companyName="Acme Inc"
 *   onComplete={() => router.push('/dashboard')}
 *   onSkip={() => router.push('/dashboard')}
 * />
 * ```
 */
export function InviteTeammatesForm({
  teamId,
  companyName,
  onComplete,
  onSkip,
  className,
}: InviteTeammatesFormProps) {
  const { sendInvitations, isLoading } = useInvitations({ teamId })

  // Form state
  const [emailInputs, setEmailInputs] = React.useState<EmailInput[]>([
    { id: generateId(), email: '', role: 'member' },
  ])
  const [isSending, setIsSending] = React.useState(false)
  const [sendResult, setSendResult] = React.useState<SendInvitationsResult | null>(null)
  const [generalError, setGeneralError] = React.useState<string | null>(null)

  /**
   * Add new email input row
   */
  const handleAddRow = () => {
    setEmailInputs(prev => [
      ...prev,
      { id: generateId(), email: '', role: 'member' },
    ])
  }

  /**
   * Remove email input row
   * @param id - Row ID to remove
   */
  const handleRemoveRow = (id: string) => {
    if (emailInputs.length === 1) return
    setEmailInputs(prev => prev.filter(input => input.id !== id))
  }

  /**
   * Update email value
   * @param id - Row ID
   * @param email - New email value
   */
  const handleEmailChange = (id: string, email: string) => {
    setEmailInputs(prev =>
      prev.map(input =>
        input.id === id ? { ...input, email, error: undefined } : input
      )
    )
    setSendResult(null)
  }

  /**
   * Update role value
   * @param id - Row ID
   * @param role - New role value
   */
  const handleRoleChange = (id: string, role: TeamMemberRole) => {
    setEmailInputs(prev =>
      prev.map(input =>
        input.id === id ? { ...input, role } : input
      )
    )
  }

  /**
   * Validate all email inputs
   * @returns Whether all emails are valid
   */
  const validateEmails = (): boolean => {
    let isValid = true
    const seenEmails = new Set<string>()

    setEmailInputs(prev =>
      prev.map(input => {
        const email = input.email.trim().toLowerCase()

        // Skip empty emails (they won't be sent)
        if (!email) {
          return input
        }

        // Check format
        if (!isValidEmail(email)) {
          isValid = false
          return { ...input, error: 'Invalid email format' }
        }

        // Check duplicates
        if (seenEmails.has(email)) {
          isValid = false
          return { ...input, error: 'Duplicate email' }
        }

        seenEmails.add(email)
        return { ...input, error: undefined }
      })
    )

    return isValid
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)
    setSendResult(null)

    // Validate emails
    if (!validateEmails()) {
      return
    }

    // Filter out empty emails and group by role
    const validInputs = emailInputs.filter(input => input.email.trim())

    if (validInputs.length === 0) {
      setGeneralError('Please enter at least one email address')
      return
    }

    setIsSending(true)

    try {
      // Send invitations grouped by role for efficiency
      const adminEmails = validInputs
        .filter(input => input.role === 'admin')
        .map(input => input.email.trim())

      const memberEmails = validInputs
        .filter(input => input.role === 'member')
        .map(input => input.email.trim())

      const results: SendInvitationsResult = {
        success: true,
        sent: [],
        failed: [],
      }

      // Send admin invitations
      if (adminEmails.length > 0) {
        const adminResult = await sendInvitations(teamId, adminEmails, 'admin')
        results.sent.push(...adminResult.sent)
        results.failed.push(...adminResult.failed)
      }

      // Send member invitations
      if (memberEmails.length > 0) {
        const memberResult = await sendInvitations(teamId, memberEmails, 'member')
        results.sent.push(...memberResult.sent)
        results.failed.push(...memberResult.failed)
      }

      results.success = results.failed.length === 0

      setSendResult(results)

      // Update input errors based on results
      if (results.failed.length > 0) {
        const failedMap = new Map(results.failed.map(f => [f.email.toLowerCase(), f.reason]))
        setEmailInputs(prev =>
          prev.map(input => {
            const failReason = failedMap.get(input.email.trim().toLowerCase())
            return failReason ? { ...input, error: failReason } : input
          })
        )
      }

      // Complete the flow if at least some invitations were sent
      if (results.sent.length > 0) {
        setTimeout(() => {
          onComplete()
        }, 1500) // Brief delay to show success state
      }
    } catch (err) {
      console.error('Send invitations error:', err)
      setGeneralError(err instanceof Error ? err.message : 'Failed to send invitations')
    } finally {
      setIsSending(false)
    }
  }

  const hasEmails = emailInputs.some(input => input.email.trim())
  const allEmpty = emailInputs.every(input => !input.email.trim())

  return (
    <Card className={cn('w-full max-w-lg', className)}>
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <IconUserPlus className="h-8 w-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Invite your team</CardTitle>
          <CardDescription className="mt-2">
            Invite teammates to collaborate on {companyName}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Inputs */}
          <div className="space-y-3">
            <Label>Team member emails</Label>
            {emailInputs.map((input, index) => (
              <div key={input.id} className="flex gap-2">
                <div className="relative flex-1">
                  <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={input.email}
                    onChange={(e) => handleEmailChange(input.id, e.target.value)}
                    disabled={isSending}
                    autoFocus={index === 0}
                    className={cn(
                      'pl-10',
                      input.error && 'border-destructive'
                    )}
                  />
                </div>
                <Select
                  value={input.role}
                  onValueChange={(value: TeamMemberRole) => handleRoleChange(input.id, value)}
                  disabled={isSending}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                {emailInputs.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(input.id)}
                    disabled={isSending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <IconTrash className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {emailInputs.map(input =>
              input.error ? (
                <p key={`error-${input.id}`} className="text-xs text-destructive -mt-2">
                  {input.email}: {input.error}
                </p>
              ) : null
            )}
          </div>

          {/* Add More Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={isSending}
            className="w-full"
          >
            <IconPlus className="size-4" />
            Add another email
          </Button>

          {/* Role Legend */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">Admin</Badge>
              <span>Can invite members & manage team</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">Member</Badge>
              <span>Can view & collaborate</span>
            </div>
          </div>

          {/* Error/Success Messages */}
          {generalError && (
            <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
              <IconX className="size-4" />
              {generalError}
            </div>
          )}

          {sendResult && (
            <div className="space-y-2">
              {sendResult.sent.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <IconCheck className="size-4" />
                  {sendResult.sent.length} invitation{sendResult.sent.length !== 1 ? 's' : ''} sent successfully
                </div>
              )}
              {sendResult.failed.length > 0 && (
                <div className="text-sm text-destructive">
                  <p className="font-medium">Some invitations failed:</p>
                  <ul className="list-disc list-inside text-xs mt-1">
                    {sendResult.failed.map(({ email, reason }) => (
                      <li key={email}>{email}: {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isSending || allEmpty}
            >
              {isSending ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : sendResult?.success ? (
                <IconCheck className="mr-2 h-4 w-4" />
              ) : (
                <IconSend className="mr-2 h-4 w-4" />
              )}
              {isSending
                ? 'Sending invitations...'
                : sendResult?.success
                ? 'Invitations sent!'
                : `Send invitation${hasEmails && emailInputs.filter(i => i.email.trim()).length !== 1 ? 's' : ''}`}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onSkip}
              disabled={isSending}
            >
              {hasEmails ? "I'll invite more later" : 'Skip for now'}
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground">
            Your teammates will receive an email with an invitation link.
            <br />
            You can always invite more people later from Settings.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
