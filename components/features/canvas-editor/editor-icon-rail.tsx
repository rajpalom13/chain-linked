'use client';

/**
 * Editor Icon Rail Component
 * Vertical icon tab strip for the left panel of the carousel editor
 * @module components/features/canvas-editor/editor-icon-rail
 */

import {
  IconTemplate,
  IconSparkles,
  IconPhoto,
  IconUpload,
  IconLayoutList,
} from '@tabler/icons-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LeftPanelTab } from '@/types/canvas-editor';

/**
 * Tab definition for the icon rail
 */
interface TabDef {
  id: LeftPanelTab;
  icon: React.ReactNode;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'templates', icon: <IconTemplate className="h-5 w-5" />, label: 'Templates' },
  { id: 'ai', icon: <IconSparkles className="h-5 w-5" />, label: 'AI Generate' },
  { id: 'graphics', icon: <IconPhoto className="h-5 w-5" />, label: 'Graphics' },
  { id: 'uploads', icon: <IconUpload className="h-5 w-5" />, label: 'Uploads' },
  { id: 'slides', icon: <IconLayoutList className="h-5 w-5" />, label: 'Slides' },
];

/**
 * Props for the EditorIconRail component
 * @param activeTab - Currently active tab or null if collapsed
 * @param onTabChange - Callback when a tab is clicked
 */
interface EditorIconRailProps {
  activeTab: LeftPanelTab | null;
  onTabChange: (tab: LeftPanelTab | null) => void;
}

/**
 * Vertical icon rail for the editor left panel
 * Clicking active tab collapses the panel, clicking inactive tab opens it
 * @param props - Component props
 * @returns Vertical icon strip JSX
 */
export function EditorIconRail({ activeTab, onTabChange }: EditorIconRailProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-14 flex-col items-center gap-1 border-r bg-background py-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onTabChange(isActive ? null : tab.id)}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  {tab.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {tab.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
