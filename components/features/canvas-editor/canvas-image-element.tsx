'use client';

/**
 * Canvas Image Element Component
 * Renders image elements with transformation handles
 * @module components/features/canvas-editor/canvas-image-element
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { CanvasImageElement as ImageElementType } from '@/types/canvas-editor';

/**
 * Create a tinted version of an image using an offscreen canvas.
 * Draws the original image, then composites a solid color on top
 * using 'source-atop' so only opaque pixels are tinted.
 * @param img - Source image element
 * @param tintColor - Hex color to apply as tint
 * @returns Tinted HTMLCanvasElement or null on failure
 */
function createTintedImage(
  img: HTMLImageElement,
  tintColor: string
): HTMLCanvasElement | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw original image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Tint: fill only the opaque parts
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
  } catch {
    return null;
  }
}

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

  // Create tinted image when tintColor is set
  const tintedImage = useMemo(() => {
    if (!image || !element.tintColor) return null;
    return createTintedImage(image, element.tintColor);
  }, [image, element.tintColor]);

  // Load image from src, proxying external URLs to avoid CORS issues
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

      // Auto-adjust dimensions to match natural aspect ratio (e.g., for logos)
      if (element.preserveAspectRatio && img.naturalWidth && img.naturalHeight) {
        const natRatio = img.naturalWidth / img.naturalHeight;
        const boxW = element.width;
        const boxH = element.height;

        let fitW: number, fitH: number;
        if (boxW / boxH > natRatio) {
          // Box is wider than image — fit by height
          fitH = boxH;
          fitW = Math.round(boxH * natRatio);
        } else {
          // Box is taller than image — fit by width
          fitW = boxW;
          fitH = Math.round(boxW / natRatio);
        }

        if (fitW !== element.width || fitH !== element.height) {
          onChange({ width: fitW, height: fitH } as Partial<ImageElementType>);
        }
      }
    };

    img.onerror = () => {
      console.error('[CanvasImageElement] Failed to load image:', element.src);
      setHasError(true);
      setIsLoading(false);
    };

    // Proxy external URLs through our API to bypass CORS restrictions
    const isExternal = element.src.startsWith('http') && !element.src.includes(window.location.host);
    img.src = isExternal
      ? `/api/proxy-image?url=${encodeURIComponent(element.src)}`
      : element.src;

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
        image={tintedImage || image}
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
          keepRatio={!!element.preserveAspectRatio}
        />
      )}
    </>
  );
}
