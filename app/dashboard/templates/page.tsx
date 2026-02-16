"use client"

/**
 * Templates Page
 * @description Template library for managing reusable LinkedIn post templates
 * @module app/dashboard/templates/page
 */

import { PageContent } from "@/components/shared/page-content"
import { TemplateLibrary } from "@/components/features/template-library"
import { TemplatesSkeleton } from "@/components/skeletons/page-skeletons"
import { useTemplates } from "@/hooks/use-templates"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react"

/**
 * Templates page content component with real data
 */
function TemplatesContent() {
  const {
    templates,
    isLoading,
    error,
    refetch,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
  } = useTemplates()

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-destructive">
              <IconAlertCircle className="h-5 w-5" />
              <span>Failed to load templates: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return <TemplatesSkeleton />
  }

  return (
    <PageContent>
      <TemplateLibrary
        templates={templates}
        onCreateTemplate={createTemplate}
        onEditTemplate={updateTemplate}
        onDeleteTemplate={deleteTemplate}
        onUseTemplate={incrementUsage}
      />
    </PageContent>
  )
}

/**
 * Templates page component
 * @returns Templates page with browsable and searchable template library
 */
export default function TemplatesPage() {
  usePageMeta({ title: "Templates" })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <TemplatesSkeleton /> : <TemplatesContent />
}
