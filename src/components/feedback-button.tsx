"use client";

import React, { useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_FILE_TYPES = ".png,.jpg,.jpeg,.pdf";

interface FormErrors {
  category?: string;
  title?: string;
  description?: string;
  file?: string;
  general?: string;
}

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setCategory("");
    setTitle("");
    setDescription("");
    setFile(null);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      resetForm();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_FILE_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, file: "File must be under 10MB" }));
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setErrors((prev) => ({ ...prev, file: undefined }));
      setFile(selected);
    }
  }

  function validate(): FormErrors {
    const newErrors: FormErrors = {};
    if (!category) newErrors.category = "Category is required.";
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!description.trim()) newErrors.description = "Description is required.";
    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("title", title);
      formData.append("description", description);
      if (file) {
        formData.append("file", file);
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setErrors({ general: "Something went wrong. Please try again." });
        return;
      }

      // Success: close dialog, reset form, show toast
      setOpen(false);
      resetForm();
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 5000);
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating feedback button */}
      <Button
        className="fixed bottom-6 right-6 rounded-full shadow-lg z-50 h-12 w-12"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open feedback form"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {/* Success toast */}
      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-md border bg-background px-4 py-3 shadow-lg text-sm font-medium max-w-sm"
        >
          <span className="text-green-600">✓</span>
          Your feedback has been submitted successfully. Thank you!
        </div>
      )}

      {/* Feedback dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* General error */}
            {errors.general && (
              <p className="text-destructive text-sm">{errors.general}</p>
            )}

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="feedback-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bug Report">Bug Report</SelectItem>
                  <SelectItem value="Feature Request">Feature Request</SelectItem>
                  <SelectItem value="Question">Question</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-destructive text-sm">{errors.category}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="feedback-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                placeholder="Brief summary of your feedback"
              />
              {errors.title && (
                <p className="text-destructive text-sm">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                placeholder="Please describe your feedback in detail"
                className="min-h-[120px]"
              />
              {errors.description && (
                <p className="text-destructive text-sm">{errors.description}</p>
              )}
            </div>

            {/* File attachment */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-file">
                Attachment <span className="text-muted-foreground text-xs">(optional, max 10MB)</span>
              </Label>
              <Input
                id="feedback-file"
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileChange}
              />
              {errors.file && (
                <p className="text-destructive text-sm">{errors.file}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
