"use client"

import * as React from "react"
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

/**
 * Variant types for the confirmation dialog.
 */
export type ConfirmDialogVariant = "default" | "destructive" | "warning"

/**
 * Props for the ConfirmDialog component.
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Dialog description/message */
  description: string
  /** Text for the confirm button */
  confirmText?: string
  /** Text for the cancel button */
  cancelText?: string
  /** Visual variant of the dialog */
  variant?: ConfirmDialogVariant
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>
  /** Whether the confirm action is loading */
  isLoading?: boolean
  /** localStorage key for "Don't show again" — when set, shows a checkbox */
  dontAskAgainKey?: string
}

/**
 * A reusable confirmation dialog component.
 * Replaces window.confirm() with a styled, accessible dialog.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false)
 *
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete Template?"
 *   description="This action cannot be undone."
 *   variant="destructive"
 *   confirmText="Delete"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  isLoading = false,
  dontAskAgainKey,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = React.useState(false)
  const [dontAskAgain, setDontAskAgain] = React.useState(false)

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      if (dontAskAgainKey && dontAskAgain) {
        try { localStorage.setItem(dontAskAgainKey, 'true') } catch { /* ignore */ }
      }
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsPending(false)
    }
  }

  // Reset checkbox when dialog opens
  React.useEffect(() => {
    if (open) setDontAskAgain(false)
  }, [open])

  const loading = isLoading || isPending

  const Icon = variant === "destructive" ? IconTrash : IconAlertTriangle

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`rounded-full p-2 ${
                variant === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : variant === "warning"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <Icon className="size-5" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pl-12">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {dontAskAgainKey && (
          <div className="flex items-center gap-2 pl-12">
            <Checkbox
              id="dont-ask-again"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <Label htmlFor="dont-ask-again" className="text-sm text-muted-foreground cursor-pointer">
              Don&apos;t show this again
            </Label>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {loading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Hook for using confirmation dialogs with a promise-based API.
 * Returns a confirm function and a ConfirmDialog component to render.
 *
 * @example
 * ```tsx
 * const { confirm, ConfirmDialogComponent } = useConfirmDialog()
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: "Delete item?",
 *     description: "This cannot be undone.",
 *     variant: "destructive",
 *     confirmText: "Delete"
 *   })
 *
 *   if (confirmed) {
 *     // perform delete action
 *   }
 * }
 *
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Delete</Button>
 *     <ConfirmDialogComponent />
 *   </>
 * )
 * ```
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean
    title: string
    description: string
    confirmText: string
    cancelText: string
    variant: ConfirmDialogVariant
    dontAskAgainKey?: string
    resolve: ((value: boolean) => void) | null
  }>({
    open: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
    dontAskAgainKey: undefined,
    resolve: null,
  })

  const confirm = React.useCallback(
    (options: {
      title: string
      description: string
      confirmText?: string
      cancelText?: string
      variant?: ConfirmDialogVariant
      dontAskAgainKey?: string
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          title: options.title,
          description: options.description,
          confirmText: options.confirmText || "Confirm",
          cancelText: options.cancelText || "Cancel",
          variant: options.variant || "default",
          dontAskAgainKey: options.dontAskAgainKey,
          resolve,
        })
      })
    },
    []
  )

  const handleOpenChange = React.useCallback((open: boolean) => {
    setDialogState((prev) => {
      if (!open && prev.resolve) {
        prev.resolve(false)
      }
      return { ...prev, open, resolve: open ? prev.resolve : null }
    })
  }, [])

  const handleConfirm = React.useCallback(() => {
    setDialogState((prev) => {
      if (prev.resolve) {
        prev.resolve(true)
      }
      return { ...prev, open: false, resolve: null }
    })
  }, [])

  const ConfirmDialogComponent = React.useCallback(
    () => (
      <ConfirmDialog
        open={dialogState.open}
        onOpenChange={handleOpenChange}
        title={dialogState.title}
        description={dialogState.description}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
        dontAskAgainKey={dialogState.dontAskAgainKey}
        onConfirm={handleConfirm}
      />
    ),
    [dialogState, handleOpenChange, handleConfirm]
  )

  return { confirm, ConfirmDialogComponent }
}
