'use client';

/**
 * Canvas Image Element Component
 * Renders image elements with transformation handles
 * @module components/features/canvas-editor/canvas-image-element
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { CanvasImageElement as ImageElementType } from '@/types/canvas-editor';

/**
 * Props for the CanvasImageElement component
 */
interface CanvasImageElementProps {
  element: ImageElementType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onChange: (updates: Partial<ImageElementType>) => void;
}

/**
 * Canvas Image Element
 * Renders images with transformation handles for resize, rotate, and move
 * @param props - Component props
 * @returns Image element JSX
 */
export function CanvasImageElement({
  element,
  isSelected,
  onSelect,
  onChange,
}: CanvasImageElementProps) {
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Load image from src
  useEffect(() => {
    if (!element.src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setImage(img);
      setIsLoading(false);
    };

    img.onerror = () => {
      console.error('[CanvasImageElement] Failed to load image:', element.src);
      setHasError(true);
      setIsLoading(false);
    };

    img.src = element.src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [element.src]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  /**
   * Handle click to select element
   */
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(element.id);
    },
    [element.id, onSelect]
  );

  /**
   * Handle tap (touch) to select element
   */
  const handleTap = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.cancelBubble = true;
      onSelect(element.id);
    },
    [element.id, onSelect]
  );

  /**
   * Handle drag end to update position
   */
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({
        x: Math.round(e.target.x()),
        y: Math.round(e.target.y()),
      });
    },
    [onChange]
  );

  /**
   * Handle transform end to update size and rotation
   */
  const handleTransformEnd = useCallback(() => {
    const node = imageRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and update dimensions
    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      width: Math.round(Math.max(20, element.width * scaleX)),
      height: Math.round(Math.max(20, element.height * scaleY)),
      rotation: Math.round(node.rotation()),
    });
  }, [element.width, element.height, onChange]);

  // Don't render if loading or error
  if (isLoading || hasError || !image) {
    return null;
  }

  return (
    <>
      <KonvaImage
        ref={imageRef}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        image={image}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleTap}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        opacity={element.opacity ?? 1}
        visible={element.visible !== false}
      />

      {/* Transformer for resizing/rotating */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize to minimum size
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
          enabledAnchors={[
            'top-left',
            'top-center',
            'top-right',
            'middle-right',
            'bottom-right',
            'bottom-center',
            'bottom-left',
            'middle-left',
          ]}
          rotateEnabled={true}
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          keepRatio={false}
        />
      )}
    </>
  );
}
