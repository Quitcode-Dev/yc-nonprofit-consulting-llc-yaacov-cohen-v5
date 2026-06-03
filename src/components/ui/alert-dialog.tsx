"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue>({
  open: false,
  setOpen: () => {},
});

// ---------------------------------------------------------------------------
// AlertDialog (root)
// ---------------------------------------------------------------------------

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function AlertDialog({ open: controlledOpen, onOpenChange, children }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [onOpenChange]
  );

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// AlertDialogTrigger
// ---------------------------------------------------------------------------

interface AlertDialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

function AlertDialogTrigger({ children, className }: AlertDialogTriggerProps) {
  const { setOpen } = React.useContext(AlertDialogContext);

  return (
    <span
      className={cn("inline-flex", className)}
      onClick={() => setOpen(true)}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AlertDialogPortal  (renders inline — no real portal needed for our use)
// ---------------------------------------------------------------------------

function AlertDialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// AlertDialogOverlay
// ---------------------------------------------------------------------------

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80",
      className
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = "AlertDialogOverlay";

// ---------------------------------------------------------------------------
// AlertDialogContent
// ---------------------------------------------------------------------------

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open } = React.useContext(AlertDialogContext);

  if (!open) return null;

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg rounded-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = "AlertDialogContent";

// ---------------------------------------------------------------------------
// AlertDialogHeader
// ---------------------------------------------------------------------------

function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// AlertDialogFooter
// ---------------------------------------------------------------------------

function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// AlertDialogTitle
// ---------------------------------------------------------------------------

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

// ---------------------------------------------------------------------------
// AlertDialogDescription
// ---------------------------------------------------------------------------

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

// ---------------------------------------------------------------------------
// AlertDialogAction
// ---------------------------------------------------------------------------

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ className, variant = "default", onClick, ...props }, ref) => {
    const { setOpen } = React.useContext(AlertDialogContext);

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      onClick?.(e);
      setOpen(false);
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
AlertDialogAction.displayName = "AlertDialogAction";

// ---------------------------------------------------------------------------
// AlertDialogCancel
// ---------------------------------------------------------------------------

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = React.useContext(AlertDialogContext);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(e);
    setOpen(false);
  }

  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
      onClick={handleClick}
      {...props}
    />
  );
});
AlertDialogCancel.displayName = "AlertDialogCancel";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
