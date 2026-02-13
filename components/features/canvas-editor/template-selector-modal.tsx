'use client';

/**
 * Template Selector Modal
 * Modal for choosing and applying carousel templates
 * Features favorites, recently used, preview, and category filtering
 * Includes Framer Motion animations for tab switching and card interactions
 * @module components/features/canvas-editor/template-selector-modal
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCheck,
  IconBriefcase,
  IconSparkles,
  IconMinimize,
  IconBolt,
  IconStar,
  IconStarFilled,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconHeart,
  IconUser,
  IconTrash,
  IconLoader2,
  IconPalette,
} from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { canvasTemplates, getTemplatesByCategory } from '@/lib/canvas-templates';
import { useCarouselTemplates } from '@/hooks/use-carousel-templates';
import { useBrandKitTemplates } from '@/hooks/use-brand-kit-templates';
import type { CanvasTemplate, TemplateCategory, CanvasSlide } from '@/types/canvas-editor';

const FAVORITES_STORAGE_KEY = 'chainlinked-template-favorites';
const RECENT_STORAGE_KEY = 'chainlinked-template-recent';
const MAX_RECENT = 5;

/**
 * Props for the TemplateSelectorModal component
 */
interface TemplateSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: CanvasTemplate) => void;
}

/**
 * Tab configuration for the animated tab bar
 */
type TabValue = 'all' | TemplateCategory | 'my-templates';

/**
 * Tab definition with value, label, and icon
 */
interface TabDefinition {
  value: TabValue;
  label: string;
  icon: React.ReactNode;
}

/**
 * Animated tab bar items
 */
const tabs: TabDefinition[] = [
  { value: 'all', label: 'All', icon: <IconSparkles className="h-4 w-4" /> },
  { value: 'professional', label: 'Professional', icon: <IconBriefcase className="h-4 w-4" /> },
  { value: 'creative', label: 'Creative', icon: <IconSparkles className="h-4 w-4" /> },
  { value: 'minimal', label: 'Minimal', icon: <IconMinimize className="h-4 w-4" /> },
  { value: 'bold', label: 'Bold', icon: <IconBolt className="h-4 w-4" /> },
  { value: 'brand', label: 'Your Brand', icon: <IconPalette className="h-4 w-4" /> },
  { value: 'my-templates', label: 'My Templates', icon: <IconUser className="h-4 w-4" /> },
];

/**
 * Category configuration with icons
 */
const categoryConfig: Record<
  TemplateCategory,
  { label: string; icon: React.ReactNode; description: string }
> = {
  professional: {
    label: 'Professional',
    icon: <IconBriefcase className="h-4 w-4" />,
    description: 'Clean, business-focused designs',
  },
  creative: {
    label: 'Creative',
    icon: <IconSparkles className="h-4 w-4" />,
    description: 'Bold and colorful designs',
  },
  minimal: {
    label: 'Minimal',
    icon: <IconMinimize className="h-4 w-4" />,
    description: 'Simple and elegant designs',
  },
  bold: {
    label: 'Bold',
    icon: <IconBolt className="h-4 w-4" />,
    description: 'Modern high-impact designs',
  },
  brand: {
    label: 'Your Brand',
    icon: <IconPalette className="h-4 w-4" />,
    description: 'Templates using your brand kit',
  },
};

/**
 * Load favorite template IDs from localStorage
 * @returns Array of favorite template IDs
 */
function loadFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save favorite template IDs to localStorage
 * @param favorites - Array of favorite template IDs
 */
function saveFavorites(favorites: string[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    console.warn('Failed to save template favorites');
  }
}

/**
 * Load recently used template IDs from localStorage
 * @returns Array of recently used template IDs (most recent first)
 */
function loadRecentlyUsed(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a template ID as recently used
 * @param templateId - Template ID to add to recent list
 */
function saveRecentlyUsed(templateId: string): void {
  try {
    const recent = loadRecentlyUsed();
    const updated = [templateId, ...recent.filter((id) => id !== templateId)].slice(
      0,
      MAX_RECENT
    );
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn('Failed to save recently used template');
  }
}

/**
 * Mini slide preview component for templates
 * @param props - Component props
 * @param props.slide - The slide to preview
 * @returns JSX element rendering a miniature slide preview
 */
function TemplateSlidePreview({ slide }: { slide: CanvasSlide }) {
  return (
    <div
      className="aspect-square w-full overflow-hidden rounded"
      style={{ backgroundColor: slide.backgroundColor }}
    >
      <div className="relative h-full w-full scale-[0.06] transform-gpu origin-top-left">
        {slide.elements.map((element) => {
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
                  borderRadius:
                    element.shapeType === 'circle' ? '50%' : element.cornerRadius || 0,
                  transform: `rotate(${element.rotation}deg)`,
                  border: element.stroke ? `${element.strokeWidth || 1}px solid ${element.stroke}` : undefined,
                  boxSizing: 'border-box',
                }}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

/**
 * Color thumbnail for a template, showing its brand colors
 * @param props - Component props
 * @param props.template - Template to show colors for
 * @returns JSX element with color swatch
 */
function TemplateColorThumbnail({ template }: { template: CanvasTemplate }) {
  const colors = template.brandColors.slice(0, 4);
  return (
    <div className="relative flex h-20 w-full overflow-hidden rounded-lg group/thumb">
      {colors.map((color, i) => (
        <div
          key={i}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100" />
    </div>
  );
}

/**
 * Template card component with favorite toggle and preview button
 * Uses Framer Motion for hover animations
 * @param props - Component props
 * @param props.template - The template to display
 * @param props.isSelected - Whether this template is currently selected
 * @param props.isFavorite - Whether this template is favorited
 * @param props.onSelect - Callback for selecting the template
 * @param props.onToggleFavorite - Callback for toggling favorite status
 * @param props.onPreview - Callback for previewing the template
 * @returns JSX element rendering a template card
 */
function TemplateCard({
  template,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onPreview,
}: {
  template: CanvasTemplate;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onPreview: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border-2 bg-card transition-all duration-200',
        'hover:shadow-xl',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <IconCheck className="h-4 w-4" />
        </div>
      )}

      {/* Favorite button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          'absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors',
          isFavorite
            ? 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30'
            : 'bg-background/80 text-muted-foreground hover:text-yellow-500'
        )}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? (
          <IconStarFilled className="h-4 w-4" />
        ) : (
          <IconStar className="h-4 w-4" />
        )}
      </button>

      {/* Clickable area for selection */}
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-col"
      >
        {/* Color thumbnail */}
        <div className="p-2 pb-0">
          <TemplateColorThumbnail template={template} />
        </div>

        {/* Slide previews */}
        <div className="grid grid-cols-3 gap-1 p-2">
          {template.defaultSlides.slice(0, 3).map((slide, index) => (
            <TemplateSlidePreview key={index} slide={slide} />
          ))}
        </div>

        {/* Template info */}
        <div className="flex flex-col gap-1 border-t p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-left">{template.name}</h4>
            <Badge variant="secondary" className="text-xs">
              {template.defaultSlides.length} slides
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground text-left line-clamp-2">
            {template.description}
          </p>

          {/* Color palette preview */}
          <div className="mt-2 flex gap-1">
            {template.brandColors.slice(0, 5).map((color, index) => (
              <div
                key={index}
                className="h-4 w-4 rounded-full border border-border/50"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </button>

      {/* Preview button */}
      <div className="border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          <IconEye className="mr-1.5 h-3.5 w-3.5" />
          Preview
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Template Preview Panel
 * Shows a larger preview of template slides with navigation
 * @param props - Component props
 * @param props.template - Template to preview
 * @param props.onClose - Callback to close the preview
 * @param props.onApply - Callback to apply the template
 * @returns JSX element rendering a larger slide preview
 */
function TemplatePreviewPanel({
  template,
  onClose,
  onApply,
}: {
  template: CanvasTemplate;
  onClose: () => void;
  onApply: () => void;
}) {
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const currentSlide = template.defaultSlides[previewSlideIndex];

  /**
   * Navigate to the previous slide
   */
  const handlePrevSlide = () => {
    setPreviewSlideIndex((prev) =>
      prev > 0 ? prev - 1 : template.defaultSlides.length - 1
    );
  };

  /**
   * Navigate to the next slide
   */
  const handleNextSlide = () => {
    setPreviewSlideIndex((prev) =>
      prev < template.defaultSlides.length - 1 ? prev + 1 : 0
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{template.name}</h3>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Back to Templates
        </Button>
      </div>

      {/* Large preview */}
      <div className="relative aspect-square w-full max-w-[500px] mx-auto overflow-hidden rounded-lg border">
        <div
          className="h-full w-full"
          style={{ backgroundColor: currentSlide.backgroundColor }}
        >
          <div className="relative h-full w-full scale-[0.46] transform-gpu origin-top-left">
            {currentSlide.elements.map((element) => {
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
                      fontStyle: element.fontStyle || 'normal',
                      textAlign: element.align,
                      transform: `rotate(${element.rotation}deg)`,
                      lineHeight: element.lineHeight || 1.2,
                      letterSpacing: element.letterSpacing || 0,
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
                      borderRadius:
                        element.shapeType === 'circle' ? '50%' : element.cornerRadius || 0,
                      transform: `rotate(${element.rotation}deg)`,
                      border: element.stroke ? `${element.strokeWidth || 1}px solid ${element.stroke}` : undefined,
                      boxSizing: 'border-box',
                    }}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          type="button"
          onClick={handlePrevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow hover:bg-background"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleNextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow hover:bg-background"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Slide indicators */}
      <div className="flex items-center justify-center gap-2">
        {template.defaultSlides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setPreviewSlideIndex(index)}
            className={cn(
              'h-2 w-2 rounded-full transition-all',
              index === previewSlideIndex
                ? 'bg-primary w-6'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
          />
        ))}
      </div>

      {/* Apply button */}
      <Button onClick={onApply} className="w-full">
        Use This Template
      </Button>
    </div>
  );
}

/**
 * Template section header
 * @param props - Component props
 * @param props.icon - Icon element to display
 * @param props.title - Section title text
 * @param props.count - Optional count badge
 * @returns JSX element rendering a section header
 */
function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-sm font-semibold">{title}</h3>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      )}
    </div>
  );
}

/**
 * Saved template card with delete button
 * Uses Framer Motion for hover animations
 * Displays a user-saved template with a delete action overlay
 * @param props - Component props
 * @param props.template - The CanvasTemplate to display
 * @param props.isSelected - Whether this card is currently selected
 * @param props.onSelect - Callback when the card is clicked
 * @param props.onPreview - Callback for the preview action
 * @param props.onDelete - Callback to delete this saved template
 * @param props.isDeleting - Whether a delete operation is in progress
 * @returns JSX element rendering a saved template card
 */
function SavedTemplateCard({
  template,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
  isDeleting,
}: {
  template: CanvasTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border-2 bg-card transition-all duration-200',
        'hover:shadow-xl',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <IconCheck className="h-4 w-4" />
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
        className={cn(
          'absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors',
          'bg-background/80 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground'
        )}
        aria-label="Delete saved template"
      >
        {isDeleting ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconTrash className="h-4 w-4" />
        )}
      </button>

      {/* Clickable area for selection */}
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-col"
      >
        {/* Color thumbnail */}
        <div className="p-2 pb-0">
          <TemplateColorThumbnail template={template} />
        </div>

        {/* Slide previews */}
        <div className="grid grid-cols-3 gap-1 p-2">
          {template.defaultSlides.slice(0, 3).map((slide, index) => (
            <TemplateSlidePreview key={index} slide={slide} />
          ))}
        </div>

        {/* Template info */}
        <div className="flex flex-col gap-1 border-t p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-left">{template.name}</h4>
            <Badge variant="secondary" className="text-xs">
              {template.defaultSlides.length} slides
            </Badge>
          </div>
          {template.description && (
            <p className="text-xs text-muted-foreground text-left line-clamp-2">
              {template.description}
            </p>
          )}

          {/* Color palette preview */}
          {template.brandColors.length > 0 && (
            <div className="mt-2 flex gap-1">
              {template.brandColors.slice(0, 5).map((color, index) => (
                <div
                  key={index}
                  className="h-4 w-4 rounded-full border border-border/50"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Preview button */}
      <div className="border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          <IconEye className="mr-1.5 h-3.5 w-3.5" />
          Preview
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Template Selector Modal
 * Displays available templates organized by category with favorites and recently used sections
 * Includes a "My Templates" tab for user-saved templates
 * Features animated tab bar with Framer Motion sliding indicator and content transitions
 * @param props - Component props
 * @param props.open - Whether the modal is open
 * @param props.onOpenChange - Callback for open state changes
 * @param props.onSelectTemplate - Callback for template selection
 * @returns JSX element rendering the template selector modal
 */
export function TemplateSelectorModal({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateSelectorModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CanvasTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CanvasTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<TabValue>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // Brand kit templates hook
  const { brandTemplates, isLoading: isLoadingBrand, hasBrandKit } = useBrandKitTemplates();

  // Saved templates hook
  const {
    savedTemplates,
    isLoading: isLoadingSaved,
    fetchTemplates,
    deleteTemplate,
    incrementUsage,
    toCanvasTemplate,
  } = useCarouselTemplates();

  /**
   * Load favorites, recently used, and saved templates when modal opens
   */
  useEffect(() => {
    if (open) {
      setFavorites(loadFavorites());
      setRecentlyUsed(loadRecentlyUsed());
      setShowFavoritesOnly(false);
      fetchTemplates();
    }
  }, [open, fetchTemplates]);

  /**
   * Toggle a template's favorite status
   * @param templateId - ID of template to toggle
   */
  const toggleFavorite = useCallback(
    (templateId: string) => {
      setFavorites((prev) => {
        const updated = prev.includes(templateId)
          ? prev.filter((id) => id !== templateId)
          : [...prev, templateId];
        saveFavorites(updated);
        return updated;
      });
    },
    []
  );

  const categoryTemplates =
    activeCategory === 'all' || activeCategory === 'my-templates' || activeCategory === 'brand'
      ? canvasTemplates
      : getTemplatesByCategory(activeCategory);

  const filteredTemplates = showFavoritesOnly
    ? categoryTemplates.filter((t) => favorites.includes(t.id))
    : categoryTemplates;

  /**
   * Resolve template IDs to template objects
   * @param ids - Array of template IDs
   * @returns Array of matching templates
   */
  const resolveTemplates = (ids: string[]): CanvasTemplate[] => {
    return ids
      .map((id) => canvasTemplates.find((t) => t.id === id))
      .filter((t): t is CanvasTemplate => t !== undefined);
  };

  const favoriteTemplates = resolveTemplates(favorites);
  const recentTemplates = resolveTemplates(recentlyUsed);

  /**
   * Handle template selection
   * @param template - Template that was selected
   */
  const handleSelectTemplate = (template: CanvasTemplate) => {
    setSelectedTemplate(template);
  };

  /**
   * Handle applying the selected template
   */
  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      saveRecentlyUsed(selectedTemplate.id);
      // Increment usage if it is a saved template
      const savedMatch = savedTemplates.find((s) => s.id === selectedTemplate.id);
      if (savedMatch) {
        incrementUsage(savedMatch.id);
      }
      onSelectTemplate(selectedTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
      setPreviewTemplate(null);
    }
  };

  /**
   * Handle applying a template from the preview panel
   */
  const handleApplyFromPreview = () => {
    if (previewTemplate) {
      saveRecentlyUsed(previewTemplate.id);
      // Increment usage if it is a saved template
      const savedMatch = savedTemplates.find((s) => s.id === previewTemplate.id);
      if (savedMatch) {
        incrementUsage(savedMatch.id);
      }
      onSelectTemplate(previewTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
      setPreviewTemplate(null);
    }
  };

  /**
   * Handle deleting a saved template
   * @param id - ID of the saved template to delete
   */
  const handleDeleteSavedTemplate = async (id: string) => {
    setDeletingTemplateId(id);
    const success = await deleteTemplate(id);
    setDeletingTemplateId(null);

    if (success) {
      toast.success('Template deleted');
      // Clear selection if the deleted template was selected
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
      if (previewTemplate?.id === id) {
        setPreviewTemplate(null);
      }
    } else {
      toast.error('Failed to delete template');
    }
  };

  /**
   * Render a grid of template cards
   * @param templates - Templates to render
   * @returns JSX element with template grid
   */
  const renderTemplateGrid = (templates: CanvasTemplate[]) => (
    <div className="grid grid-cols-2 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedTemplate?.id === template.id}
          isFavorite={favorites.includes(template.id)}
          onSelect={() => handleSelectTemplate(template)}
          onToggleFavorite={() => toggleFavorite(template.id)}
          onPreview={() => setPreviewTemplate(template)}
        />
      ))}
    </div>
  );

  /**
   * Render content for the brand tab
   * @returns JSX element with brand template content
   */
  const renderBrandContent = () => (
    <div className="space-y-6 pb-4">
      {isLoadingBrand ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Loading brand templates...</p>
        </div>
      ) : hasBrandKit && brandTemplates.length > 0 ? (
        <div>
          <SectionHeader
            icon={<IconPalette className="h-4 w-4 text-primary" />}
            title="Your Brand Templates"
            count={brandTemplates.length}
          />
          {renderTemplateGrid(brandTemplates)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <IconPalette className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">No brand kit found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Go to Settings &gt; Brand Kit to extract your brand colors, fonts, and logo.
            Templates will be auto-generated from your brand.
          </p>
        </div>
      )}
    </div>
  );

  /**
   * Render content for the my-templates tab
   * @returns JSX element with saved template content
   */
  const renderMyTemplatesContent = () => (
    <div className="space-y-6 pb-4">
      {isLoadingSaved ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Loading your templates...</p>
        </div>
      ) : savedTemplates.length > 0 ? (
        <div>
          <SectionHeader
            icon={<IconUser className="h-4 w-4 text-muted-foreground" />}
            title="My Saved Templates"
            count={savedTemplates.length}
          />
          <div className="grid grid-cols-2 gap-4">
            {savedTemplates.map((saved) => {
              const converted = toCanvasTemplate(saved);
              return (
                <SavedTemplateCard
                  key={saved.id}
                  template={converted}
                  isSelected={selectedTemplate?.id === saved.id}
                  onSelect={() => handleSelectTemplate(converted)}
                  onPreview={() => setPreviewTemplate(converted)}
                  onDelete={() => handleDeleteSavedTemplate(saved.id)}
                  isDeleting={deletingTemplateId === saved.id}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No saved templates yet. Use the &quot;Save Template&quot; button in the
            toolbar to save your carousel designs for reuse.
          </p>
        </div>
      )}
    </div>
  );

  /**
   * Render content for built-in template tabs (all, professional, creative, minimal, bold)
   * @returns JSX element with built-in template content
   */
  const renderBuiltInContent = () => (
    <div className="space-y-6 pb-4">
      {/* Recently Used section - only on "All" tab */}
      {activeCategory === 'all' && recentTemplates.length > 0 && (
        <div>
          <SectionHeader
            icon={<IconClock className="h-4 w-4 text-muted-foreground" />}
            title="Recently Used"
            count={recentTemplates.length}
          />
          {renderTemplateGrid(recentTemplates)}
        </div>
      )}

      {/* Favorites section - only on "All" tab */}
      {activeCategory === 'all' && favoriteTemplates.length > 0 && (
        <div>
          <SectionHeader
            icon={<IconHeart className="h-4 w-4 text-red-400" />}
            title="Favorites"
            count={favoriteTemplates.length}
          />
          {renderTemplateGrid(favoriteTemplates)}
        </div>
      )}

      {/* All / Filtered templates */}
      <div>
        {activeCategory === 'all' &&
          (recentTemplates.length > 0 || favoriteTemplates.length > 0) && (
            <SectionHeader
              icon={<IconSparkles className="h-4 w-4 text-muted-foreground" />}
              title="All Templates"
              count={filteredTemplates.length}
            />
          )}
        {filteredTemplates.length > 0 ? (
          renderTemplateGrid(filteredTemplates)
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              {showFavoritesOnly
                ? 'No favorite templates yet. Click the star icon on a template to add it to your favorites.'
                : 'No templates found in this category.'}
            </p>
            {showFavoritesOnly && (
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() => setShowFavoritesOnly(false)}
              >
                Show all templates
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render the active tab content based on the current category
   * @returns JSX element for the active tab
   */
  const renderActiveContent = () => {
    if (activeCategory === 'brand') return renderBrandContent();
    if (activeCategory === 'my-templates') return renderMyTemplatesContent();
    return renderBuiltInContent();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1.5 pb-4">
          <DialogTitle className="text-xl font-bold">Choose a Template</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Start with a professionally designed template and customize it to match your brand.
          </DialogDescription>
        </DialogHeader>

        {/* Preview mode */}
        {previewTemplate ? (
          <div className="flex-1 overflow-y-auto py-2">
            <TemplatePreviewPanel
              template={previewTemplate}
              onClose={() => setPreviewTemplate(null)}
              onApply={handleApplyFromPreview}
            />
          </div>
        ) : (
          <>
            {/* Animated tab bar */}
            <div className="relative flex items-center gap-1 rounded-xl bg-muted/50 p-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  className={cn(
                    'relative z-10 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                    activeCategory === tab.value
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {activeCategory === tab.value && (
                    <motion.div
                      layoutId="template-tab-indicator"
                      className="absolute inset-0 rounded-lg bg-background shadow-sm"
                      transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.icon}
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Favorites filter toggle - hidden on My Templates and Brand tabs */}
            {activeCategory !== 'my-templates' && activeCategory !== 'brand' && (
              <div className="flex items-center justify-end mt-3">
                <Button
                  variant={showFavoritesOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowFavoritesOnly((prev) => !prev)}
                  className="gap-1.5 text-xs"
                  aria-pressed={showFavoritesOnly}
                  aria-label={showFavoritesOnly ? 'Show all templates' : 'Show favorites only'}
                >
                  {showFavoritesOnly ? (
                    <IconStarFilled className="h-3.5 w-3.5" />
                  ) : (
                    <IconStar className="h-3.5 w-3.5" />
                  )}
                  {showFavoritesOnly ? 'Showing Favorites' : 'Favorites Only'}
                </Button>
              </div>
            )}

            {/* Animated tab content with AnimatePresence */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto mt-4"
              >
                {renderActiveContent()}
              </motion.div>
            </AnimatePresence>

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <div className="text-sm text-muted-foreground">
                {selectedTemplate ? (
                  <span>
                    Selected: <strong>{selectedTemplate.name}</strong>
                  </span>
                ) : (
                  <span>Select a template to continue</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApplyTemplate} disabled={!selectedTemplate}>
                  Use Template
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
