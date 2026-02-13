'use client';

/**
 * Canvas Editor Component
 * Main orchestrating component for the Canva-style carousel editor
 * Uses a Canva/Figma-inspired layout with left panel, floating toolbar,
 * and top actions instead of the old full-width toolbar
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useCanvasEditor } from '@/hooks/use-canvas-editor';
import { useCarouselTemplates } from '@/hooks/use-carousel-templates';
import { EditorLeftPanel } from './editor-left-panel';
import { EditorFloatingToolbar } from './editor-floating-toolbar';
import { EditorTopActions } from './editor-top-actions';
import { PropertyPanel } from './property-panel';
import { TemplateSelectorModal } from './template-selector-modal';
import { ExportDialog } from './export-dialog';
import { AiContentGenerator } from './ai-content-generator';
import { SaveTemplateDialog } from './save-template-dialog';
import {
  exportCarouselToPDF,
  exportSlideToDataUrl,
  downloadBlob,
  generateFilename,
} from '@/lib/canvas-pdf-export';
import { cn } from '@/lib/utils';
import type { CanvasTemplate, CanvasSlide, ExportOptions, LeftPanelTab } from '@/types/canvas-editor';
import type { ShapeElementConfig } from '@/types/graphics-library';
import type { CanvasStageRef } from './canvas-stage';

// Dynamic import for Konva (client-side only)
const CanvasStage = dynamic(
  () => import('./canvas-stage').then((mod) => mod.CanvasStage),
  { ssr: false, loading: () => <CanvasLoading /> }
);

/**
 * Loading placeholder for canvas
 */
function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading editor...</p>
      </div>
    </div>
  );
}

/**
 * Props for the CanvasEditor component
 */
interface CanvasEditorProps {
  initialTemplate?: CanvasTemplate;
  onSave?: (slides: CanvasTemplate['defaultSlides']) => void;
  className?: string;
}

/**
 * Canvas Editor Component
 * Full carousel editing experience with Canva-style left panel, floating
 * toolbar, property panel, and dialog-based modals for advanced features
 */
export function CanvasEditor({
  initialTemplate,
  onSave,
  className,
}: CanvasEditorProps) {
  const stageRef = useRef<CanvasStageRef>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(!initialTemplate);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Carousel template persistence
  const { saveTemplate, isSaving: isSavingTemplate } = useCarouselTemplates();

  // Canvas editor state
  const {
    slides,
    currentSlideIndex,
    currentSlide,
    selectedElementId,
    selectedElement,
    template,
    zoom,
    showGrid,
    isExporting,
    setSlides,
    setCurrentSlide,
    addSlide,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
    updateSlideBackground,
    selectElement,
    updateElement,
    addElement,
    addImageElement,
    deleteElement,
    applyTemplate,
    setZoom,
    toggleGrid,
    setExporting,
    undo,
    redo,
    canUndo,
    canRedo,
    resetEditor,
  } = useCanvasEditor();

  // Apply initial template
  useEffect(() => {
    if (initialTemplate) {
      applyTemplate(initialTemplate);
    }
  }, [initialTemplate, applyTemplate]);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        deleteElement();
      }

      if (e.key === 'Escape') {
        selectElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteElement, selectElement, selectedElementId]);

  /**
   * Handle template selection (from inline panel or modal)
   */
  const handleSelectTemplate = useCallback(
    (selectedTemplate: CanvasTemplate) => {
      applyTemplate(selectedTemplate);
    },
    [applyTemplate]
  );

  /**
   * Handle AI-generated slides
   */
  const handleAiGenerated = useCallback(
    (generatedSlides: CanvasSlide[]) => {
      setSlides(generatedSlides);
    },
    [setSlides]
  );

  /**
   * Handle element update from property panel
   */
  const handleElementUpdate = useCallback(
    (updates: Parameters<typeof updateElement>[1]) => {
      if (selectedElementId) {
        updateElement(selectedElementId, updates);
      }
    },
    [selectedElementId, updateElement]
  );

  /**
   * Handle slide background change
   */
  const handleSlideBackgroundChange = useCallback(
    (color: string) => {
      updateSlideBackground(currentSlideIndex, color);
    },
    [currentSlideIndex, updateSlideBackground]
  );

  /**
   * Handle export
   */
  const handleExport = useCallback(
    async (options: ExportOptions) => {
      setExporting(true);
      setExportProgress(0);

      try {
        const stage = stageRef.current?.getStage();
        if (!stage) {
          throw new Error('Canvas not ready');
        }

        if (options.format === 'pdf') {
          const dataUrls: string[] = [];
          const originalSlideIndex = currentSlideIndex;

          for (let i = 0; i < slides.length; i++) {
            setCurrentSlide(i);
            await new Promise((resolve) => requestAnimationFrame(resolve));
            await new Promise((resolve) => setTimeout(resolve, 100));

            const dataUrl = exportSlideToDataUrl(stage, options.pixelRatio);
            dataUrls.push(dataUrl);
            setExportProgress((i + 1) / slides.length);
          }

          setCurrentSlide(originalSlideIndex);

          const pdfBlob = await exportCarouselToPDF(dataUrls, options);
          const filename = options.fileName || generateFilename('carousel', 'pdf');
          downloadBlob(pdfBlob, filename);
        } else {
          const dataUrl = exportSlideToDataUrl(stage, options.pixelRatio);
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const filename =
            options.fileName || generateFilename(`slide-${currentSlideIndex + 1}`, 'png');
          downloadBlob(blob, filename);
        }

        setShowExportDialog(false);
      } catch (error) {
        console.error('Export failed:', error);
        toast.error('Export failed. Please try again.');
      } finally {
        setExporting(false);
        setExportProgress(0);
      }
    },
    [slides, currentSlideIndex, setCurrentSlide, setExporting]
  );

  /**
   * Handle zoom controls
   */
  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(2, zoom + 0.1));
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(0.25, zoom - 0.1));
  }, [zoom, setZoom]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  /**
   * Handle inserting an image from the graphics/uploads panel
   */
  const handleInsertGraphicImage = useCallback(
    (src: string, width: number, height: number) => {
      const scale = Math.min(1, 500 / width);
      addImageElement(src, Math.round(width * scale), Math.round(height * scale));
    },
    [addImageElement]
  );

  /**
   * Ref holding a pending shape configuration from the graphics library
   */
  const pendingShapeConfigRef = useRef<ShapeElementConfig | null>(null);

  /**
   * Apply pending shape configuration when a new element is selected
   */
  useEffect(() => {
    if (pendingShapeConfigRef.current && selectedElementId) {
      const config = pendingShapeConfigRef.current;
      pendingShapeConfigRef.current = null;
      updateElement(selectedElementId, {
        width: config.width,
        height: config.height,
        shapeType: config.shapeType,
        fill: config.fill,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth || 0,
        cornerRadius: config.cornerRadius || 0,
        rotation: config.rotation || 0,
      });
    }
  }, [selectedElementId, updateElement]);

  /**
   * Handle inserting a shape from the graphics panel
   */
  const handleInsertGraphicShape = useCallback(
    (config: ShapeElementConfig) => {
      pendingShapeConfigRef.current = config;
      addElement('shape');
    },
    [addElement]
  );

  /**
   * Handle reset with confirmation
   */
  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset? All changes will be lost.')) {
      resetEditor();
      setShowTemplateModal(true);
    }
  }, [resetEditor]);

  /**
   * Handle saving the current carousel as a reusable template
   */
  const handleSaveTemplate = useCallback(
    async (data: { name: string; description?: string; category: string }) => {
      const fonts = template?.fonts || [];
      const brandColors = template?.brandColors || [];

      const result = await saveTemplate({
        name: data.name,
        description: data.description,
        category: data.category,
        slides,
        brandColors,
        fonts,
      });

      if (result) {
        toast.success('Template saved successfully');
        setShowSaveTemplateDialog(false);
      } else {
        toast.error('Failed to save template');
      }
    },
    [slides, template, saveTemplate]
  );

  // Get template colors for color picker
  const templateColors = template?.brandColors || [];

  return (
    <div className={cn('flex h-full', className)}>
      {/* Left panel: Icon rail + expandable content */}
      <EditorLeftPanel
        activeTab={activeLeftTab}
        onTabChange={setActiveLeftTab}
        onSelectTemplate={handleSelectTemplate}
        onOpenFullTemplatePreview={() => setShowTemplateModal(true)}
        currentTemplate={template}
        currentSlides={slides}
        onAiGenerated={handleAiGenerated}
        onOpenAdvancedAi={() => setShowAiGenerator(true)}
        onInsertImage={handleInsertGraphicImage}
        onInsertShape={handleInsertGraphicShape}
        slides={slides}
        currentSlideIndex={currentSlideIndex}
        onSlideSelect={setCurrentSlide}
        onAddSlide={addSlide}
        onDeleteSlide={deleteSlide}
        onDuplicateSlide={duplicateSlide}
        onReorderSlides={reorderSlides}
      />

      {/* Center: Canvas area with floating controls */}
      <div className="relative flex-1 overflow-hidden bg-[#f0f0f0] dark:bg-[#1a1a1a]">
        <div className="absolute inset-0 p-6">
          {currentSlide && (
            <CanvasStage
              ref={stageRef}
              slide={currentSlide}
              selectedElementId={selectedElementId}
              onElementSelect={selectElement}
              onElementUpdate={updateElement}
              zoom={zoom}
              showGrid={showGrid}
              onImageDrop={addImageElement}
            />
          )}
        </div>

        {/* Floating toolbar (bottom-center) */}
        <EditorFloatingToolbar
          zoom={zoom}
          showGrid={showGrid}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onToggleGrid={toggleGrid}
        />

        {/* Top actions (top-right) */}
        <EditorTopActions
          onReset={handleReset}
          onSaveTemplate={() => setShowSaveTemplateDialog(true)}
          onExport={() => setShowExportDialog(true)}
        />
      </div>

      {/* Right sidebar: Property panel */}
      <PropertyPanel
        selectedElement={selectedElement}
        currentSlide={currentSlide}
        templateColors={templateColors}
        onElementUpdate={handleElementUpdate}
        onSlideBackgroundChange={handleSlideBackgroundChange}
        onAddElement={addElement}
        onAddImageElement={addImageElement}
        onDeleteElement={deleteElement}
        onSwitchLeftTab={setActiveLeftTab}
      />

      {/* Template selector modal (first load + full preview) */}
      <TemplateSelectorModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Export dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        isExporting={isExporting}
        slideCount={slides.length}
        exportProgress={exportProgress}
      />

      {/* AI Content Generator dialog (advanced) */}
      <AiContentGenerator
        open={showAiGenerator}
        onOpenChange={setShowAiGenerator}
        onGenerated={handleAiGenerated}
        currentTemplate={template}
        currentSlides={slides}
      />

      {/* Save Template dialog */}
      <SaveTemplateDialog
        open={showSaveTemplateDialog}
        onOpenChange={setShowSaveTemplateDialog}
        onSave={handleSaveTemplate}
        isSaving={isSavingTemplate}
        brandColors={templateColors}
      />
    </div>
  );
}
