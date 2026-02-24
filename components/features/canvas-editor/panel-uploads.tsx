'use client';

/**
 * Uploads Panel Component
 * Drag-and-drop image upload panel for the editor left panel
 * @module components/features/canvas-editor/panel-uploads
 */

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  IconUpload,
  IconLink,
  IconPlus,
  IconLoader2,
  IconTrash,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * An uploaded image record
 */
interface UploadedImage {
  id: string;
  src: string;
  name: string;
  width: number;
  height: number;
}

/**
 * Props for the PanelUploads component
 */
interface PanelUploadsProps {
  onInsertImage: (src: string, width: number, height: number) => void;
}

/**
 * Uploads panel with drag-and-drop, file picker, URL input, and gallery
 * @param props - Component props
 * @returns Upload panel JSX
 */
export function PanelUploads({ onInsertImage }: PanelUploadsProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Process an image file to create an uploaded image record
   * Uses object URLs instead of data URLs for better memory efficiency
   */
  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }

      const objectUrl = URL.createObjectURL(file);

      const img = new window.Image();
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

        const uploaded: UploadedImage = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          src: objectUrl,
          name: file.name,
          width: Math.round(width),
          height: Math.round(height),
        };

        setUploadedImages((prev) => [uploaded, ...prev]);
        onInsertImage(objectUrl, Math.round(width), Math.round(height));
        toast.success('Image added to canvas');
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        toast.error('Failed to load image');
      };
      img.src = objectUrl;
    },
    [onInsertImage]
  );

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((f) => f.type.startsWith('image/'));
      if (imageFile) {
        processFile(imageFile);
      }
    },
    [processFile]
  );

  /**
   * Handle file input change
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      e.target.value = '';
    },
    [processFile]
  );

  /**
   * Handle URL image add
   */
  const handleAddFromUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;

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

      const uploaded: UploadedImage = {
        id: `url-${Date.now()}`,
        src: url,
        name: new URL(url).pathname.split('/').pop() || 'image',
        width: Math.round(width),
        height: Math.round(height),
      };

      setUploadedImages((prev) => [uploaded, ...prev]);
      onInsertImage(url, Math.round(width), Math.round(height));
      setUrlInput('');
      setIsLoadingUrl(false);
      toast.success('Image added to canvas');
    };
    img.onerror = () => {
      toast.error('Failed to load image from URL');
      setIsLoadingUrl(false);
    };
    img.src = url;
  }, [urlInput, onInsertImage]);

  /**
   * Re-insert a previously uploaded image
   */
  const handleReinsert = useCallback(
    (image: UploadedImage) => {
      onInsertImage(image.src, image.width, image.height);
      toast.success('Image re-inserted');
    },
    [onInsertImage]
  );

  /**
   * Remove an image from the gallery, revoking its object URL if applicable
   */
  const handleRemoveFromGallery = useCallback((id: string) => {
    setUploadedImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove && imageToRemove.src.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.src);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Uploads</h3>
      </div>

      <div className="relative flex-1 min-h-0">
        <ScrollArea className="absolute inset-0">
          <div className="space-y-4 p-4">
          {/* Drag-and-drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex h-[140px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              isDragOver
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
          >
            <IconUpload
              className={cn(
                'mb-2 h-8 w-8',
                isDragOver ? 'text-primary' : 'text-muted-foreground/50'
              )}
            />
            <p className="text-xs text-muted-foreground">
              {isDragOver ? 'Drop image here' : 'Drag & drop images here'}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/60">Max 5MB</p>
          </div>

          {/* Choose file button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconPlus className="mr-2 h-4 w-4" />
            Choose File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* URL input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <IconLink className="h-3 w-3" />
              From URL
            </Label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com/image.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFromUrl();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={handleAddFromUrl}
                disabled={!urlInput.trim() || isLoadingUrl}
              >
                {isLoadingUrl ? (
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Add'
                )}
              </Button>
            </div>
          </div>

          {/* Uploaded images gallery */}
          {uploadedImages.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">
                Uploaded ({uploadedImages.length})
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {uploadedImages.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                  >
                    <button
                      type="button"
                      className="h-full w-full"
                      onClick={() => handleReinsert(image)}
                    >
                        <Image
                        src={image.src}
                        alt={image.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromGallery(image.id)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <IconTrash className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
