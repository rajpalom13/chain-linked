'use client';

/**
 * Graphics Panel Component
 * Inline graphics library (photos, icons, shapes) for the editor left panel
 * Migrated from GraphicsLibraryPanel overlay to inline panel
 * @module components/features/canvas-editor/panel-graphics
 */

import { useState, useCallback, useEffect } from 'react';
import {
  IconSearch,
  IconPhoto,
  IconIcons,
  IconShape,
  IconLoader2,
  IconAlertCircle,
  IconExternalLink,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGraphicsLibrary } from '@/hooks/use-graphics-library';
import type {
  UnsplashImage,
  IconAsset,
  ShapeAsset,
  GraphicsTab,
  PhotoCategory,
  IconCategory,
  ShapeCategory,
  ShapeElementConfig,
} from '@/types/graphics-library';

const PHOTO_CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: 'business', label: 'Business' },
  { value: 'technology', label: 'Tech' },
  { value: 'nature', label: 'Nature' },
  { value: 'people', label: 'People' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'workspace', label: 'Workspace' },
];

const ICON_CATEGORIES: { value: IconCategory; label: string }[] = [
  { value: 'business', label: 'Business' },
  { value: 'social', label: 'Social' },
  { value: 'arrows', label: 'Arrows' },
  { value: 'communication', label: 'Comms' },
  { value: 'charts', label: 'Charts' },
  { value: 'general', label: 'General' },
];

const SHAPE_CATEGORIES: { value: ShapeCategory; label: string }[] = [
  { value: 'dividers', label: 'Dividers' },
  { value: 'badges', label: 'Badges' },
  { value: 'frames', label: 'Frames' },
  { value: 'arrows', label: 'Arrows' },
  { value: 'decorative', label: 'Decorative' },
];

/**
 * Props for the PanelGraphics component
 */
interface PanelGraphicsProps {
  onInsertImage: (src: string, width: number, height: number) => void;
  onInsertShape: (config: ShapeElementConfig) => void;
}

/**
 * Inline graphics library panel
 * Photos, icons, and shapes with search and category filtering
 * @param props - Component props
 * @returns Graphics panel JSX
 */
export function PanelGraphics({ onInsertImage, onInsertShape }: PanelGraphicsProps) {
  const [activeTab, setActiveTab] = useState<GraphicsTab>('photos');
  const [photoQuery, setPhotoQuery] = useState('business');
  const [photoLocalQuery, setPhotoLocalQuery] = useState('business');
  const [currentPhotoPage, setCurrentPhotoPage] = useState(1);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<PhotoCategory | null>(null);

  const {
    photos,
    isLoadingPhotos,
    totalPages,
    photosError,
    searchPhotos,
    icons,
    searchIcons,
    filterIconsByCategory,
    iconQuery,
    iconCategory,
    shapes,
    searchShapes,
    filterShapesByCategory,
    shapeQuery,
    shapeCategory,
  } = useGraphicsLibrary();

  // Initial photo search
  useEffect(() => {
    if (photos.length === 0) {
      searchPhotos('business', 1);
    }
  }, [photos.length, searchPhotos]);

  const handlePhotoSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (photoLocalQuery.trim()) {
        setPhotoQuery(photoLocalQuery.trim());
        setCurrentPhotoPage(1);
        setSelectedPhotoCategory(null);
        searchPhotos(photoLocalQuery.trim(), 1);
      }
    },
    [photoLocalQuery, searchPhotos]
  );

  const handlePhotoCategoryClick = useCallback(
    (category: PhotoCategory) => {
      if (selectedPhotoCategory === category) {
        setSelectedPhotoCategory(null);
        setCurrentPhotoPage(1);
        searchPhotos(photoQuery || 'business', 1);
      } else {
        setSelectedPhotoCategory(category);
        setCurrentPhotoPage(1);
        searchPhotos(category, 1);
      }
    },
    [selectedPhotoCategory, photoQuery, searchPhotos]
  );

  const handleLoadMorePhotos = useCallback(() => {
    const nextPage = currentPhotoPage + 1;
    setCurrentPhotoPage(nextPage);
    searchPhotos(selectedPhotoCategory || photoQuery || 'business', nextPage);
  }, [currentPhotoPage, selectedPhotoCategory, photoQuery, searchPhotos]);

  const handleInsertPhoto = useCallback(
    (photo: UnsplashImage) => {
      onInsertImage(photo.urls.regular, photo.width, photo.height);
    },
    [onInsertImage]
  );

  const handleInsertIcon = useCallback(
    (icon: IconAsset) => {
      onInsertImage(icon.svgDataUrl, 80, 80);
    },
    [onInsertImage]
  );

  const handleInsertShape = useCallback(
    (shape: ShapeAsset) => {
      onInsertShape(shape.element);
    },
    [onInsertShape]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="shrink-0 border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Graphics</h3>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as GraphicsTab)}
          className="flex flex-1 flex-col min-h-0"
        >
          <TabsList className="mx-3 mt-2 grid w-auto grid-cols-3">
            <TabsTrigger value="photos" className="gap-1 text-[10px]">
              <IconPhoto className="h-3 w-3" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="icons" className="gap-1 text-[10px]">
              <IconIcons className="h-3 w-3" />
              Icons
            </TabsTrigger>
            <TabsTrigger value="shapes" className="gap-1 text-[10px]">
              <IconShape className="h-3 w-3" />
              Shapes
            </TabsTrigger>
          </TabsList>

          {/* Photos tab */}
          <TabsContent value="photos" className="mt-0 flex flex-1 flex-col min-h-0">
            <div className="flex flex-1 flex-col min-h-0 p-3 pt-2">
              <form onSubmit={handlePhotoSearch} className="mb-2">
                <div className="relative">
                  <IconSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search photos..."
                    value={photoLocalQuery}
                    onChange={(e) => setPhotoLocalQuery(e.target.value)}
                    className="h-9 pl-8 text-xs"
                  />
                </div>
              </form>
              <div className="mb-2 flex flex-wrap gap-1">
                {PHOTO_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.value}
                    variant={selectedPhotoCategory === cat.value ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px] px-2 py-0"
                    onClick={() => handlePhotoCategoryClick(cat.value)}
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
              {photosError && (
                <div className="mb-2 flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{photosError}</span>
                </div>
              )}
              <div className="relative flex-1 min-h-0">
                <ScrollArea className="absolute inset-0">
                  <div className="grid grid-cols-2 gap-1.5">
                    {photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="group relative aspect-square overflow-hidden rounded-md bg-muted"
                        onClick={() => handleInsertPhoto(photo)}
                      >
                        <img
                          src={photo.urls.thumb}
                          alt={photo.alt_description || 'Photo'}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex w-full items-center p-1.5">
                            <a
                              href={`${photo.user.links.html}?utm_source=chainlinked&utm_medium=referral`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-0.5 text-[9px] text-white hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {photo.user.name}
                              <IconExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {isLoadingPhotos && (
                    <div className="flex items-center justify-center py-6">
                      <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!isLoadingPhotos && photos.length > 0 && currentPhotoPage < totalPages && (
                    <div className="py-3 text-center">
                      <Button variant="outline" size="sm" onClick={handleLoadMorePhotos} className="text-xs">
                        Load more
                      </Button>
                    </div>
                  )}
                  {!isLoadingPhotos && photos.length === 0 && !photosError && (
                    <div className="flex flex-col items-center py-10 text-center">
                      <IconPhoto className="mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">No photos found.</p>
                    </div>
                  )}
                  {photos.length > 0 && (
                    <p className="py-2 text-center text-[10px] text-muted-foreground">
                      Photos by{' '}
                      <a
                        href="https://unsplash.com/?utm_source=chainlinked&utm_medium=referral"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Unsplash
                      </a>
                    </p>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Icons tab */}
          <TabsContent value="icons" className="mt-0 flex flex-1 flex-col min-h-0">
            <div className="flex flex-1 flex-col min-h-0 p-3 pt-2">
              <div className="relative mb-2">
                <IconSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search icons..."
                  value={iconQuery}
                  onChange={(e) => searchIcons(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {ICON_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.value}
                    variant={iconCategory === cat.value ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px] px-2 py-0"
                    onClick={() =>
                      filterIconsByCategory(iconCategory === cat.value ? null : cat.value)
                    }
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
              <div className="relative flex-1 min-h-0">
                <ScrollArea className="absolute inset-0">
                  <div className="grid grid-cols-4 gap-1">
                    {icons.map((icon) => (
                      <Tooltip key={icon.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="flex aspect-square items-center justify-center rounded-md bg-muted/60 p-2 transition-colors hover:bg-accent"
                            onClick={() => handleInsertIcon(icon)}
                          >
                            <img
                              src={icon.svgDataUrl}
                              alt={icon.name}
                              className="h-5 w-5"
                              style={{
                                filter: 'invert(40%) sepia(0%) saturate(0%) brightness(60%) contrast(90%)',
                              }}
                              loading="lazy"
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {icon.name}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  {icons.length === 0 && (
                    <div className="flex flex-col items-center py-10 text-center">
                      <IconIcons className="mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">No icons match.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Shapes tab */}
          <TabsContent value="shapes" className="mt-0 flex flex-1 flex-col min-h-0">
            <div className="flex flex-1 flex-col min-h-0 p-3 pt-2">
              <div className="relative mb-2">
                <IconSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search shapes..."
                  value={shapeQuery}
                  onChange={(e) => searchShapes(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {SHAPE_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.value}
                    variant={shapeCategory === cat.value ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px] px-2 py-0"
                    onClick={() =>
                      filterShapesByCategory(shapeCategory === cat.value ? null : cat.value)
                    }
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
              <div className="relative flex-1 min-h-0">
                <ScrollArea className="absolute inset-0">
                  <div className="grid grid-cols-3 gap-1.5">
                    {shapes.map((shape) => (
                      <Tooltip key={shape.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="flex aspect-square items-center justify-center rounded-md border bg-muted/30 p-2 transition-colors hover:bg-accent"
                            onClick={() => handleInsertShape(shape)}
                          >
                            <div
                              className="flex h-full w-full items-center justify-center"
                              dangerouslySetInnerHTML={{ __html: shape.previewSvg }}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {shape.name}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  {shapes.length === 0 && (
                    <div className="flex flex-col items-center py-10 text-center">
                      <IconShape className="mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">No shapes match.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
