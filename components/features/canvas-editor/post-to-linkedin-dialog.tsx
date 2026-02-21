'use client';

/**
 * Post to LinkedIn Dialog Component
 * @description Modal for posting carousel content directly to LinkedIn as a document post.
 * Auto-generates PDF from slides, supports AI caption generation, and handles the full posting flow.
 * @module components/features/canvas-editor/post-to-linkedin-dialog
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IconBrandLinkedin,
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
  IconFileTypePdf,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLinkedInPost } from '@/hooks/use-linkedin-post';
import { useLinkedInDocumentPost } from '@/hooks/use-linkedin-document-post';
import {
  exportSlideToDataUrl,
  exportCarouselToPDF,
} from '@/lib/canvas-pdf-export';
import type { CanvasSlide } from '@/types/canvas-editor';
import type { CanvasStageRef } from './canvas-stage';
import type { LinkedInVisibility } from '@/lib/linkedin/types';
import type { DocumentPostStage } from '@/lib/linkedin/types';

/**
 * Maximum character length for LinkedIn post captions
 */
const MAX_CAPTION_LENGTH = 3000;

/**
 * Props for the PostToLinkedInDialog component
 */
interface PostToLinkedInDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current carousel slides */
  slides: CanvasSlide[];
  /** Ref to the canvas stage for exporting slides */
  stageRef: React.RefObject<CanvasStageRef | null>;
  /** Current slide index (to restore after export) */
  currentSlideIndex: number;
  /** Function to set the current slide index */
  setCurrentSlide: (index: number) => void;
}

/**
 * Stage labels for progress display
 */
const STAGE_LABELS: Record<DocumentPostStage, string> = {
  'generating-pdf': 'Generating PDF from slides...',
  'uploading-document': 'Uploading document to LinkedIn...',
  'creating-post': 'Creating your post...',
  'complete': 'Post published successfully!',
  'error': 'Something went wrong',
};

/**
 * Post to LinkedIn Dialog
 * Handles PDF generation, AI caption, and document posting to LinkedIn
 * @param props - Component props
 * @returns Dialog JSX element
 */
export function PostToLinkedInDialog({
  open,
  onOpenChange,
  slides,
  stageRef,
  currentSlideIndex,
  setCurrentSlide,
}: PostToLinkedInDialogProps) {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<LinkedInVisibility>('PUBLIC');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfSize, setPdfSize] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LinkedIn connection status
  const {
    isConnected,
    isLoading: isLoadingConnection,
    connectionStatus,
    connectLinkedIn,
  } = useLinkedInPost();

  // Document posting hook
  const {
    postDocument,
    generateCaption,
    stage,
    isPosting,
    isGeneratingCaption,
    error: postError,
  } = useLinkedInDocumentPost();

  /**
   * Format file size for display
   * @param bytes - File size in bytes
   * @returns Formatted size string
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Extract text content from slides for AI caption generation
   */
  const extractSlideText = useCallback((): string => {
    return slides
      .flatMap((slide) => slide.elements)
      .filter((el): el is Extract<typeof el, { type: 'text' }> => el.type === 'text')
      .map((el) => el.text)
      .filter(Boolean)
      .join('\n');
  }, [slides]);

  /**
   * Generate PDF from current slides
   */
  const generatePdf = useCallback(async () => {
    const stage = stageRef.current?.getStage();
    if (!stage || slides.length === 0) return;

    setIsGeneratingPdf(true);

    try {
      const originalSlideIndex = currentSlideIndex;
      const dataUrls: string[] = [];

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        // Wait for the slide to render
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => setTimeout(resolve, 100));

        const dataUrl = exportSlideToDataUrl(stage, 2);
        dataUrls.push(dataUrl);
      }

      // Restore original slide
      setCurrentSlide(originalSlideIndex);

      const blob = await exportCarouselToPDF(dataUrls, {
        format: 'pdf',
        quality: 'medium',
        pixelRatio: 2,
      });

      setPdfBlob(blob);
      setPdfSize(formatFileSize(blob.size));
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF from slides');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [slides, stageRef, currentSlideIndex, setCurrentSlide]);

  /**
   * Auto-generate PDF when dialog opens
   */
  useEffect(() => {
    if (open && !pdfBlob && !isGeneratingPdf) {
      generatePdf();
    }
  }, [open, pdfBlob, isGeneratingPdf, generatePdf]);

  /**
   * Reset state when dialog closes
   */
  useEffect(() => {
    if (!open) {
      setPdfBlob(null);
      setPdfSize('');
      setUploadedFile(null);
      setCaption('');
      setVisibility('PUBLIC');
    }
  }, [open]);

  /**
   * Handle AI caption generation
   */
  const handleGenerateCaption = async () => {
    const slideText = extractSlideText();
    if (!slideText) {
      toast.error('No text content found in slides to generate a caption from');
      return;
    }

    const result = await generateCaption({
      carouselContent: slideText,
    });

    if (result) {
      setCaption(result);
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file (JPEG, PNG, GIF)');
      return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 25MB limit');
      return;
    }

    setUploadedFile(file);
  };

  /**
   * Remove uploaded file
   */
  const handleRemoveUploadedFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle posting to LinkedIn
   */
  const handlePost = async () => {
    if (!caption.trim()) {
      toast.error('Please write a caption for your post');
      return;
    }

    // Use uploaded file if provided, otherwise use auto-generated PDF
    const fileToPost = uploadedFile || pdfBlob;
    if (!fileToPost) {
      toast.error('No document available to post. Please wait for PDF generation or upload a file.');
      return;
    }

    const result = await postDocument({
      content: caption,
      visibility,
      pdfBlob: fileToPost,
      documentTitle: 'Carousel',
    });

    if (result.success) {
      if (result.draft) {
        toast.info(result.message || 'Saved as draft (posting is disabled)');
      } else {
        toast.success('Posted to LinkedIn successfully!');
      }
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Failed to post to LinkedIn');
    }
  };

  const isProcessing = isPosting || isGeneratingPdf;
  const activeFile = uploadedFile || pdfBlob;
  const activeFileName = uploadedFile?.name || 'carousel.pdf';
  const activeFileSize = uploadedFile
    ? formatFileSize(uploadedFile.size)
    : pdfSize;

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconBrandLinkedin className="h-5 w-5 text-[#0A66C2]" />
            Post to LinkedIn
          </DialogTitle>
          <DialogDescription>
            Share your carousel directly to LinkedIn as a document post.
          </DialogDescription>
        </DialogHeader>

        {/* Connection status */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
            isConnected
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
          )}
        >
          {isLoadingConnection ? (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          ) : isConnected ? (
            <>
              <IconCheck className="h-4 w-4" />
              <span>
                Connected{connectionStatus?.profileName ? ` as ${connectionStatus.profileName}` : ''}
              </span>
            </>
          ) : (
            <>
              <IconAlertTriangle className="h-4 w-4" />
              <span>LinkedIn not connected</span>
              <Button
                variant="link"
                size="sm"
                className="ml-auto h-auto p-0 text-amber-700 dark:text-amber-300"
                onClick={connectLinkedIn}
              >
                Connect
              </Button>
            </>
          )}
        </div>

        {/* Post caption */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="caption">Caption</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleGenerateCaption}
              disabled={isGeneratingCaption || slides.length === 0}
            >
              {isGeneratingCaption ? (
                <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <IconSparkles className="mr-1 h-3 w-3" />
              )}
              {isGeneratingCaption ? 'Generating...' : 'Generate with AI'}
            </Button>
          </div>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a compelling caption for your carousel post..."
            rows={5}
            maxLength={MAX_CAPTION_LENGTH}
            className="resize-none"
          />
          <p className="text-right text-xs text-muted-foreground">
            {caption.length}/{MAX_CAPTION_LENGTH}
          </p>
        </div>

        {/* Document attachment */}
        <div className="space-y-2">
          <Label>Attachment</Label>

          {/* Auto-generated PDF or uploaded file */}
          {isGeneratingPdf ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
              <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                Generating PDF from {slides.length} slides...
              </div>
            </div>
          ) : activeFile ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <IconFileTypePdf className="h-8 w-8 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activeFileName}</p>
                <p className="text-xs text-muted-foreground">
                  {slides.length} slides &middot; {activeFileSize}
                </p>
              </div>
              {uploadedFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleRemoveUploadedFile}
                >
                  <IconX className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : null}

          {/* File upload option */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/gif"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload className="mr-1 h-3 w-3" />
              {uploadedFile ? 'Replace file' : 'Upload your own file'}
            </Button>
            {!uploadedFile && (
              <span className="text-xs text-muted-foreground">
                PDF or image, max 25MB
              </span>
            )}
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <Label>Visibility</Label>
          <RadioGroup
            value={visibility}
            onValueChange={(value) => setVisibility(value as LinkedInVisibility)}
            className="flex gap-4"
          >
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="PUBLIC" />
              <span className="text-sm">Public</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="CONNECTIONS" />
              <span className="text-sm">Connections only</span>
            </label>
          </RadioGroup>
        </div>

        {/* Posting progress */}
        {isPosting && stage && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {stage === 'complete' ? (
                <IconCheck className="h-4 w-4 text-green-500" />
              ) : stage === 'error' ? (
                <IconAlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              )}
              <span>{STAGE_LABELS[stage]}</span>
            </div>
            <Progress
              value={
                stage === 'uploading-document' ? 33
                  : stage === 'creating-post' ? 66
                    : stage === 'complete' ? 100
                      : 0
              }
              className="h-1.5"
            />
          </div>
        )}

        {/* Error display */}
        {postError && !isPosting && (
          <p className="text-sm text-destructive">{postError}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePost}
            disabled={
              isProcessing ||
              !isConnected ||
              !caption.trim() ||
              !activeFile
            }
            className="bg-[#0A66C2] text-white hover:bg-[#004182]"
          >
            {isPosting ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <IconBrandLinkedin className="mr-2 h-4 w-4" />
                Post to LinkedIn
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
