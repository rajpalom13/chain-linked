/**
 * No Team State Component
 * @description Empty state when user has no team
 * @module components/features/no-team-state
 */

'use client'

import { useState } from 'react'
import { IconUsers, IconUserPlus, IconMail, IconPlus, IconLoader2 } from '@tabler/icons-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

/**
 * Props for NoTeamState component
 */
interface NoTeamStateProps {
  /** Callback when team is created */
  onCreateTeam?: (name: string) => Promise<boolean>
  /** Loading state for creation */
  isCreating?: boolean
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
 * No Team State Component
 *
 * Shows when user doesn't belong to any team with options to create or join.
 *
 * @param props - Component props
 * @returns No team state JSX
 */
export function NoTeamState({ onCreateTeam, isCreating }: NoTeamStateProps) {
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
            Create a team to collaborate with colleagues, track performance together,
            and share content inspiration.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <CreateTeamDialog onCreateTeam={onCreateTeam} isCreating={isCreating} />
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2 text-left">
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
