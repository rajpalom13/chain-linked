/**
 * No Team State Component
 * @description Empty state when user has no team. Shows pending join request
 * status for individual users, and team creation for organization users.
 * @module components/features/no-team-state
 */

'use client'

import { useState } from 'react'
import {
  IconUsers,
  IconUserPlus,
  IconMail,
  IconPlus,
  IconLoader2,
  IconClock,
  IconSearch,
} from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useJoinRequests, type JoinRequest } from '@/hooks/use-join-requests'
import { TeamSearch, type TeamSearchResult } from '@/components/features/team-search'

/**
 * Props for NoTeamState component
 */
interface NoTeamStateProps {
  /** Callback when team is created */
  onCreateTeam?: (name: string) => Promise<boolean>
  /** Loading state for creation */
  isCreating?: boolean
  /** User onboarding type: 'owner' or 'member' */
  onboardingType?: string | null
}

/**
 * Create Team Dialog
 */
function CreateTeamDialog({
  onCreateTeam,
  isCreating,
}: {
  onCreateTeam?: (name: string) => Promise<boolean>
  isCreating?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!teamName.trim()) {
      setError('Please enter a team name')
      return
    }

    if (teamName.length < 2) {
      setError('Team name must be at least 2 characters')
      return
    }

    if (onCreateTeam) {
      const success = await onCreateTeam(teamName.trim())
      if (success) {
        toast.success('Team created successfully!')
        setOpen(false)
        setTeamName('')
      } else {
        setError('Failed to create team. Please try again.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <IconPlus className="h-5 w-5" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            Create a New Team
          </DialogTitle>
          <DialogDescription>
            Start a team to collaborate with colleagues on LinkedIn content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              placeholder="e.g., Marketing Team"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value)
                setError(null)
              }}
              disabled={isCreating}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !teamName.trim()}>
              {isCreating ? (
                <>
                  <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Pending Join Request Banner
 * @param props.request - The pending join request
 * @param props.onCancel - Callback to cancel the request
 */
function PendingRequestBanner({
  request,
  onCancel,
  isCancelling,
}: {
  request: JoinRequest
  onCancel: () => Promise<void>
  isCancelling: boolean
}) {
  const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: true })

  return (
    <div className="w-full max-w-lg mx-auto mb-8">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500/10 p-2 shrink-0">
            <IconClock className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Join Request Pending
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your request to join <span className="font-medium text-foreground">{request.team_name || 'the team'}</span> is
              waiting for approval.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-400 border-amber-500/30">
                <IconClock className="size-3 mr-1" />
                Submitted {timeAgo}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <IconLoader2 className="size-3 animate-spin mr-1" />
                ) : null}
                Cancel Request
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * No Team State Component
 *
 * Shows when user doesn't belong to any team.
 * - For 'member' users: shows pending request status and option to find a team
 * - For 'owner' users: shows create team option
 *
 * @param props - Component props
 * @returns No team state JSX
 */
export function NoTeamState({ onCreateTeam, isCreating, onboardingType }: NoTeamStateProps) {
  const { myPendingRequest, isLoading: requestLoading, cancelRequest, submitRequest } = useJoinRequests()
  const [isCancelling, setIsCancelling] = useState(false)
  const [showTeamSearch, setShowTeamSearch] = useState(false)
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false)
  const isMember = onboardingType === 'member'

  const handleCancel = async () => {
    setIsCancelling(true)
    await cancelRequest()
    setIsCancelling(false)
  }

  const handleSelectTeam = async (team: TeamSearchResult) => {
    setIsSubmittingJoin(true)
    try {
      await submitRequest(team.id)
      toast.success(`Join request sent to ${team.name}`)
      setShowTeamSearch(false)
    } catch {
      toast.error('Failed to send join request. Please try again.')
    } finally {
      setIsSubmittingJoin(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-lg w-full text-center">
        {/* Illustration */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <IconUsers className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            You&apos;re not part of a team yet
          </h2>
          <p className="text-muted-foreground">
            {isMember
              ? 'Find your organization\u2019s team and request to join, or wait for an invitation from your team admin.'
              : 'Create a team to collaborate with colleagues, track performance together, and share content inspiration.'
            }
          </p>
        </div>

        {/* Pending Join Request Banner */}
        {!requestLoading && myPendingRequest && (
          <PendingRequestBanner
            request={myPendingRequest}
            onCancel={handleCancel}
            isCancelling={isCancelling}
          />
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          {!isMember && (
            <CreateTeamDialog onCreateTeam={onCreateTeam} isCreating={isCreating} />
          )}
          {!myPendingRequest && (
            <Dialog open={showTeamSearch} onOpenChange={setShowTeamSearch}>
              <DialogTrigger asChild>
                <Button variant={isMember ? 'default' : 'outline'} size="lg" className="gap-2">
                  <IconSearch className="h-5 w-5" />
                  Find Your Team
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <IconSearch className="h-5 w-5" />
                    Find Your Team
                  </DialogTitle>
                  <DialogDescription>
                    Search for your organization&apos;s team and send a join request.
                  </DialogDescription>
                </DialogHeader>
                <TeamSearch
                  onSelectTeam={handleSelectTeam}
                  className="py-2"
                />
                {isSubmittingJoin && (
                  <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                    <IconLoader2 className="size-4 animate-spin mr-2" />
                    Sending join request...
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Info Cards */}
        <div className={`grid gap-4 text-left ${isMember ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
          {!isMember && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <IconUserPlus className="h-4 w-4 text-primary" />
                  Create a Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Start your own team and invite colleagues to join.
                  You&apos;ll be the team owner with full management access.
                </CardDescription>
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconSearch className="h-4 w-4 text-primary" />
                Find &amp; Join a Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Search for your organization&apos;s team and send a join request.
                A team admin will review and approve your request.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconMail className="h-4 w-4 text-primary" />
                Join via Invitation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Ask a team owner or admin to send you an invitation.
                You&apos;ll receive an email with a link to join.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
