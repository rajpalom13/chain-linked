/**
 * Invite Teammates Page
 * @description Onboarding page for inviting team members
 * @module app/onboarding/invite
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { IconLoader2 } from '@tabler/icons-react'

import { InviteTeammatesForm } from '@/components/features/invite-teammates-form'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompany } from '@/hooks/use-company'

/**
 * Invite Page Content Component
 *
 * Handles the invitation form with search params.
 * Must be wrapped in Suspense for useSearchParams.
 *
 * @returns Invite page content JSX
 */
function InvitePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company, isLoading: isLoadingCompany } = useCompany()

  // Get team ID and company name from URL params or company data
  const teamIdParam = searchParams.get('teamId')
  const companyNameParam = searchParams.get('company')

  const [teamId, setTeamId] = useState<string | null>(teamIdParam)
  const [companyName, setCompanyName] = useState<string>(companyNameParam || 'your company')

  // Update state when company data loads
  useEffect(() => {
    if (!isLoadingCompany && company) {
      if (company.team?.id) {
        setTeamId(company.team.id)
      }
      setCompanyName(company.name)
    }
  }, [isLoadingCompany, company])

  // Redirect to company setup if no team ID and no company
  useEffect(() => {
    if (!isLoadingCompany && !company && !teamIdParam) {
      router.replace('/onboarding/company')
    }
  }, [isLoadingCompany, company, teamIdParam, router])

  /**
   * Handle invitation completion
   */
  const handleComplete = () => {
    router.push('/dashboard')
  }

  /**
   * Handle skip
   */
  const handleSkip = () => {
    router.push('/dashboard')
  }

  // Show loading state
  if (isLoadingCompany) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if no team ID available
  if (!teamId) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up your team...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-start pt-8 pb-12">
      <InviteTeammatesForm
        teamId={teamId}
        companyName={companyName}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </div>
  )
}

/**
 * Loading fallback for Suspense
 * @returns Loading skeleton JSX
 */
function InvitePageSkeleton() {
  return (
    <div className="flex flex-col items-center justify-start pt-8 pb-12">
      <div className="w-full max-w-lg">
        <div className="border rounded-lg p-6 space-y-6">
          <div className="text-center space-y-4">
            <Skeleton className="mx-auto h-14 w-14 rounded-full" />
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Invite Teammates Page Component
 *
 * Onboarding step 2: Invite team members.
 * Wrapped in Suspense for useSearchParams.
 *
 * @returns Invite teammates page JSX
 */
export default function InviteTeammatesPage() {
  return (
    <Suspense fallback={<InvitePageSkeleton />}>
      <InvitePageContent />
    </Suspense>
  )
}
