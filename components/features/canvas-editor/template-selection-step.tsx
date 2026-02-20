/**
 * Template Selection Step
 * @description Step 1 of AI carousel generation - template selection
 * @module components/features/canvas-editor/template-selection-step
 */

'use client'

import { useMemo } from 'react'
import { IconCheck, IconLayoutGrid } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { CanvasTemplate } from '@/types/canvas-editor'

/**
 * Props for TemplateSelectionStep
 */
interface TemplateSelectionStepProps {
  /** Available templates */
  templates: CanvasTemplate[]
  /** Currently selected template */
  selectedTemplate: CanvasTemplate | null
  /** Callback when template is selected */
  onSelect: (template: CanvasTemplate) => void
  /** Callback to proceed to next step */
  onNext: () => void
}

/**
 * Template card component
 */
function TemplateCard({
  template,
  isSelected,
  onClick
}: {
  template: CanvasTemplate
  isSelected: boolean
  onClick: () => void
}) {
  // Get first slide background for preview
  const previewBg = template.defaultSlides[0]?.backgroundColor || '#ffffff'
  const slideCount = template.defaultSlides.length

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative group text-left rounded-lg border-2 overflow-hidden transition-all',
        'hover:border-primary/50 hover:shadow-md',
        isSelected
          ? 'border-primary ring-2 ring-primary ring-offset-2'
          : 'border-border'
      )}
    >
      {/* Template preview */}
      <div
        className="aspect-square flex items-center justify-center"
        style={{ backgroundColor: previewBg }}
      >
        {/* Mini slide preview */}
        <div className="w-3/4 space-y-2">
          {template.defaultSlides.slice(0, 3).map((slide, i) => (
            <div
              key={i}
              className="h-2 rounded-full opacity-60"
              style={{
                backgroundColor: template.brandColors[i % template.brandColors.length],
                width: `${100 - i * 20}%`
              }}
            />
          ))}
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <IconCheck className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Template info */}
      <div className="p-3 bg-background">
        <p className="font-medium text-sm truncate">{template.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {slideCount} slides
          </Badge>
          <span className="text-xs text-muted-foreground">
            {template.category}
          </span>
        </div>
      </div>
    </button>
  )
}

/**
 * Template Selection Step Component
 *
 * Displays a grid of available templates for users to choose from.
 * Shows template previews with color schemes and slide counts.
 *
 * @param props - Component props
 * @returns Step component JSX
 */
export function TemplateSelectionStep({
  templates,
  selectedTemplate,
  onSelect,
  onNext
}: TemplateSelectionStepProps) {
  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, CanvasTemplate[]> = {}

    templates.forEach(template => {
      const category = template.category || 'Other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(template)
    })

    return grouped
  }, [templates])

  const categories = Object.keys(templatesByCategory)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <IconLayoutGrid className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Choose Your Template</h2>
        <p className="text-muted-foreground mt-1">
          Select a template and AI will fill it with your content
        </p>
      </div>

      {/* Template grid */}
      <div className="max-h-[400px] overflow-y-auto pr-4">
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {templatesByCategory[category].map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onClick={() => onSelect(template)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected template info */}
      {selectedTemplate && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: selectedTemplate.brandColors[0] }}
          >
            <span className="text-white font-bold">
              {selectedTemplate.defaultSlides.length}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-medium">{selectedTemplate.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedTemplate.defaultSlides.length} slides •{' '}
              {selectedTemplate.fonts[0] || 'Default'} font
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!selectedTemplate}
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
