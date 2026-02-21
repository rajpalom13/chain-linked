"use client"

/**
 * AI Templates Section
 * @description Categorized AI template suggestions with filter pills and grid layout
 * @module components/features/template-library/ai-templates-section
 */

import * as React from "react"
import { IconSparkles } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

import { AI_TEMPLATE_CATEGORIES } from "./constants"
import { AITemplateCard } from "./ai-template-card"
import type { AITemplate } from "./types"

/**
 * Props for the AITemplatesSection component
 */
interface AITemplatesSectionProps {
  /** Callback when using an AI template to create a post */
  onUseAITemplate: (template: AITemplate) => void
  /** Callback when saving an AI template to the user's library */
  onSaveAITemplate: (template: AITemplate) => void
}

/**
 * AI template suggestions section with categorized cards
 * @param props - Component props
 * @returns Flat section with category pills and AI template cards
 */
export function AITemplatesSection({
  onUseAITemplate,
  onSaveAITemplate,
}: AITemplatesSectionProps) {
  const [activeCategory, setActiveCategory] = React.useState<string>("all")

  const filteredCategories = React.useMemo(() => {
    if (activeCategory === "all") return AI_TEMPLATE_CATEGORIES
    return AI_TEMPLATE_CATEGORIES.filter((c) => c.id === activeCategory)
  }, [activeCategory])

  const allTabs = React.useMemo(
    () => [
      { id: "all", label: "All" },
      ...AI_TEMPLATE_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.name,
        icon: c.icon,
        color: c.color,
      })),
    ],
    []
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-violet-500/15 to-purple-500/15 p-2.5">
          <IconSparkles className="size-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">AI Templates</h2>
          <p className="text-muted-foreground text-sm">
            Pre-made templates to jumpstart your content
          </p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {allTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === tab.id
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            {"icon" in tab && tab.icon && (
              <span className={cn("rounded p-0.5", "color" in tab ? tab.color : "")}>
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Template grid by category */}
      <div className="space-y-8">
        {filteredCategories.map((category) => (
          <div key={category.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("rounded-lg p-1.5", category.color)}>
                {category.icon}
              </span>
              <h3 className="text-sm font-semibold">{category.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {category.templates.length}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.templates.map((template) => (
                <AITemplateCard
                  key={template.id}
                  template={template}
                  borderColor={category.borderColor}
                  onUse={onUseAITemplate}
                  onSave={onSaveAITemplate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
