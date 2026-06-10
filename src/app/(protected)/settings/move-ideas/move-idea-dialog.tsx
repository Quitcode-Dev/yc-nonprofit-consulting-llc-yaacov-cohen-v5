"use client";

import * as React from "react";
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
import { createOrgMoveIdea, updateOrgMoveIdea } from "./actions";

interface MoveIdeaDialogProps {
  /** When provided the dialog operates in edit mode; otherwise create mode. */
  idea?: {
    id: string;
    title: string;
    category: string;
  };
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoveIdeaDialog({
  idea,
  orgId,
  open,
  onOpenChange,
}: MoveIdeaDialogProps) {
  const isEdit = Boolean(idea);

  const [title, setTitle] = React.useState(idea?.title ?? "");
  const [category, setCategory] = React.useState(idea?.category ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Keep form in sync when the dialog is opened for a different idea
  React.useEffect(() => {
    if (open) {
      setTitle(idea?.title ?? "");
      setCategory(idea?.category ?? "");
      setError(null);
    }
  }, [open, idea]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = isEdit
        ? await updateOrgMoveIdea(idea!.id, title, category)
        : await createOrgMoveIdea(title, category, orgId);

      if (result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Move Idea" : "Create Move Idea"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-idea-title">Title</Label>
            <Input
              id="org-idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              required
              placeholder="e.g. Schedule a coffee meeting"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-idea-category">Category</Label>
            <Input
              id="org-idea-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              placeholder="e.g. Engagement"
              disabled={pending}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
