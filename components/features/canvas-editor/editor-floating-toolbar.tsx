'use client';

/**
 * Editor Floating Toolbar Component
 * Bottom-center floating toolbar with undo/redo, zoom, and grid toggle
 * @module components/features/canvas-editor/editor-floating-toolbar
 */

import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconZoomIn,
  IconZoomOut,
  IconGridDots,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { fadeSlideUpVariants } from '@/lib/animations';

/**
 * Props for the EditorFloatingToolbar component
 */
interface EditorFloatingToolbarProps {
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
}

/**
 * Single toolbar icon button with tooltip
 */
function ToolbarBtn({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 rounded-full', active && 'bg-accent')}
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{label}</p>
        {shortcut && (
          <p className="text-xs text-muted-foreground">{shortcut}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Floating toolbar positioned at the bottom-center of the canvas area
 * Contains undo/redo, zoom controls, and grid toggle
 * @param props - Component props
 * @returns Floating toolbar JSX
 */
export function EditorFloatingToolbar({
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
}: EditorFloatingToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        variants={fadeSlideUpVariants}
        initial="initial"
        animate="animate"
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border bg-background/90 px-2 shadow-lg backdrop-blur-sm"
      >
        {/* Undo / Redo */}
        <ToolbarBtn
          icon={<IconArrowBackUp className="h-4 w-4" />}
          label="Undo"
          shortcut="Ctrl+Z"
          onClick={onUndo}
          disabled={!canUndo}
        />
        <ToolbarBtn
          icon={<IconArrowForwardUp className="h-4 w-4" />}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          onClick={onRedo}
          disabled={!canRedo}
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Zoom */}
        <ToolbarBtn
          icon={<IconZoomOut className="h-4 w-4" />}
          label="Zoom Out"
          onClick={onZoomOut}
          disabled={zoom <= 0.25}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onZoomReset}
              className="h-8 min-w-[3rem] rounded-full px-2 text-xs font-medium hover:bg-accent"
            >
              {Math.round(zoom * 100)}%
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Reset zoom</TooltipContent>
        </Tooltip>
        <ToolbarBtn
          icon={<IconZoomIn className="h-4 w-4" />}
          label="Zoom In"
          onClick={onZoomIn}
          disabled={zoom >= 2}
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Grid */}
        <ToolbarBtn
          icon={<IconGridDots className="h-4 w-4" />}
          label="Toggle Grid"
          onClick={onToggleGrid}
          active={showGrid}
        />
      </motion.div>
    </TooltipProvider>
  );
}
