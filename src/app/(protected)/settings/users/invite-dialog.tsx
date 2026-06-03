"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteDialogProps {
  onInvited?: () => void;
}

export default function InviteDialog({ onInvited }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Trap focus inside dialog & prevent background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleOpen() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setError(null);
    setEmailError(null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setError(null);
    setEmailError(null);
  }

  function validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError("Email is required.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      const data: { success: boolean; error?: string; message?: string } =
        await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 409) {
          setEmailError(
            data.error ?? "This email is already active in your organization."
          );
        } else {
          setError(data.error ?? "Failed to send invitation. Please try again.");
        }
        return;
      }

      // Success
      handleClose();
      showToast("Invitation sent successfully!");
      onInvited?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  }

  return (
    <>
      {/* Trigger Button */}
      <Button onClick={handleOpen} type="button">
        Invite Solicitor
      </Button>

      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-background px-4 py-3 shadow-lg text-sm font-medium"
        >
          <span className="text-green-600">✓</span>
          {toastMessage}
        </div>
      )}

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-labelledby="invite-dialog-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Dialog Panel */}
          <div
            ref={dialogRef}
            className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg mx-4"
          >
            {/* Header */}
            <div className="mb-4">
              <h2
                id="invite-dialog-title"
                className="text-lg font-semibold leading-none tracking-tight"
              >
                Invite Solicitor
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Send an invitation email to add a new solicitor to your
                organization.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* General error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  ref={firstInputRef}
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="solicitor@example.com"
                  aria-describedby={
                    emailError ? "invite-email-error" : undefined
                  }
                  aria-invalid={!!emailError}
                  autoComplete="email"
                  disabled={isPending}
                />
                {emailError && (
                  <p
                    id="invite-email-error"
                    className="text-sm text-destructive"
                  >
                    {emailError}
                  </p>
                )}
              </div>

              {/* First Name */}
              <div className="space-y-1.5">
                <Label htmlFor="invite-first-name">First Name</Label>
                <Input
                  id="invite-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name (optional)"
                  autoComplete="given-name"
                  disabled={isPending}
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <Label htmlFor="invite-last-name">Last Name</Label>
                <Input
                  id="invite-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name (optional)"
                  autoComplete="family-name"
                  disabled={isPending}
                />
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Sending…" : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
