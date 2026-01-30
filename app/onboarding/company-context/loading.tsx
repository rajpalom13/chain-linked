/**
 * Company Context Onboarding Loading State
 * @description Loading skeleton displayed while the company context page loads
 * @module app/onboarding/company-context/loading
 */

import { IconLoader2 } from "@tabler/icons-react"

/**
 * Loading component for company context onboarding page
 * @returns Loading skeleton JSX
 */
export default function CompanyContextLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="flex flex-col items-center gap-4">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading company context...</p>
      </div>
    </div>
  )
}
