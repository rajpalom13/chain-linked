'use client';

/**
 * Property Panel Component
 * Right sidebar for editing element and slide properties
 */

import { useState } from 'react';
import {
  IconTypography,
  IconSquare,
  IconPhoto,
  IconTrash,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconBold,
  IconItalic,
  IconPalette,
  IconBorderRadius,
  IconLoader2,
  IconPlus,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  CanvasElement,
  CanvasSlide,
  CanvasTextElement,
  CanvasShapeElement,
  CanvasImageElement,
  ElementType,
  TextAlign,
  DEFAULT_FONTS,
  DEFAULT_COLORS,
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

const DEFAULT_COLOR_PALETTE = [
  '#000000',
  '#ffffff',
  '#1e3a5f',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
];

/**
 * Color picker popover component
 */
function ColorPicker({
  color,
  onChange,
  templateColors,
}: {
  color: string;
  onChange: (color: string) => void;
  templateColors: string[];
}) {
  const [customColor, setCustomColor] = useState(color);

  const allColors = [...new Set([...templateColors, ...DEFAULT_COLOR_PALETTE])];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <div
            className="h-4 w-4 rounded border"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono text-xs">{color}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          {/* Preset colors */}
          <div>
            <Label className="text-xs text-muted-foreground">Preset Colors</Label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {allColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded border-2 transition-all',
                    color === c ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => onChange(c)}
                />
              ))}
            </div>
          </div>

          {/* Custom color input */}
          <div>
            <Label className="text-xs text-muted-foreground">Custom Color</Label>
            <div className="mt-2 flex gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="h-8 w-12 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#000000"
                className="h-8 flex-1 font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={() => onChange(customColor)}
                className="h-8"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
}: PropertyPanelProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  /**
   * Handle adding an image element from a URL
   * Loads the image to determine its natural dimensions, then calls
   * onAddImageElement with the URL and scaled dimensions
   */
  const handleImageFromUrl = () => {
    if (!imageUrl.trim() || !onAddImageElement) return;

    setIsLoadingUrl(true);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxSize = 500;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }
      onAddImageElement(imageUrl.trim(), Math.round(width), Math.round(height));
      setImageUrl('');
      setIsLoadingUrl(false);
    };
    img.onerror = () => {
      toast.error('Failed to load image from URL');
      setIsLoadingUrl(false);
    };
    img.src = imageUrl.trim();
  };

  /**
   * Handle image file upload
   */
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onAddImageElement) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type. Please select an image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      // Create a temporary image to get dimensions
      const img = new window.Image();
      img.onload = () => {
        // Scale image to fit canvas while maintaining aspect ratio
        const maxSize = 500;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        onAddImageElement(dataUrl, Math.round(width), Math.round(height));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // Reset the input
    event.target.value = '';
  };
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
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select an element to edit its properties, or add a new element:
                </p>

                {/* Add element buttons */}
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
                    asChild
                    className="flex flex-col gap-1 h-auto py-3 cursor-pointer"
                  >
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <IconPhoto className="h-5 w-5" />
                      <span className="text-xs">Image</span>
                    </label>
                  </Button>
                </div>

                {/* URL Image Input */}
                <div className="space-y-2 pt-3 border-t">
                  <Label className="text-xs text-muted-foreground">Add image from URL</Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://example.com/image.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="h-8 text-xs flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleImageFromUrl();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={handleImageFromUrl}
                      disabled={!imageUrl.trim() || isLoadingUrl}
                    >
                      {isLoadingUrl ? (
                        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <IconPlus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Slide Properties */}
          <TabsContent value="slide" className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-sm">Background Color</Label>
              <ColorPicker
                color={currentSlide.backgroundColor}
                onChange={onSlideBackgroundChange}
                templateColors={templateColors}
              />
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Add Elements</h4>
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
                  asChild
                  className="flex flex-col gap-1 h-auto py-3 cursor-pointer"
                >
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <IconPhoto className="h-5 w-5" />
                    <span className="text-xs">Image</span>
                  </label>
                </Button>
              </div>

              {/* URL Image Input */}
              <div className="space-y-2 pt-3 border-t mt-3">
                <Label className="text-xs text-muted-foreground">Add image from URL</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/image.png"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="h-8 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleImageFromUrl();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={handleImageFromUrl}
                    disabled={!imageUrl.trim() || isLoadingUrl}
                  >
                    {isLoadingUrl ? (
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <IconPlus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
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
        <ColorPicker
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
        <ColorPicker
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
          <ColorPicker
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
 * Image element properties
 */
function ImageProperties({
  element,
  onChange,
}: {
  element: CanvasImageElement;
  onChange: (updates: Partial<CanvasImageElement>) => void;
}) {
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
          <div className="relative aspect-square w-full overflow-hidden rounded border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={element.src}
              alt={element.alt || 'Preview'}
              className="h-full w-full object-contain"
            />
          </div>
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

      {/* Load from URL */}
      <div className="space-y-2">
        <Label className="text-xs">Load from URL</Label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Image URL"
            className="h-8 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const url = (e.target as HTMLInputElement).value.trim();
                if (url) onChange({ src: url });
              }
            }}
          />
        </div>
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
