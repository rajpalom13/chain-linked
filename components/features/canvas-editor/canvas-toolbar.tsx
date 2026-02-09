'use client';

/**
 * Canvas Toolbar Component
 * Top toolbar with undo, redo, zoom, grid toggle, and export actions
 */

import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconGridDots,
  IconDownload,
  IconTemplate,
  IconTrash,
  IconSparkles,
  IconDeviceFloppy,
  IconPhoto,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Props for the CanvasToolbar component
 */
interface CanvasToolbarProps {
  zoom: number;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleGrid: () => void;
  onOpenTemplates: () => void;
  onOpenAiGenerator: () => void;
  onSaveTemplate: () => void;
  onExport: () => void;
  onReset: () => void;
  /** Callback to open the graphics library panel */
  onOpenGraphics: () => void;
}

/**
 * Toolbar button component with tooltip
 */
function ToolbarButton({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  active,
  variant = 'ghost',
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'ghost' | 'outline' | 'default';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={cn('h-8 w-8', active && 'bg-accent')}
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
        {shortcut && (
          <p className="text-xs text-muted-foreground">{shortcut}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Canvas Toolbar Component
 * Provides editing controls and actions
 */
export function CanvasToolbar({
  zoom,
  showGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleGrid,
  onOpenTemplates,
  onOpenAiGenerator,
  onSaveTemplate,
  onExport,
  onReset,
  onOpenGraphics,
}: CanvasToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-12 items-center justify-between border-b bg-background px-4">
        {/* Left section: Undo/Redo */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={<IconArrowBackUp className="h-4 w-4" />}
            label="Undo"
            shortcut="Ctrl+Z"
            onClick={onUndo}
            disabled={!canUndo}
          />
          <ToolbarButton
            icon={<IconArrowForwardUp className="h-4 w-4" />}
            label="Redo"
            shortcut="Ctrl+Shift+Z"
            onClick={onRedo}
            disabled={!canRedo}
          />

          <Separator orientation="vertical" className="mx-2 h-6" />

          <ToolbarButton
            icon={<IconTemplate className="h-4 w-4" />}
            label="Templates"
            onClick={onOpenTemplates}
          />

          <ToolbarButton
            icon={<IconSparkles className="h-4 w-4" />}
            label="AI Generate"
            onClick={onOpenAiGenerator}
          />

          <ToolbarButton
            icon={<IconPhoto className="h-4 w-4" />}
            label="Graphics Library"
            onClick={onOpenGraphics}
          />
        </div>

        {/* Center section: Zoom controls */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={<IconZoomOut className="h-4 w-4" />}
            label="Zoom Out"
            onClick={onZoomOut}
            disabled={zoom <= 0.25}
          />

          <button
            type="button"
            onClick={onZoomReset}
            className="h-8 min-w-[4rem] rounded px-2 text-sm font-medium hover:bg-accent"
          >
            {Math.round(zoom * 100)}%
          </button>

          <ToolbarButton
            icon={<IconZoomIn className="h-4 w-4" />}
            label="Zoom In"
            onClick={onZoomIn}
            disabled={zoom >= 2}
          />

          <Separator orientation="vertical" className="mx-2 h-6" />

          <ToolbarButton
            icon={<IconGridDots className="h-4 w-4" />}
            label="Toggle Grid"
            onClick={onToggleGrid}
            active={showGrid}
          />
        </div>

        {/* Right section: Export and Reset */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-muted-foreground hover:text-destructive"
              >
                <IconTrash className="mr-1 h-4 w-4" />
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear all slides and start fresh</p>
            </TooltipContent>
          </Tooltip>

          <Button variant="outline" size="sm" onClick={onSaveTemplate}>
            <IconDeviceFloppy className="mr-2 h-4 w-4" />
            Save Template
          </Button>

          <Button size="sm" onClick={onExport}>
            <IconDownload className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
