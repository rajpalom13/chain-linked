'use client';

/**
 * Templates Panel Component
 * Inline template browser for the editor left panel
 * @module components/features/canvas-editor/panel-templates
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconSearch,
  IconEye,
  IconPalette,
  IconUser,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { canvasTemplates, getTemplatesByCategory } from '@/lib/canvas-templates';
import { useCarouselTemplates } from '@/hooks/use-carousel-templates';
import { useBrandKitTemplates } from '@/hooks/use-brand-kit-templates';
import { staggerGridContainerVariants } from '@/lib/animations';
import type { CanvasTemplate, TemplateCategory } from '@/types/canvas-editor';

const CATEGORIES: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold' },
];

/**
 * Props for the PanelTemplates component
 */
interface PanelTemplatesProps {
  onSelectTemplate: (template: CanvasTemplate) => void;
  onOpenFullPreview: () => void;
}

/**
 * Inline template browser panel
 * Shows brand, saved, and built-in templates with search and category filtering
 * @param props - Component props
 * @returns Template browser panel JSX
 */
export function PanelTemplates({
  onSelectTemplate,
  onOpenFullPreview,
}: PanelTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  const { brandTemplates, hasBrandKit } = useBrandKitTemplates();
  const { savedTemplates, fetchTemplates, toCanvasTemplate } = useCarouselTemplates();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  /**
   * Handle template card click
   */
  const handleSelect = useCallback(
    (template: CanvasTemplate) => {
      onSelectTemplate(template);
      toast.success(`Applied template: ${template.name}`);
    },
    [onSelectTemplate]
  );

  // Filter templates
  const baseTemplates =
    selectedCategory === 'all' ? canvasTemplates : getTemplatesByCategory(selectedCategory);

  const filteredTemplates = searchQuery.trim()
    ? baseTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : baseTemplates;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Templates</h3>
        <div className="relative mt-2">
          <IconSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="shrink-0 flex flex-wrap gap-1 px-4 py-2">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            className="cursor-pointer text-[10px] px-2 py-0"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Template content */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea className="absolute inset-0">
          <div className="space-y-4 px-4 pb-4">
            {/* Brand templates */}
            {hasBrandKit && brandTemplates.length > 0 && selectedCategory === 'all' && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <IconPalette className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Your Brand</span>
                </div>
                <TemplateGrid templates={brandTemplates} onSelect={handleSelect} />
              </div>
            )}

            {/* Saved templates */}
            {savedTemplates.length > 0 && selectedCategory === 'all' && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <IconUser className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">My Templates</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {savedTemplates.length}
                  </Badge>
                </div>
                <TemplateGrid
                  templates={savedTemplates.map(toCanvasTemplate)}
                  onSelect={handleSelect}
                />
              </div>
            )}

            {/* Built-in templates */}
            <div>
              {(savedTemplates.length > 0 || (hasBrandKit && brandTemplates.length > 0)) &&
                selectedCategory === 'all' && (
                  <span className="mb-2 block text-xs font-medium text-muted-foreground">
                    Built-in Templates
                  </span>
                )}
              <TemplateGrid templates={filteredTemplates} onSelect={handleSelect} />
            </div>

            {filteredTemplates.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No templates found
              </p>
            )}

            {/* Full preview link */}
            <button
              type="button"
              onClick={onOpenFullPreview}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
            >
              <IconEye className="h-3.5 w-3.5" />
              Full Preview Browser
            </button>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

/**
 * Grid of mini template cards
 */
function TemplateGrid({
  templates,
  onSelect,
}: {
  templates: CanvasTemplate[];
  onSelect: (template: CanvasTemplate) => void;
}) {
  return (
    <motion.div
      variants={staggerGridContainerVariants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 gap-2"
    >
      {templates.map((template) => (
        <MiniTemplateCard key={template.id} template={template} onClick={() => onSelect(template)} />
      ))}
    </motion.div>
  );
}

/**
 * Mini template card showing a scaled-down thumbnail of the first slide
 * @param props.template - The canvas template to preview
 * @param props.onClick - Callback when the card is clicked
 */
function MiniTemplateCard({
  template,
  onClick,
}: {
  template: CanvasTemplate;
  onClick: () => void;
}) {
  const firstSlide = template.defaultSlides[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg hover:border-primary/40 hover:scale-[1.02]"
    >
      {/* Slide thumbnail preview - shows actual first slide content */}
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ backgroundColor: firstSlide?.backgroundColor || '#f5f5f5' }}
      >
        {firstSlide && (
          <div className="relative h-full w-full origin-top-left" style={{ transform: 'scale(0.13)' }}>
            {firstSlide.elements.map((element) => {
              if (element.type === 'text') {
                return (
                  <div
                    key={element.id}
                    className="absolute overflow-hidden whitespace-pre-wrap"
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      color: element.fill,
                      fontSize: element.fontSize,
                      fontWeight: element.fontWeight,
                      textAlign: element.align,
                      transform: `rotate(${element.rotation}deg)`,
                      lineHeight: element.lineHeight || 1.2,
                    }}
                  >
                    {element.text}
                  </div>
                );
              }
              if (element.type === 'shape') {
                return (
                  <div
                    key={element.id}
                    className="absolute"
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      backgroundColor: element.fill === 'transparent' ? 'transparent' : element.fill,
                      borderRadius: element.shapeType === 'circle' ? '50%' : element.cornerRadius || 0,
                      transform: `rotate(${element.rotation}deg)`,
                      border: element.stroke ? `${element.strokeWidth || 1}px solid ${element.stroke}` : undefined,
                    }}
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Template name overlaid at bottom */}
        <div className="absolute inset-x-0 bottom-0 px-2.5 py-2">
          <p className="text-[11px] font-medium text-white truncate drop-shadow-sm">
            {template.name}
          </p>
        </div>

        {/* Slide count badge - top right */}
        <div className="absolute right-1.5 top-1.5">
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-background/80 backdrop-blur-sm shadow-sm">
            {template.defaultSlides.length}
          </Badge>
        </div>
      </div>
    </button>
  );
}
