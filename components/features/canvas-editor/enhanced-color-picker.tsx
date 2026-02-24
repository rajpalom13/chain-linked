'use client';

/**
 * Enhanced Color Picker Component
 * Popover-based color picker with HSV spectrum, opacity slider,
 * hex input, preset colors, and recent colors
 * @module components/features/canvas-editor/enhanced-color-picker
 */

import { useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  '#f97316',
  '#14b8a6',
  '#a855f7',
  '#f43f5e',
  '#64748b',
];

const MAX_RECENT = 8;

/**
 * Props for the EnhancedColorPicker component
 * @param color - Current hex color value
 * @param onChange - Callback when color changes
 * @param templateColors - Brand/template colors to show in presets
 * @param showOpacity - Whether to show the opacity slider
 * @param opacity - Current opacity value (0-1)
 * @param onOpacityChange - Callback when opacity changes
 */
interface EnhancedColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  templateColors?: string[];
  showOpacity?: boolean;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
}

/**
 * Enhanced Color Picker Component
 * Full-featured color picker with HSV spectrum, opacity, presets, and recent colors
 * @param props - Component props
 * @returns Popover-based color picker JSX
 */
export function EnhancedColorPicker({
  color,
  onChange,
  templateColors = [],
  showOpacity = false,
  opacity = 1,
  onOpacityChange,
}: EnhancedColorPickerProps) {
  const [hexInput, setHexInput] = useState(color);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  // Deduplicate preset colors: template colors first, then defaults
  const presetColors = [...new Set([...templateColors, ...DEFAULT_COLOR_PALETTE])];

  /**
   * Add a color to recent colors list
   */
  const addToRecent = useCallback((c: string) => {
    setRecentColors((prev) => [c, ...prev.filter((r) => r !== c)].slice(0, MAX_RECENT));
  }, []);

  /**
   * Handle color change from the spectrum picker
   */
  const handleSpectrumChange = useCallback(
    (newColor: string) => {
      setHexInput(newColor);
      onChange(newColor);
    },
    [onChange]
  );

  /**
   * Handle hex input apply
   */
  const handleApplyHex = useCallback(() => {
    const hex = hexInput.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
      onChange(hex);
      addToRecent(hex);
    }
  }, [hexInput, onChange, addToRecent]);

  /**
   * Handle preset color click
   */
  const handlePresetClick = useCallback(
    (c: string) => {
      setHexInput(c);
      onChange(c);
      addToRecent(c);
    },
    [onChange, addToRecent]
  );

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
            style={{ backgroundColor: color, opacity }}
          />
          <span className="font-mono text-xs">{color}</span>
          {showOpacity && (
            <span className="ml-auto text-xs text-muted-foreground">
              {Math.round(opacity * 100)}%
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="space-y-3">
          {/* HSV spectrum picker */}
          <div className="[&_.react-colorful]:w-full [&_.react-colorful]:h-[160px] [&_.react-colorful__saturation]:rounded-md [&_.react-colorful__hue]:h-3 [&_.react-colorful__hue]:rounded-full [&_.react-colorful__pointer]:h-5 [&_.react-colorful__pointer]:w-5">
            <HexColorPicker color={color} onChange={handleSpectrumChange} />
          </div>

          {/* Opacity slider */}
          {showOpacity && onOpacityChange && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <div className="relative">
                {/* Checkerboard track background */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(to right, transparent, ${color})`,
                    backgroundImage: `linear-gradient(to right, transparent, ${color}), repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)`,
                    backgroundSize: '100% 100%, 8px 8px',
                  }}
                />
                <Slider
                  value={[opacity * 100]}
                  onValueChange={([value]) => onOpacityChange(value / 100)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          )}

          {/* Hex input + Apply */}
          <div className="flex gap-2">
            <Input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="#000000"
              className="h-8 flex-1 font-mono text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyHex();
                }
              }}
            />
            <Button size="sm" className="h-8 px-3" onClick={handleApplyHex}>
              Apply
            </Button>
          </div>

          {/* Preset colors grid */}
          <div>
            <Label className="text-xs text-muted-foreground">Presets</Label>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'relative h-7 w-7 rounded border transition-all',
                    color === c
                      ? 'border-primary ring-2 ring-primary/20 scale-110'
                      : 'border-border/50 hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => handlePresetClick(c)}
                >
                  {color === c && (
                    <IconCheck
                      className={cn(
                        'absolute inset-0 m-auto h-3.5 w-3.5',
                        c === '#ffffff' || c === '#f59e0b'
                          ? 'text-gray-800'
                          : 'text-white'
                      )}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Recent</Label>
              <div className="mt-1.5 flex gap-1.5">
                {recentColors.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    type="button"
                    className="h-6 w-6 rounded border border-border/50 transition-all hover:scale-110"
                    style={{ backgroundColor: c }}
                    onClick={() => handlePresetClick(c)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
