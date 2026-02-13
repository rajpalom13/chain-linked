"use client"

/**
 * Prompt Playground Page
 * @description Dashboard page for prompt iteration and testing
 * @module app/dashboard/prompts/page
 */

import { PageContent } from "@/components/shared/page-content"
import { PromptPlayground } from "@/components/features/prompt-playground"
import { Skeleton } from "@/components/ui/skeleton"
import { usePageMeta } from "@/lib/dashboard-context"
import { useAuthContext } from "@/lib/auth/auth-provider"

/**
 * Prompt playground page content
 */
function PromptPlaygroundContent() {
  return (
    <PageContent>
      <PromptPlayground />
    </PageContent>
  )
}

/**
 * Prompt playground page component
 * @returns Prompt playground dashboard page
 */
export default function PromptPlaygroundPage() {
  usePageMeta({ title: "Prompt Playground" })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  ) : (
    <PromptPlaygroundContent />
  )
}
