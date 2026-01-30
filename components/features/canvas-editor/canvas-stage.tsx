'use client';

/**
 * Canvas Stage Component
 * Konva stage wrapper with responsive sizing and grid overlay
 */

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import type Konva from 'konva';
import { CanvasTextElement } from './canvas-text-element';
import { CanvasShapeElement } from './canvas-shape-element';
import type { CanvasSlide, CanvasElement, CANVAS_DIMENSIONS } from '@/types/canvas-editor';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;
const GRID_SIZE = 40;

/**
 * Props for the CanvasStage component
 */
interface CanvasStageProps {
  slide: CanvasSlide;
  selectedElementId: string | null;
  onElementSelect: (id: string | null) => void;
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void;
  zoom: number;
  showGrid: boolean;
}

/**
 * Ref type for accessing the Konva stage
 */
export interface CanvasStageRef {
  getStage: () => Konva.Stage | null;
}

/**
 * Canvas Stage Component
 * Renders the Konva canvas with all slide elements
 */
export const CanvasStage = forwardRef<CanvasStageRef, CanvasStageProps>(
  function CanvasStage(
    { slide, selectedElementId, onElementSelect, onElementUpdate, zoom, showGrid },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const [scale, setScale] = useState(1);

    // Expose stage ref to parent
    useImperativeHandle(ref, () => ({
      getStage: () => stageRef.current,
    }));

    // Calculate responsive scale
    useEffect(() => {
      const updateScale = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth;
          const containerHeight = containerRef.current.offsetHeight;
          const scaleX = containerWidth / CANVAS_WIDTH;
          const scaleY = containerHeight / CANVAS_HEIGHT;
          const newScale = Math.min(scaleX, scaleY, 0.9) * zoom;
          setScale(newScale);
        }
      };

      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }, [zoom]);

    /**
     * Handle click on stage background to deselect
     */
    const handleStageClick = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Only deselect if clicking directly on the stage background
        if (e.target === e.target.getStage()) {
          onElementSelect(null);
        }
      },
      [onElementSelect]
    );

    /**
     * Handle tap (touch) on stage background to deselect
     */
    const handleStageTap = useCallback(
      (e: Konva.KonvaEventObject<TouchEvent>) => {
        // Only deselect if tapping directly on the stage background
        if (e.target === e.target.getStage()) {
          onElementSelect(null);
        }
      },
      [onElementSelect]
    );

    /**
     * Handle element selection
     */
    const handleElementSelect = useCallback(
      (id: string) => {
        onElementSelect(id);
      },
      [onElementSelect]
    );

    /**
     * Handle element update
     */
    const handleElementChange = useCallback(
      (elementId: string, updates: Partial<CanvasElement>) => {
        onElementUpdate(elementId, updates);
      },
      [onElementUpdate]
    );

    /**
     * Render grid lines
     */
    const renderGrid = () => {
      if (!showGrid) return null;

      const lines = [];
      const gridColor = '#e5e7eb';

      // Vertical lines
      for (let i = 0; i <= CANVAS_WIDTH; i += GRID_SIZE) {
        lines.push(
          <Line
            key={`v-${i}`}
            points={[i, 0, i, CANVAS_HEIGHT]}
            stroke={gridColor}
            strokeWidth={0.5}
            listening={false}
          />
        );
      }

      // Horizontal lines
      for (let i = 0; i <= CANVAS_HEIGHT; i += GRID_SIZE) {
        lines.push(
          <Line
            key={`h-${i}`}
            points={[0, i, CANVAS_WIDTH, i]}
            stroke={gridColor}
            strokeWidth={0.5}
            listening={false}
          />
        );
      }

      return lines;
    };

    /**
     * Render elements based on their type
     */
    const renderElement = (element: CanvasElement) => {
      const isSelected = selectedElementId === element.id;

      switch (element.type) {
        case 'text':
          return (
            <CanvasTextElement
              key={element.id}
              element={element}
              isSelected={isSelected}
              onSelect={handleElementSelect}
              onChange={(updates) => handleElementChange(element.id, updates)}
            />
          );
        case 'shape':
          return (
            <CanvasShapeElement
              key={element.id}
              element={element}
              isSelected={isSelected}
              onSelect={handleElementSelect}
              onChange={(updates) => handleElementChange(element.id, updates)}
            />
          );
        case 'image':
          // TODO: Implement image element
          return null;
        default:
          return null;
      }
    };

    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center overflow-hidden bg-muted/30 p-4"
      >
        <div
          className="shadow-2xl"
          style={{
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
          }}
        >
          <Stage
            ref={stageRef}
            width={CANVAS_WIDTH * scale}
            height={CANVAS_HEIGHT * scale}
            scaleX={scale}
            scaleY={scale}
            onClick={handleStageClick}
            onTap={handleStageTap}
          >
            <Layer>
              {/* Background */}
              <Rect
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill={slide.backgroundColor}
                listening={false}
              />

              {/* Grid overlay */}
              {renderGrid()}

              {/* Elements (sorted by z-index if needed) */}
              {slide.elements.map(renderElement)}
            </Layer>
          </Stage>
        </div>
      </div>
    );
  }
);
