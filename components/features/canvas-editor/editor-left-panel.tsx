'use client';

/**
 * Editor Left Panel Component
 * Composes the icon rail with an animated expandable content area
 * that shows the active panel (templates, AI, graphics, uploads, slides)
 * @module components/features/canvas-editor/editor-left-panel
 */

import { motion, AnimatePresence } from 'framer-motion';
import { EditorIconRail } from './editor-icon-rail';
import { PanelTemplates } from './panel-templates';
import { PanelAiGenerate } from './panel-ai-generate';
import { PanelGraphics } from './panel-graphics';
import { PanelUploads } from './panel-uploads';
import { PanelSlides } from './panel-slides';
import { fadeSlideLeftVariants } from '@/lib/animations';
import type { LeftPanelTab, CanvasTemplate, CanvasSlide } from '@/types/canvas-editor';
import type { ShapeElementConfig } from '@/types/graphics-library';

/**
 * Props for the EditorLeftPanel component
 */
interface EditorLeftPanelProps {
  activeTab: LeftPanelTab | null;
  onTabChange: (tab: LeftPanelTab | null) => void;
  // Template panel props
  onSelectTemplate: (template: CanvasTemplate) => void;
  onOpenFullTemplatePreview: () => void;
  // AI panel props
  currentTemplate: CanvasTemplate | null;
  currentSlides: CanvasSlide[];
  onAiGenerated: (slides: CanvasSlide[]) => void;
  onOpenAdvancedAi: () => void;
  // Graphics panel props
  onInsertImage: (src: string, width: number, height: number) => void;
  onInsertShape: (config: ShapeElementConfig) => void;
  // Slides panel props
  slides: CanvasSlide[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
  onAddSlide: () => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
}

/**
 * Left panel compositor: icon rail + expandable content area
 * @param props - Component props
 * @returns Left panel JSX
 */
export function EditorLeftPanel({
  activeTab,
  onTabChange,
  onSelectTemplate,
  onOpenFullTemplatePreview,
  currentTemplate,
  currentSlides,
  onAiGenerated,
  onOpenAdvancedAi,
  onInsertImage,
  onInsertShape,
  slides,
  currentSlideIndex,
  onSlideSelect,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onReorderSlides,
}: EditorLeftPanelProps) {
  return (
    <div className="flex h-full">
      {/* Icon rail */}
      <EditorIconRail activeTab={activeTab} onTabChange={onTabChange} />

      {/* Expandable content area */}
      <motion.div
        className="h-full overflow-x-hidden border-r bg-muted/30"
        animate={{ width: activeTab ? 300 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="h-full w-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === 'templates' && (
              <motion.div
                key="templates"
                variants={fadeSlideLeftVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                <PanelTemplates
                  onSelectTemplate={onSelectTemplate}
                  onOpenFullPreview={onOpenFullTemplatePreview}
                />
              </motion.div>
            )}

            {activeTab === 'ai' && (
              <motion.div
                key="ai"
                variants={fadeSlideLeftVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                <PanelAiGenerate
                  currentTemplate={currentTemplate}
                  currentSlides={currentSlides}
                  onGenerated={onAiGenerated}
                  onOpenAdvanced={onOpenAdvancedAi}
                />
              </motion.div>
            )}

            {activeTab === 'graphics' && (
              <motion.div
                key="graphics"
                variants={fadeSlideLeftVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                <PanelGraphics
                  onInsertImage={onInsertImage}
                  onInsertShape={onInsertShape}
                />
              </motion.div>
            )}

            {activeTab === 'uploads' && (
              <motion.div
                key="uploads"
                variants={fadeSlideLeftVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                <PanelUploads onInsertImage={onInsertImage} />
              </motion.div>
            )}

            {activeTab === 'slides' && (
              <motion.div
                key="slides"
                variants={fadeSlideLeftVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                <PanelSlides
                  slides={slides}
                  currentSlideIndex={currentSlideIndex}
                  onSlideSelect={onSlideSelect}
                  onAddSlide={onAddSlide}
                  onDeleteSlide={onDeleteSlide}
                  onDuplicateSlide={onDuplicateSlide}
                  onReorderSlides={onReorderSlides}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
