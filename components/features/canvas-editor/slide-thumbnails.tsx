'use client';

/**
 * Slide Thumbnails Component
 * Left sidebar with slide navigation, add, delete, duplicate, reorder
 */

import { useCallback } from 'react';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconGripVertical,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { CanvasSlide, MAX_SLIDES } from '@/types/canvas-editor';

const MAX_SLIDE_COUNT = 10;

/**
 * Props for the SlideThumbnails component
 */
interface SlideThumbnailsProps {
  slides: CanvasSlide[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
  onAddSlide: () => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
}

/**
 * Mini slide preview component
 */
function SlidePreview({
  slide,
  index,
  isSelected,
  onClick,
  onDelete,
  onDuplicate,
  canDelete,
  canDuplicate,
}: {
  slide: CanvasSlide;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  canDelete: boolean;
  canDuplicate: boolean;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'group relative w-full overflow-hidden rounded-lg border-2 transition-all',
            'aspect-square cursor-pointer',
            isSelected
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50'
          )}
        >
          {/* Slide number badge */}
          <div
            className={cn(
              'absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {index + 1}
          </div>

          {/* Mini preview */}
          <div
            className="h-full w-full"
            style={{ backgroundColor: slide.backgroundColor }}
          >
            {/* Simplified element preview */}
            <div className="relative h-full w-full scale-[0.08] transform-gpu">
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
                        backgroundColor: element.fill,
                        borderRadius:
                          element.shapeType === 'circle'
                            ? '50%'
                            : element.cornerRadius || 0,
                        transform: `rotate(${element.rotation}deg)`,
                      }}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Hover overlay with drag handle */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
            <IconGripVertical className="h-5 w-5 text-white drop-shadow-md" />
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={onDuplicate} disabled={!canDuplicate}>
          <IconCopy className="mr-2 h-4 w-4" />
          Duplicate Slide
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          disabled={!canDelete}
          className="text-destructive focus:text-destructive"
        >
          <IconTrash className="mr-2 h-4 w-4" />
          Delete Slide
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Slide Thumbnails Component
 * Displays slide thumbnails with navigation and management options
 */
export function SlideThumbnails({
  slides,
  currentSlideIndex,
  onSlideSelect,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onReorderSlides,
}: SlideThumbnailsProps) {
  const canAddSlide = slides.length < MAX_SLIDE_COUNT;
  const canDeleteSlide = slides.length > 1;

  /**
   * Handle drag start for reordering
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.dataTransfer.setData('text/plain', String(index));
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  /**
   * Handle drag over for reordering
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drop for reordering
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (fromIndex !== toIndex) {
        onReorderSlides(fromIndex, toIndex);
      }
    },
    [onReorderSlides]
  );

  return (
    <TooltipProvider>
      <div className="flex h-full w-48 flex-col border-r bg-muted/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Slides</span>
          <span className="text-xs text-muted-foreground">
            {slides.length}/{MAX_SLIDE_COUNT}
          </span>
        </div>

        {/* Slide list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-3">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <SlidePreview
                  slide={slide}
                  index={index}
                  isSelected={index === currentSlideIndex}
                  onClick={() => onSlideSelect(index)}
                  onDelete={() => onDeleteSlide(index)}
                  onDuplicate={() => onDuplicateSlide(index)}
                  canDelete={canDeleteSlide}
                  canDuplicate={canAddSlide}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Add slide button */}
        <div className="border-t p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onAddSlide}
                disabled={!canAddSlide}
              >
                <IconPlus className="mr-2 h-4 w-4" />
                Add Slide
              </Button>
            </TooltipTrigger>
            {!canAddSlide && (
              <TooltipContent>
                Maximum {MAX_SLIDE_COUNT} slides allowed
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
