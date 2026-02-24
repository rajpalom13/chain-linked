'use client';

/**
 * Template Selector Modal
 * Modal for choosing and applying carousel templates
 * Features favorites, recently used, preview, and category filtering
 * Includes Framer Motion animations for tab switching and card interactions
 * @module components/features/canvas-editor/template-selector-modal
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
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
  IconFolder,
  IconPlus,
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
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { canvasTemplates, getTemplatesByCategory } from '@/lib/canvas-templates';
import { useCarouselTemplates } from '@/hooks/use-carousel-templates';
import type { SavedCarouselTemplate } from '@/hooks/use-carousel-templates';
import { useBrandKitTemplates } from '@/hooks/use-brand-kit-templates';
import { useTemplateCategories } from '@/hooks/use-template-categories';
import type { CanvasTemplate, TemplateCategory, CanvasSlide } from '@/types/canvas-editor';

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
 * Fetch favorite template IDs from the API
 * @returns Promise resolving to array of favorite template IDs
 */
async function fetchFavoritesFromApi(): Promise<string[]> {
  try {
    const response = await fetch('/api/carousel-templates/favorites');
    if (!response.ok) return [];
    const data = await response.json();
    return data.favoriteIds ?? [];
  } catch {
    console.warn('Failed to fetch template favorites from API');
    return [];
  }
}

/**
 * Add a template favorite via the API
 * @param templateId - Template ID to add
 */
async function addFavoriteApi(templateId: string): Promise<void> {
  try {
    await fetch('/api/carousel-templates/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
    });
  } catch {
    console.warn('Failed to add template favorite via API');
  }
}

/**
 * Remove a template favorite via the API
 * @param templateId - Template ID to remove
 */
async function removeFavoriteApi(templateId: string): Promise<void> {
  try {
    await fetch(
      `/api/carousel-templates/favorites?templateId=${encodeURIComponent(templateId)}`,
      { method: 'DELETE' }
    );
  } catch {
    console.warn('Failed to remove template favorite via API');
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
 * Get a display-friendly label for a template category
 * @param category - Category string (built-in or custom)
 * @returns Human-readable label
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    professional: 'Professional',
    creative: 'Creative',
    minimal: 'Minimal',
    bold: 'Bold',
    custom: 'Custom',
    brand: 'Your Brand',
  };
  return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Get an icon for a template category
 * @param category - Category string
 * @returns React icon element
 */
function getCategoryIcon(category: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    professional: <IconBriefcase className="h-4 w-4 text-primary" />,
    creative: <IconSparkles className="h-4 w-4 text-primary" />,
    minimal: <IconMinimize className="h-4 w-4 text-primary" />,
    bold: <IconBolt className="h-4 w-4 text-primary" />,
    brand: <IconPalette className="h-4 w-4 text-primary" />,
  };
  return icons[category] || <IconFolder className="h-4 w-4 text-primary" />;
}

/**
 * Renders slide elements at a given scale
 * Shared rendering logic used by template card and preview panel
 * @param props - Component props
 * @param props.slide - The slide to render
 * @param props.scale - Scale factor for the 1080x1080 canvas (defaults to 0.38)
 * @returns JSX element rendering the slide elements
 */
function SlideRenderer({ slide, scale = 0.38 }: { slide: CanvasSlide; scale?: number }) {
  return (
    <div
      className="relative origin-top-left"
      style={{
        width: 1080,
        height: 1080,
        transform: `scale(${scale})`,
      }}
    >
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
        if (element.type === 'image') {
          return (
            <div
              key={element.id}
              className="absolute overflow-hidden"
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: `rotate(${element.rotation}deg)`,
              }}
            >
              <Image src={element.src} alt={element.alt || ''} fill className="object-cover" unoptimized />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/**
 * Template card component with clean single-slide preview
 * Shows first slide as a full-width thumbnail with overlay actions on hover
 * @param props - Component props
 * @param props.template - The template to display
 * @param props.isSelected - Whether this template is currently selected
 * @param props.isFavorite - Whether this template is favorited
 * @param props.onSelect - Callback for selecting the template
 * @param props.onToggleFavorite - Callback for toggling favorite status
 * @param props.onPreview - Callback for previewing the template
 * @param props.onQuickApply - Callback for immediately applying the template
 * @returns JSX element rendering a template card
 */
function TemplateCard({
  template,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onPreview,
  onQuickApply,
}: {
  template: CanvasTemplate;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onPreview: () => void;
  onQuickApply: () => void;
}) {
  const firstSlide = template.defaultSlides[0];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 bg-card transition-all duration-200',
        'hover:shadow-lg',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30'
      )}
    >
      {/* Favorite button - always visible when favorited, on hover otherwise */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          'absolute left-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200',
          isFavorite
            ? 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30'
            : 'bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-yellow-500 backdrop-blur-sm'
        )}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? (
          <IconStarFilled className="h-4 w-4" />
        ) : (
          <IconStar className="h-4 w-4" />
        )}
      </button>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <IconCheck className="h-4 w-4" />
        </div>
      )}

      {/* Slide count badge - visible when not selected */}
      {!isSelected && (
        <div className="absolute right-2.5 top-2.5 z-20">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-background/80 backdrop-blur-sm shadow-sm">
            {template.defaultSlides.length} slides
          </Badge>
        </div>
      )}

      {/* First slide preview - click opens preview popup */}
      <div
        role="button"
        tabIndex={0}
        onClick={onPreview}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPreview() } }}
        className="block w-full text-left cursor-pointer"
      >
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{ backgroundColor: firstSlide?.backgroundColor || '#f5f5f5' }}
        >
          {firstSlide && <SlideRenderer slide={firstSlide} scale={0.38} />}

          {/* Bottom gradient for name readability */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />

          {/* Template name overlay */}
          <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3">
            <p className="text-sm font-semibold text-white drop-shadow-sm truncate">
              {template.name}
            </p>
            {template.description && (
              <p className="text-[11px] text-white/70 truncate mt-0.5 drop-shadow-sm">
                {template.description}
              </p>
            )}
          </div>

          {/* Hover overlay with Create Post shortcut */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <Button
              size="sm"
              className="text-xs shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onQuickApply();
              }}
            >
              Create Post
            </Button>
          </div>
        </div>
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
          <SlideRenderer slide={currentSlide} scale={0.46} />
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
        Create Post
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
 * Clean single-slide preview design with delete action
 * @param props - Component props
 * @param props.template - The CanvasTemplate to display
 * @param props.isSelected - Whether this card is currently selected
 * @param props.onSelect - Callback when the card is clicked
 * @param props.onPreview - Callback for the preview action
 * @param props.onQuickApply - Callback for immediately applying the template
 * @param props.onDelete - Callback to delete this saved template
 * @param props.isDeleting - Whether a delete operation is in progress
 * @returns JSX element rendering a saved template card
 */
function SavedTemplateCard({
  template,
  isSelected,
  onSelect,
  onPreview,
  onQuickApply,
  onDelete,
  isDeleting,
}: {
  template: CanvasTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onQuickApply: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const firstSlide = template.defaultSlides[0];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 bg-card transition-all duration-200',
        'hover:shadow-lg',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30'
      )}
    >
      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
        className={cn(
          'absolute left-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200',
          'bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground backdrop-blur-sm'
        )}
        aria-label="Delete saved template"
      >
        {isDeleting ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconTrash className="h-4 w-4" />
        )}
      </button>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <IconCheck className="h-4 w-4" />
        </div>
      )}

      {/* Slide count badge */}
      {!isSelected && (
        <div className="absolute right-2.5 top-2.5 z-20">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-background/80 backdrop-blur-sm shadow-sm">
            {template.defaultSlides.length} slides
          </Badge>
        </div>
      )}

      {/* First slide preview - click opens preview popup */}
      <button type="button" onClick={onPreview} className="block w-full text-left">
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{ backgroundColor: firstSlide?.backgroundColor || '#f5f5f5' }}
        >
          {firstSlide && <SlideRenderer slide={firstSlide} scale={0.38} />}

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />

          {/* Template name */}
          <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3">
            <p className="text-sm font-semibold text-white drop-shadow-sm truncate">
              {template.name}
            </p>
            {template.description && (
              <p className="text-[11px] text-white/70 truncate mt-0.5 drop-shadow-sm">
                {template.description}
              </p>
            )}
          </div>

          {/* Hover overlay with Create Post shortcut */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <Button
              size="sm"
              className="text-xs shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onQuickApply();
              }}
            >
              Create Post
            </Button>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

/**
 * Template Selector Modal
 * Displays available templates organized by category with favorites and recently used sections
 * Includes a "My Templates" tab for user-saved templates grouped by custom category
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
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  /** Ref to track whether favorites have been fetched for the current open session */
  const favoritesFetchedRef = useRef(false);

  // Brand kit templates hook
  const { brandTemplates, isLoading: isLoadingBrand, hasBrandKit } = useBrandKitTemplates();

  // Template categories hook
  const {
    categories: userCategories,
    fetchCategories,
    createCategory,
    isSaving: isSavingCategory,
  } = useTemplateCategories();

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
   * Load favorites from Supabase, recently used from localStorage,
   * and saved templates when modal opens
   */
  useEffect(() => {
    if (open) {
      favoritesFetchedRef.current = false;
      setRecentlyUsed(loadRecentlyUsed());
      setShowFavoritesOnly(false);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      fetchTemplates();
      fetchCategories();

      fetchFavoritesFromApi().then((ids) => {
        setFavorites(ids);
        favoritesFetchedRef.current = true;
      });
    }
  }, [open, fetchTemplates, fetchCategories]);

  /**
   * Toggle a template's favorite status with optimistic UI update
   * Syncs the change to Supabase in the background
   * @param templateId - ID of template to toggle
   */
  const toggleFavorite = useCallback(
    (templateId: string) => {
      setFavorites((prev) => {
        const isFav = prev.includes(templateId);
        const updated = isFav
          ? prev.filter((id) => id !== templateId)
          : [...prev, templateId];

        // Sync to API in the background (optimistic update)
        if (isFav) {
          removeFavoriteApi(templateId).catch(() => {
            setFavorites((current) => [...current, templateId]);
            toast.error('Failed to remove favorite');
          });
        } else {
          addFavoriteApi(templateId).catch(() => {
            setFavorites((current) => current.filter((id) => id !== templateId));
            toast.error('Failed to add favorite');
          });
        }

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
   * Group saved templates by their category for the My Templates tab
   */
  const groupedSavedTemplates = useMemo(() => {
    const groups: Record<string, SavedCarouselTemplate[]> = {};
    for (const saved of savedTemplates) {
      const cat = saved.category || 'custom';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(saved);
    }
    return groups;
  }, [savedTemplates]);

  /**
   * Handle template selection
   * @param template - Template that was selected
   */
  const handleSelectTemplate = (template: CanvasTemplate) => {
    setSelectedTemplate(template);
  };

  /**
   * Apply a template immediately (quick apply from card hover)
   * @param template - Template to apply
   */
  const handleQuickApply = useCallback(
    (template: CanvasTemplate) => {
      saveRecentlyUsed(template.id);
      const savedMatch = savedTemplates.find((s) => s.id === template.id);
      if (savedMatch) {
        incrementUsage(savedMatch.id);
      }
      onSelectTemplate(template);
      onOpenChange(false);
      setSelectedTemplate(null);
      setPreviewTemplate(null);
    },
    [savedTemplates, incrementUsage, onSelectTemplate, onOpenChange]
  );

  /**
   * Handle applying the selected template
   */
  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      handleQuickApply(selectedTemplate);
    }
  };

  /**
   * Handle applying a template from the preview panel
   */
  const handleApplyFromPreview = () => {
    if (previewTemplate) {
      handleQuickApply(previewTemplate);
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
    <div className="grid grid-cols-2 gap-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedTemplate?.id === template.id}
          isFavorite={favorites.includes(template.id)}
          onSelect={() => setPreviewTemplate(template)}
          onToggleFavorite={() => toggleFavorite(template.id)}
          onPreview={() => setPreviewTemplate(template)}
          onQuickApply={() => handleQuickApply(template)}
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
   * Handle creating a new template category
   */
  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const result = await createCategory(trimmed);
    if (result) {
      toast.success(`Category "${result.name}" created`);
      setNewCategoryName('');
      setIsCreatingCategory(false);
    } else {
      toast.error('Failed to create category');
    }
  };

  /**
   * Merge user-defined categories (from Supabase) with categories derived from saved templates
   * This ensures empty categories appear even with no templates assigned
   */
  const allMyCategories = useMemo(() => {
    const fromTemplates = new Set(Object.keys(groupedSavedTemplates));
    const fromDb = new Set(userCategories.map((c) => c.name));
    return Array.from(new Set([...fromDb, ...fromTemplates]));
  }, [groupedSavedTemplates, userCategories]);

  /**
   * Render content for the my-templates tab, grouped by category
   * @returns JSX element with saved template content grouped by category
   */
  const renderMyTemplatesContent = () => (
    <div className="space-y-6 pb-4">
      {isLoadingSaved ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Loading your templates...</p>
        </div>
      ) : (
        <>
          {/* Category sections */}
          {allMyCategories.length > 0 && allMyCategories.map((category) => {
            const templates = groupedSavedTemplates[category] || [];
            return (
              <div key={category}>
                <SectionHeader
                  icon={getCategoryIcon(category)}
                  title={getCategoryLabel(category)}
                  count={templates.length}
                />
                {templates.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((saved) => {
                      const converted = toCanvasTemplate(saved);
                      return (
                        <SavedTemplateCard
                          key={saved.id}
                          template={converted}
                          isSelected={selectedTemplate?.id === saved.id}
                          onSelect={() => handleSelectTemplate(converted)}
                          onPreview={() => setPreviewTemplate(converted)}
                          onQuickApply={() => handleQuickApply(converted)}
                          onDelete={() => handleDeleteSavedTemplate(saved.id)}
                          isDeleting={deletingTemplateId === saved.id}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      No templates in this category yet. Save a template with this category from the editor.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Create Category card — always visible at the bottom */}
          <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/20 p-5">
            {isCreatingCategory ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">New Category Name</p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g., Tips, Tutorials, Case Studies..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    maxLength={50}
                    disabled={isSavingCategory}
                    autoFocus
                    className="flex-1 h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCategory();
                      if (e.key === 'Escape') {
                        setIsCreatingCategory(false);
                        setNewCategoryName('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || isSavingCategory}
                  >
                    {isSavingCategory ? (
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setNewCategoryName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreatingCategory(true)}
                className="flex w-full items-center gap-3 text-left group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <IconPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    Create a New Category
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Organize your saved templates into custom folders
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Empty state hint when there are no categories at all */}
          {allMyCategories.length === 0 && !isCreatingCategory && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <IconUser className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No saved templates yet. Create a category above, then use
                &quot;Save Template&quot; in the editor to save your designs.
              </p>
            </div>
          )}
        </>
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
            <div
              className="relative flex items-center gap-1 rounded-xl bg-muted/50 p-1.5 shrink-0 overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  className={cn(
                    'relative z-10 flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors shrink-0',
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
                className="flex-1 overflow-y-auto mt-4 min-h-[400px]"
              >
                {renderActiveContent()}
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="flex items-center justify-between border-t bg-muted/30 -mx-6 -mb-6 px-6 py-3.5 rounded-b-lg">
              <p className="text-xs text-muted-foreground">
                Click a template to preview, or hover for quick actions
              </p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
