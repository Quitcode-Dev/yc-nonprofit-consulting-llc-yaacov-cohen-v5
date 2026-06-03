"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  /** The element that opens the dialog when clicked */
  trigger: React.ReactNode;
  /** Dialog heading */
  title: string;
  /** Dialog body text */
  description: string;
  /** Called when the user clicks the confirm button */
  onConfirm: () => void;
  /** Visual style of the confirm button */
  variant?: "default" | "destructive";
  /** Label for the confirm button (defaults to "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (defaults to "Cancel") */
  cancelLabel?: string;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  variant = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
