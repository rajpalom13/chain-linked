'use client';

/**
 * Save Template Dialog Component
 * @description Modal for saving the current carousel as a reusable template
 * Supports built-in categories and user-created custom categories
 * @module components/features/canvas-editor/save-template-dialog
 */

import { useState, useMemo } from 'react';
import { IconLoader2, IconPlus } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Built-in template category options
 */
const BUILT_IN_CATEGORIES = [
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold' },
] as const;

/** Sentinel value for the "New Category" option in the dropdown */
const NEW_CATEGORY_VALUE = '__new_category__';

/** Built-in category values that should not appear in "existing custom" list */
const BUILT_IN_VALUES = new Set(['professional', 'creative', 'minimal', 'bold', 'custom', 'brand']);

/**
 * Data emitted when the user submits the save template form
 */
interface SaveTemplateFormData {
  /** Template display name */
  name: string
  /** Optional description */
  description?: string
  /** Selected category */
  category: string
}

/**
 * Props for the SaveTemplateDialog component
 */
interface SaveTemplateDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when the user submits the save form */
  onSave: (data: SaveTemplateFormData) => void
  /** Whether a save operation is currently in progress */
  isSaving: boolean
  /** Optional brand colors from the current template for preview */
  brandColors?: string[]
  /** Optional list of existing custom category names from previously saved templates */
  existingCategories?: string[]
}

/**
 * Save Template Dialog
 * Provides a form for naming, describing, and categorizing a carousel template
 * before saving it for reuse. Supports creating new custom categories.
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback for open state changes
 * @param props.onSave - Callback with form data when submitted
 * @param props.isSaving - Whether save is in progress
 * @param props.brandColors - Optional brand colors for preview display
 * @param props.existingCategories - Optional existing custom category names
 * @returns JSX element rendering the save template dialog
 */
export function SaveTemplateDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
  brandColors = [],
  existingCategories = [],
}: SaveTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('professional');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  /**
   * Compute the full list of category options including user-created ones
   */
  const categoryOptions = useMemo(() => {
    const customOptions = existingCategories
      .filter((c) => !BUILT_IN_VALUES.has(c.toLowerCase()))
      .map((c) => ({
        value: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
      }));

    return [
      ...BUILT_IN_CATEGORIES,
      ...customOptions,
    ];
  }, [existingCategories]);

  /**
   * Reset form fields to their default values
   */
  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('professional');
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  /**
   * Handle category dropdown change
   * Switches to text input mode when "New Category" is selected
   * @param value - Selected dropdown value
   */
  const handleCategoryChange = (value: string) => {
    if (value === NEW_CATEGORY_VALUE) {
      setIsCreatingCategory(true);
      setCategory('');
    } else {
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setCategory(value);
    }
  };

  /**
   * Handle form submission
   * Validates that a name is provided before calling onSave
   */
  const handleSubmit = () => {
    if (!name.trim()) return;

    const finalCategory = isCreatingCategory
      ? (newCategoryName.trim() || 'custom')
      : category;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      category: finalCategory,
    });
  };

  /**
   * Handle dialog open state changes
   * Resets the form when the dialog closes
   * @param isOpen - New open state
   */
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={isSaving ? undefined : handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save your current carousel design as a reusable template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="template-name"
              placeholder="e.g., My Brand Template"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={isSaving}
              autoFocus
            />
          </div>

          {/* Template description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Briefly describe this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Category selection */}
          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            {isCreatingCategory ? (
              <div className="flex gap-2">
                <Input
                  id="template-category-new"
                  placeholder="e.g., Tips, Tutorials, Case Studies..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  maxLength={50}
                  disabled={isSaving}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreatingCategory(false);
                    setNewCategoryName('');
                    setCategory('professional');
                  }}
                  disabled={isSaving}
                  className="shrink-0 text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Select
                value={category}
                onValueChange={handleCategoryChange}
                disabled={isSaving}
              >
                <SelectTrigger id="template-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY_VALUE}>
                    <span className="flex items-center gap-1.5">
                      <IconPlus className="h-3.5 w-3.5" />
                      New Category
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Brand colors preview */}
          {brandColors.length > 0 && (
            <div className="space-y-2">
              <Label>Template Colors</Label>
              <div className="flex gap-2">
                {brandColors.slice(0, 8).map((color, index) => (
                  <div
                    key={index}
                    className="h-8 w-8 rounded-md border border-border/50"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                These colors will be saved with the template.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || (isCreatingCategory && !newCategoryName.trim()) || isSaving}
          >
            {isSaving ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
