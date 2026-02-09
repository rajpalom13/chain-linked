'use client';

/**
 * Graphics Library Panel Component
 * A slide-out side panel for browsing and inserting photos, icons, and shapes
 * into the carousel canvas editor. Overlays the property panel when open.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  IconX,
  IconSearch,
  IconPhoto,
  IconIcons,
  IconShape,
  IconLoader2,
  IconAlertCircle,
  IconExternalLink,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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

/**
 * Props for the GraphicsLibraryPanel component
 * @param open - Whether the panel is visible
 * @param onClose - Callback to close the panel
 * @param onInsertImage - Callback when a photo or icon is inserted (src, width, height)
 * @param onInsertShape - Callback when a shape is inserted (element config)
 */
interface GraphicsLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onInsertImage: (src: string, width: number, height: number) => void;
  onInsertShape: (config: ShapeElementConfig) => void;
}

/** Photo category options for quick filters */
const PHOTO_CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: 'business', label: 'Business' },
  { value: 'technology', label: 'Tech' },
  { value: 'nature', label: 'Nature' },
  { value: 'people', label: 'People' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'workspace', label: 'Workspace' },
];

/** Icon category options for quick filters */
const ICON_CATEGORIES: { value: IconCategory; label: string }[] = [
  { value: 'business', label: 'Business' },
  { value: 'social', label: 'Social' },
  { value: 'arrows', label: 'Arrows' },
  { value: 'communication', label: 'Comms' },
  { value: 'charts', label: 'Charts' },
  { value: 'general', label: 'General' },
];

/** Shape category options for quick filters */
const SHAPE_CATEGORIES: { value: ShapeCategory; label: string }[] = [
  { value: 'dividers', label: 'Dividers' },
  { value: 'badges', label: 'Badges' },
  { value: 'frames', label: 'Frames' },
  { value: 'arrows', label: 'Arrows' },
  { value: 'decorative', label: 'Decorative' },
];

/**
 * Graphics Library Panel
 * Provides a tabbed interface for browsing photos, icons, and shapes
 * with search, category filtering, and click-to-insert functionality.
 *
 * @param props - Panel props including open state, close handler, and insertion callbacks
 * @returns Slide-out panel JSX element
 * @example
 * <GraphicsLibraryPanel
 *   open={showPanel}
 *   onClose={() => setShowPanel(false)}
 *   onInsertImage={handleInsertImage}
 *   onInsertShape={handleInsertShape}
 * />
 */
export function GraphicsLibraryPanel({
  open,
  onClose,
  onInsertImage,
  onInsertShape,
}: GraphicsLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState<GraphicsTab>('photos');
  const [photoQuery, setPhotoQuery] = useState('business');
  const [currentPhotoPage, setCurrentPhotoPage] = useState(1);
  const [selectedPhotoCategory, setSelectedPhotoCategory] =
    useState<PhotoCategory | null>(null);

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

  // Trigger initial photo search when panel opens
  useEffect(() => {
    if (open && photos.length === 0) {
      searchPhotos('business', 1);
    }
  }, [open, photos.length, searchPhotos]);

  /**
   * Handle photo search form submission
   */
  const handlePhotoSearch = useCallback(
    (query: string) => {
      setPhotoQuery(query);
      setCurrentPhotoPage(1);
      setSelectedPhotoCategory(null);
      searchPhotos(query, 1);
    },
    [searchPhotos]
  );

  /**
   * Handle photo category quick filter click
   */
  const handlePhotoCategoryClick = useCallback(
    (category: PhotoCategory) => {
      if (selectedPhotoCategory === category) {
        // Deselect: search with current query
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

  /**
   * Load more photo results (next page)
   */
  const handleLoadMorePhotos = useCallback(() => {
    const nextPage = currentPhotoPage + 1;
    setCurrentPhotoPage(nextPage);
    searchPhotos(selectedPhotoCategory || photoQuery || 'business', nextPage);
  }, [currentPhotoPage, selectedPhotoCategory, photoQuery, searchPhotos]);

  /**
   * Insert an Unsplash photo into the canvas
   */
  const handleInsertPhoto = useCallback(
    (photo: UnsplashImage) => {
      // Use the regular size URL for good quality without being too large
      onInsertImage(photo.urls.regular, photo.width, photo.height);
    },
    [onInsertImage]
  );

  /**
   * Insert an icon into the canvas as an image element
   */
  const handleInsertIcon = useCallback(
    (icon: IconAsset) => {
      // Insert icon as image at a reasonable size for a carousel slide
      onInsertImage(icon.svgDataUrl, 80, 80);
    },
    [onInsertImage]
  );

  /**
   * Insert a shape into the canvas
   */
  const handleInsertShapeAsset = useCallback(
    (shape: ShapeAsset) => {
      onInsertShape(shape.element);
    },
    [onInsertShape]
  );

  if (!open) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'absolute right-0 top-0 z-40 flex h-full w-80 flex-col border-l bg-background shadow-xl',
          'animate-in slide-in-from-right duration-200'
        )}
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <h3 className="text-sm font-semibold">Graphics Library</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <IconX className="h-4 w-4" />
            <span className="sr-only">Close graphics library</span>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as GraphicsTab)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-3 mt-2 grid w-auto grid-cols-3">
            <TabsTrigger value="photos" className="gap-1.5 text-xs">
              <IconPhoto className="h-3.5 w-3.5" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="icons" className="gap-1.5 text-xs">
              <IconIcons className="h-3.5 w-3.5" />
              Icons
            </TabsTrigger>
            <TabsTrigger value="shapes" className="gap-1.5 text-xs">
              <IconShape className="h-3.5 w-3.5" />
              Shapes
            </TabsTrigger>
          </TabsList>

          {/* Photos Tab */}
          <TabsContent
            value="photos"
            className="mt-0 flex flex-1 flex-col overflow-hidden"
          >
            <PhotosTabContent
              photos={photos}
              isLoading={isLoadingPhotos}
              totalPages={totalPages}
              currentPage={currentPhotoPage}
              error={photosError}
              query={photoQuery}
              selectedCategory={selectedPhotoCategory}
              onSearch={handlePhotoSearch}
              onCategoryClick={handlePhotoCategoryClick}
              onLoadMore={handleLoadMorePhotos}
              onInsert={handleInsertPhoto}
            />
          </TabsContent>

          {/* Icons Tab */}
          <TabsContent
            value="icons"
            className="mt-0 flex flex-1 flex-col overflow-hidden"
          >
            <IconsTabContent
              icons={icons}
              query={iconQuery}
              selectedCategory={iconCategory}
              onSearch={searchIcons}
              onCategoryClick={filterIconsByCategory}
              onInsert={handleInsertIcon}
            />
          </TabsContent>

          {/* Shapes Tab */}
          <TabsContent
            value="shapes"
            className="mt-0 flex flex-1 flex-col overflow-hidden"
          >
            <ShapesTabContent
              shapes={shapes}
              query={shapeQuery}
              selectedCategory={shapeCategory}
              onSearch={searchShapes}
              onCategoryClick={filterShapesByCategory}
              onInsert={handleInsertShapeAsset}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Photos Tab
// ============================================================================

/**
 * Props for the PhotosTabContent sub-component
 */
interface PhotosTabContentProps {
  photos: UnsplashImage[];
  isLoading: boolean;
  totalPages: number;
  currentPage: number;
  error: string | null;
  query: string;
  selectedCategory: PhotoCategory | null;
  onSearch: (query: string) => void;
  onCategoryClick: (category: PhotoCategory) => void;
  onLoadMore: () => void;
  onInsert: (photo: UnsplashImage) => void;
}

/**
 * Content for the Photos tab including search, category filters, and grid
 */
function PhotosTabContent({
  photos,
  isLoading,
  totalPages,
  currentPage,
  error,
  query,
  selectedCategory,
  onSearch,
  onCategoryClick,
  onLoadMore,
  onInsert,
}: PhotosTabContentProps) {
  const [localQuery, setLocalQuery] = useState(query);

  /**
   * Handle search input submission
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (localQuery.trim()) {
        onSearch(localQuery.trim());
      }
    },
    [localQuery, onSearch]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3 pt-2">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="mb-2">
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search free photos..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
      </form>

      {/* Category quick filters */}
      <div className="mb-2 flex flex-wrap gap-1">
        {PHOTO_CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            className="cursor-pointer text-[10px] px-2 py-0"
            onClick={() => onCategoryClick(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
          <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Photo grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-1.5">
          {photos.map((photo) => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              onClick={() => onInsert(photo)}
            />
          ))}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Load more button */}
        {!isLoading && photos.length > 0 && currentPage < totalPages && (
          <div className="py-3 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              className="text-xs"
            >
              Load more
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && photos.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <IconPhoto className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              No photos found. Try a different search.
            </p>
          </div>
        )}

        {/* Unsplash attribution */}
        {photos.length > 0 && (
          <p className="py-2 text-center text-[10px] text-muted-foreground">
            Photos provided by{' '}
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
  );
}

/**
 * Props for a single photo thumbnail in the grid
 */
interface PhotoThumbnailProps {
  photo: UnsplashImage;
  onClick: () => void;
}

/**
 * Single photo thumbnail with hover overlay showing photographer attribution
 */
function PhotoThumbnail({ photo, onClick }: PhotoThumbnailProps) {
  return (
    <button
      type="button"
      className="group relative aspect-square overflow-hidden rounded-md bg-muted"
      onClick={onClick}
    >
      <img
        src={photo.urls.thumb}
        alt={photo.alt_description || 'Unsplash photo'}
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
      />
      {/* Hover overlay with photographer info */}
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex w-full items-center justify-between p-1.5">
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
  );
}

// ============================================================================
// Icons Tab
// ============================================================================

/**
 * Props for the IconsTabContent sub-component
 */
interface IconsTabContentProps {
  icons: IconAsset[];
  query: string;
  selectedCategory: IconCategory | null;
  onSearch: (query: string) => void;
  onCategoryClick: (category: IconCategory | null) => void;
  onInsert: (icon: IconAsset) => void;
}

/**
 * Content for the Icons tab including search, category filters, and grid
 */
function IconsTabContent({
  icons,
  query,
  selectedCategory,
  onSearch,
  onCategoryClick,
  onInsert,
}: IconsTabContentProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3 pt-2">
      {/* Search input */}
      <div className="relative mb-2">
        <IconSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search icons..."
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          className="h-9 pl-8 text-xs"
        />
      </div>

      {/* Category quick filters */}
      <div className="mb-2 flex flex-wrap gap-1">
        {ICON_CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            className="cursor-pointer text-[10px] px-2 py-0"
            onClick={() =>
              onCategoryClick(
                selectedCategory === cat.value ? null : cat.value
              )
            }
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Icon grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-5 gap-1">
          {icons.map((iconAsset) => (
            <IconThumbnail
              key={iconAsset.id}
              icon={iconAsset}
              onClick={() => onInsert(iconAsset)}
            />
          ))}
        </div>

        {/* Empty state */}
        {icons.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <IconIcons className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              No icons match your search.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/**
 * Props for a single icon thumbnail in the grid
 */
interface IconThumbnailProps {
  icon: IconAsset;
  onClick: () => void;
}

/**
 * Single icon thumbnail with tooltip showing the icon name
 */
function IconThumbnail({ icon, onClick }: IconThumbnailProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex aspect-square items-center justify-center rounded-md bg-muted/60 p-2 transition-colors hover:bg-accent"
          onClick={onClick}
        >
          <img
            src={icon.svgDataUrl}
            alt={icon.name}
            className="h-6 w-6 dark:invert-0"
            style={{
              filter:
                'invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(60%) contrast(90%)',
            }}
            loading="lazy"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {icon.name}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Shapes Tab
// ============================================================================

/**
 * Props for the ShapesTabContent sub-component
 */
interface ShapesTabContentProps {
  shapes: ShapeAsset[];
  query: string;
  selectedCategory: ShapeCategory | null;
  onSearch: (query: string) => void;
  onCategoryClick: (category: ShapeCategory | null) => void;
  onInsert: (shape: ShapeAsset) => void;
}

/**
 * Content for the Shapes tab including search, category filters, and grid
 */
function ShapesTabContent({
  shapes,
  query,
  selectedCategory,
  onSearch,
  onCategoryClick,
  onInsert,
}: ShapesTabContentProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3 pt-2">
      {/* Search input */}
      <div className="relative mb-2">
        <IconSearch className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search shapes..."
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          className="h-9 pl-8 text-xs"
        />
      </div>

      {/* Category quick filters */}
      <div className="mb-2 flex flex-wrap gap-1">
        {SHAPE_CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            className="cursor-pointer text-[10px] px-2 py-0"
            onClick={() =>
              onCategoryClick(
                selectedCategory === cat.value ? null : cat.value
              )
            }
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Shape grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-3 gap-1.5">
          {shapes.map((shape) => (
            <ShapeThumbnail
              key={shape.id}
              shape={shape}
              onClick={() => onInsert(shape)}
            />
          ))}
        </div>

        {/* Empty state */}
        {shapes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <IconShape className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              No shapes match your search.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/**
 * Props for a single shape thumbnail in the grid
 */
interface ShapeThumbnailProps {
  shape: ShapeAsset;
  onClick: () => void;
}

/**
 * Single shape thumbnail with preview SVG and tooltip
 */
function ShapeThumbnail({ shape, onClick }: ShapeThumbnailProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex aspect-square items-center justify-center rounded-md border bg-muted/30 p-2 transition-colors hover:bg-accent"
          onClick={onClick}
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
  );
}
