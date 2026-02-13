'use client';

/**
 * Editor Top Actions Component
 * Top-right floating action buttons for reset, save, and export
 * @module components/features/canvas-editor/editor-top-actions
 */

import {
  IconTrash,
  IconDeviceFloppy,
  IconDownload,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

/**
 * Props for the EditorTopActions component
 */
interface EditorTopActionsProps {
  onReset: () => void;
  onSaveTemplate: () => void;
  onExport: () => void;
}

/**
 * Top-right floating action bar with Reset, Save Template, and Export buttons
 * @param props - Component props
 * @returns Floating action buttons JSX
 */
export function EditorTopActions({
  onReset,
  onSaveTemplate,
  onExport,
}: EditorTopActionsProps) {
  return (
    <div className="absolute right-3 top-3 z-10 flex gap-2 rounded-lg border bg-background/80 px-2 py-1.5 shadow-sm backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 text-muted-foreground hover:text-destructive"
      >
        <IconTrash className="mr-1.5 h-4 w-4" />
        Reset
      </Button>
      <Button variant="outline" size="sm" className="h-8" onClick={onSaveTemplate}>
        <IconDeviceFloppy className="mr-1.5 h-4 w-4" />
        Save
      </Button>
      <Button size="sm" className="h-8" onClick={onExport}>
        <IconDownload className="mr-1.5 h-4 w-4" />
        Export
      </Button>
    </div>
  );
}
