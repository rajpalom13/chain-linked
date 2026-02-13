'use client';

/**
 * Property Panel Component
 * Right sidebar for editing element and slide properties
 * Uses EnhancedColorPicker and supports image tint colors
 */

import { useState, useCallback } from 'react';
import {
  IconTypography,
  IconSquare,
  IconPhoto,
  IconTrash,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconLoader2,
  IconScissors,
  IconCheck,
  IconTemplate,
  IconSparkles,
  IconUpload,
  IconLayoutList,
  IconPalette,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { removeImageBackground, type RemovalProgress } from '@/lib/image/background-removal';
import { EnhancedColorPicker } from './enhanced-color-picker';
import type {
  CanvasElement,
  CanvasSlide,
  CanvasTextElement,
  CanvasShapeElement,
  CanvasImageElement,
  ElementType,
  TextAlign,
  LeftPanelTab,
} from '@/types/canvas-editor';

const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
  'Poppins',
  'Raleway',
];

const FONT_WEIGHTS = [
  { label: 'Light', value: '300' },
  { label: 'Normal', value: 'normal' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: 'bold' },
];

/**
 * Props for the PropertyPanel component
 */
interface PropertyPanelProps {
  selectedElement: CanvasElement | null;
  currentSlide: CanvasSlide;
  templateColors: string[];
  onElementUpdate: (updates: Partial<CanvasElement>) => void;
  onSlideBackgroundChange: (color: string) => void;
  onAddElement: (type: ElementType) => void;
  onAddImageElement?: (src: string, width?: number, height?: number) => void;
  onDeleteElement: () => void;
  /** Callback to switch the left panel to a specific tab */
  onSwitchLeftTab?: (tab: LeftPanelTab) => void;
}

/**
 * Property Panel Component
 * Displays context-aware properties for the selected element
 */
export function PropertyPanel({
  selectedElement,
  currentSlide,
  templateColors,
  onElementUpdate,
  onSlideBackgroundChange,
  onAddElement,
  onAddImageElement,
  onDeleteElement,
  onSwitchLeftTab,
}: PropertyPanelProps) {
  return (
    <div className="flex h-full w-72 flex-col border-l bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">Properties</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="element" className="w-full">
          <TabsList className="mx-4 mt-3 grid w-[calc(100%-2rem)] grid-cols-2">
            <TabsTrigger value="element">Element</TabsTrigger>
            <TabsTrigger value="slide">Slide</TabsTrigger>
          </TabsList>

          {/* Element Properties */}
          <TabsContent value="element" className="space-y-4 p-4">
            {selectedElement ? (
              <>
                {/* Element type indicator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {selectedElement.type === 'text' && (
                    <>
                      <IconTypography className="h-4 w-4" />
                      Text Element
                    </>
                  )}
                  {selectedElement.type === 'shape' && (
                    <>
                      <IconSquare className="h-4 w-4" />
                      Shape Element
                    </>
                  )}
                  {selectedElement.type === 'image' && (
                    <>
                      <IconPhoto className="h-4 w-4" />
                      Image Element
                    </>
                  )}
                </div>

                {/* Text-specific properties */}
                {selectedElement.type === 'text' && (
                  <TextProperties
                    element={selectedElement as CanvasTextElement}
                    onChange={onElementUpdate}
                    templateColors={templateColors}
                  />
                )}

                {/* Shape-specific properties */}
                {selectedElement.type === 'shape' && (
                  <ShapeProperties
                    element={selectedElement as CanvasShapeElement}
                    onChange={onElementUpdate}
                    templateColors={templateColors}
                  />
                )}

                {/* Image-specific properties */}
                {selectedElement.type === 'image' && (
                  <ImageProperties
                    element={selectedElement as CanvasImageElement}
                    onChange={onElementUpdate}
                    templateColors={templateColors}
                  />
                )}

                {/* Common properties */}
                <CommonProperties
                  element={selectedElement}
                  onChange={onElementUpdate}
                />

                {/* Delete button */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={onDeleteElement}
                >
                  <IconTrash className="mr-2 h-4 w-4" />
                  Delete Element
                </Button>
              </>
            ) : (
              <NoElementSelected
                onAddElement={onAddElement}
                onSwitchLeftTab={onSwitchLeftTab}
              />
            )}
          </TabsContent>

          {/* Slide Properties */}
          <TabsContent value="slide" className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-sm">Background Color</Label>
              <EnhancedColorPicker
                color={currentSlide.backgroundColor}
                onChange={onSlideBackgroundChange}
                templateColors={templateColors}
              />
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Quick Add</h4>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddElement('text')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <IconTypography className="h-5 w-5" />
                  <span className="text-xs">Text</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddElement('shape')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <IconSquare className="h-5 w-5" />
                  <span className="text-xs">Shape</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSwitchLeftTab?.('uploads')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <IconUpload className="h-5 w-5" />
                  <span className="text-xs">Upload</span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * No element selected state with helpful quick-links
 */
function NoElementSelected({
  onAddElement,
  onSwitchLeftTab,
}: {
  onAddElement: (type: ElementType) => void;
  onSwitchLeftTab?: (tab: LeftPanelTab) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select an element on the canvas to edit its properties.
      </p>

      {/* Quick add element buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddElement('text')}
          className="flex flex-col gap-1 h-auto py-3"
        >
          <IconTypography className="h-5 w-5" />
          <span className="text-xs">Text</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddElement('shape')}
          className="flex flex-col gap-1 h-auto py-3"
        >
          <IconSquare className="h-5 w-5" />
          <span className="text-xs">Shape</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSwitchLeftTab?.('uploads')}
          className="flex flex-col gap-1 h-auto py-3"
        >
          <IconUpload className="h-5 w-5" />
          <span className="text-xs">Upload</span>
        </Button>
      </div>

      {/* Quick-link buttons to left panel tabs */}
      {onSwitchLeftTab && (
        <div className="pt-3 border-t space-y-1.5">
          <Label className="text-xs text-muted-foreground">Open Panel</Label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onSwitchLeftTab('templates')}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconTemplate className="h-3.5 w-3.5" />
              Templates
            </button>
            <button
              type="button"
              onClick={() => onSwitchLeftTab('ai')}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconSparkles className="h-3.5 w-3.5" />
              AI Generate
            </button>
            <button
              type="button"
              onClick={() => onSwitchLeftTab('graphics')}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconPhoto className="h-3.5 w-3.5" />
              Graphics
            </button>
            <button
              type="button"
              onClick={() => onSwitchLeftTab('slides')}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconLayoutList className="h-3.5 w-3.5" />
              Slides
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Text element properties
 */
function TextProperties({
  element,
  onChange,
  templateColors,
}: {
  element: CanvasTextElement;
  onChange: (updates: Partial<CanvasTextElement>) => void;
  templateColors: string[];
}) {
  return (
    <div className="space-y-4">
      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs">Font</Label>
        <Select
          value={element.fontFamily}
          onValueChange={(value) => onChange({ fontFamily: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size & Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Size</Label>
          <Input
            type="number"
            value={element.fontSize}
            onChange={(e) => onChange({ fontSize: parseInt(e.target.value) || 16 })}
            min={8}
            max={200}
            className="h-8"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Weight</Label>
          <Select
            value={element.fontWeight}
            onValueChange={(value) => onChange({ fontWeight: value as CanvasTextElement['fontWeight'] })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <Label className="text-xs">Color</Label>
        <EnhancedColorPicker
          color={element.fill}
          onChange={(color) => onChange({ fill: color })}
          templateColors={templateColors}
        />
      </div>

      {/* Alignment */}
      <div className="space-y-2">
        <Label className="text-xs">Alignment</Label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
            <Button
              key={align}
              variant={element.align === align ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => onChange({ align })}
            >
              {align === 'left' && <IconAlignLeft className="h-4 w-4" />}
              {align === 'center' && <IconAlignCenter className="h-4 w-4" />}
              {align === 'right' && <IconAlignRight className="h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Line Height</Label>
          <span className="text-xs text-muted-foreground">
            {(element.lineHeight || 1.2).toFixed(1)}
          </span>
        </div>
        <Slider
          value={[element.lineHeight || 1.2]}
          onValueChange={([value]) => onChange({ lineHeight: value })}
          min={0.8}
          max={3}
          step={0.1}
        />
      </div>
    </div>
  );
}

/**
 * Shape element properties
 */
function ShapeProperties({
  element,
  onChange,
  templateColors,
}: {
  element: CanvasShapeElement;
  onChange: (updates: Partial<CanvasShapeElement>) => void;
  templateColors: string[];
}) {
  return (
    <div className="space-y-4">
      {/* Shape Type */}
      <div className="space-y-2">
        <Label className="text-xs">Shape Type</Label>
        <Select
          value={element.shapeType}
          onValueChange={(value) => onChange({ shapeType: value as CanvasShapeElement['shapeType'] })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rect">Rectangle</SelectItem>
            <SelectItem value="circle">Circle</SelectItem>
            <SelectItem value="line">Line</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fill Color */}
      <div className="space-y-2">
        <Label className="text-xs">Fill Color</Label>
        <EnhancedColorPicker
          color={element.fill}
          onChange={(color) => onChange({ fill: color })}
          templateColors={templateColors}
        />
      </div>

      {/* Corner Radius (for rectangles) */}
      {element.shapeType === 'rect' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Corner Radius</Label>
            <span className="text-xs text-muted-foreground">
              {element.cornerRadius || 0}px
            </span>
          </div>
          <Slider
            value={[element.cornerRadius || 0]}
            onValueChange={([value]) => onChange({ cornerRadius: value })}
            min={0}
            max={200}
            step={1}
          />
        </div>
      )}

      {/* Stroke */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Stroke Width</Label>
          <span className="text-xs text-muted-foreground">
            {element.strokeWidth || 0}px
          </span>
        </div>
        <Slider
          value={[element.strokeWidth || 0]}
          onValueChange={([value]) => onChange({ strokeWidth: value })}
          min={0}
          max={20}
          step={1}
        />
      </div>

      {(element.strokeWidth || 0) > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Stroke Color</Label>
          <EnhancedColorPicker
            color={element.stroke || '#000000'}
            onChange={(color) => onChange({ stroke: color })}
            templateColors={templateColors}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Image element properties with tint color support
 */
function ImageProperties({
  element,
  onChange,
  templateColors,
}: {
  element: CanvasImageElement;
  onChange: (updates: Partial<CanvasImageElement>) => void;
  templateColors: string[];
}) {
  const [bgRemovalState, setBgRemovalState] = useState<
    'idle' | 'downloading' | 'processing' | 'done'
  >('idle');
  const [bgRemovalProgress, setBgRemovalProgress] = useState(0);

  const handleRemoveBackground = useCallback(async () => {
    if (!element.src || bgRemovalState !== 'idle') return;

    setBgRemovalState('downloading');
    setBgRemovalProgress(0);

    try {
      const resultDataUrl = await removeImageBackground(
        element.src,
        (p: RemovalProgress) => {
          setBgRemovalState(p.phase);
          setBgRemovalProgress(Math.round(p.progress * 100));
        },
      );

      onChange({ src: resultDataUrl });
      setBgRemovalState('done');
      toast.success('Background removed successfully');

      setTimeout(() => setBgRemovalState('idle'), 2000);
    } catch (err) {
      console.error('[BgRemoval] Failed:', err);
      toast.error('Failed to remove background. Try a different image.');
      setBgRemovalState('idle');
    }
  }, [element.src, bgRemovalState, onChange]);

  const isBusy = bgRemovalState === 'downloading' || bgRemovalState === 'processing';

  // Show tint for small images (icons) or SVG data URLs
  const isIcon =
    (element.width <= 120 && element.height <= 120) ||
    element.src?.startsWith('data:image/svg');

  return (
    <div className="space-y-4">
      {/* Alt Text */}
      <div className="space-y-2">
        <Label className="text-xs">Alt Text</Label>
        <Input
          type="text"
          value={element.alt || ''}
          onChange={(e) => onChange({ alt: e.target.value })}
          placeholder="Describe the image"
          className="h-8"
        />
      </div>

      {/* Image Preview */}
      {element.src && (
        <div className="space-y-2">
          <Label className="text-xs">Preview</Label>
          <div className="relative aspect-square w-full overflow-hidden rounded border bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={element.src}
              alt={element.alt || 'Preview'}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Tint Color (for icons/small images) */}
      {isIcon && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1">
              <IconPalette className="h-3 w-3" />
              Tint Color
            </Label>
            {element.tintColor && (
              <button
                type="button"
                onClick={() => onChange({ tintColor: undefined })}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <EnhancedColorPicker
            color={element.tintColor || '#000000'}
            onChange={(color) => onChange({ tintColor: color })}
            templateColors={templateColors}
          />
        </div>
      )}

      {/* Remove Background */}
      {element.src && (
        <div className="space-y-2">
          <Label className="text-xs">Background</Label>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleRemoveBackground}
            disabled={isBusy}
          >
            {bgRemovalState === 'idle' && (
              <>
                <IconScissors className="mr-2 h-4 w-4" />
                Remove Background
              </>
            )}
            {bgRemovalState === 'downloading' && (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading model... {bgRemovalProgress}%
              </>
            )}
            {bgRemovalState === 'processing' && (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing... {bgRemovalProgress}%
              </>
            )}
            {bgRemovalState === 'done' && (
              <>
                <IconCheck className="mr-2 h-4 w-4" />
                Done!
              </>
            )}
          </Button>
          {isBusy && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${bgRemovalProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Replace Image */}
      <div className="space-y-2">
        <Label className="text-xs">Replace Image</Label>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full cursor-pointer"
        >
          <label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string;
                  if (dataUrl) {
                    onChange({ src: dataUrl });
                  }
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            <IconPhoto className="mr-2 h-4 w-4" />
            Choose New Image
          </label>
        </Button>
      </div>
    </div>
  );
}

/**
 * Common element properties (position, size, rotation, opacity)
 */
function CommonProperties({
  element,
  onChange,
}: {
  element: CanvasElement;
  onChange: (updates: Partial<CanvasElement>) => void;
}) {
  return (
    <div className="space-y-4 border-t pt-4">
      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">X Position</Label>
          <Input
            type="number"
            value={Math.round(element.x)}
            onChange={(e) => onChange({ x: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Y Position</Label>
          <Input
            type="number"
            value={Math.round(element.y)}
            onChange={(e) => onChange({ y: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Width</Label>
          <Input
            type="number"
            value={Math.round(element.width)}
            onChange={(e) => onChange({ width: parseInt(e.target.value) || 100 })}
            min={10}
            className="h-8"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Height</Label>
          <Input
            type="number"
            value={Math.round(element.height)}
            onChange={(e) => onChange({ height: parseInt(e.target.value) || 100 })}
            min={10}
            className="h-8"
          />
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Rotation</Label>
          <span className="text-xs text-muted-foreground">{element.rotation}°</span>
        </div>
        <Slider
          value={[element.rotation]}
          onValueChange={([value]) => onChange({ rotation: value })}
          min={-180}
          max={180}
          step={1}
        />
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Opacity</Label>
          <span className="text-xs text-muted-foreground">
            {Math.round((element.opacity ?? 1) * 100)}%
          </span>
        </div>
        <Slider
          value={[(element.opacity ?? 1) * 100]}
          onValueChange={([value]) => onChange({ opacity: value / 100 })}
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
}
