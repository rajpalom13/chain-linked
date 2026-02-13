'use client';

/**
 * Slides Panel Component
 * Enhanced slide manager for the editor left panel
 * Replaces the old SlideThumbnails component with larger previews
 * @module components/features/canvas-editor/panel-slides
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconGripVertical,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { staggerContainerVariants } from '@/lib/animations';
import type { CanvasSlide } from '@/types/canvas-editor';

const MAX_SLIDE_COUNT = 10;

/**
 * Props for the PanelSlides component
 */
interface PanelSlidesProps {
  slides: CanvasSlide[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
  onAddSlide: () => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
}

/**
 * Enhanced slides panel with larger previews, drag reorder, and context menus
 * @param props - Component props
 * @returns Slides panel JSX
 */
export function PanelSlides({
  slides,
  currentSlideIndex,
  onSlideSelect,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onReorderSlides,
}: PanelSlidesProps) {
  const canAddSlide = slides.length < MAX_SLIDE_COUNT;
  const canDeleteSlide = slides.length > 1;

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.dataTransfer.setData('text/plain', String(index));
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Slides</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {slides.length}/{MAX_SLIDE_COUNT}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={onAddSlide}
          disabled={!canAddSlide}
        >
          <IconPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Slide list */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea className="absolute inset-0">
          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-3 p-3"
          >
            <AnimatePresence>
              {slides.map((slide, index) => (
                <motion.div
                  key={slide.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  draggable
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<HTMLDivElement>, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e as unknown as React.DragEvent<HTMLDivElement>, index)}
                >
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <button
                        type="button"
                        onClick={() => onSlideSelect(index)}
                        className={cn(
                          'group relative w-full overflow-hidden rounded-lg border-2 transition-all',
                          'aspect-square cursor-pointer',
                          index === currentSlideIndex
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {/* Slide number badge */}
                        <div
                          className={cn(
                            'absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                            index === currentSlideIndex
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {index + 1}
                        </div>

                        {/* Preview at ~0.24 scale */}
                        <div
                          className="h-full w-full"
                          style={{ backgroundColor: slide.backgroundColor }}
                        >
                          <div className="relative h-full w-full scale-[0.24] transform-gpu origin-top-left">
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

                        {/* Hover overlay with actions */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
                          <div className="flex items-center gap-1">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow-sm cursor-grab"
                              title="Drag to reorder"
                            >
                              <IconGripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateSlide(index);
                              }}
                              title="Duplicate"
                              disabled={!canAddSlide}
                            >
                              <IconCopy className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSlide(index);
                              }}
                              title="Delete"
                              disabled={!canDeleteSlide}
                            >
                              <IconTrash className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </button>
                    </ContextMenuTrigger>

                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => onDuplicateSlide(index)}
                        disabled={!canAddSlide}
                      >
                        <IconCopy className="mr-2 h-4 w-4" />
                        Duplicate Slide
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => onDeleteSlide(index)}
                        disabled={!canDeleteSlide}
                        className="text-destructive focus:text-destructive"
                      >
                        <IconTrash className="mr-2 h-4 w-4" />
                        Delete Slide
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </ScrollArea>
      </div>
    </div>
  );
}
