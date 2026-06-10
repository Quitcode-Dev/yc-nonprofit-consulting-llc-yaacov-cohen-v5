"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MoveIdeaDialog } from "./move-idea-dialog";
import { deleteGlobalMoveIdea } from "./actions";
import type { GlobalMoveIdea } from "./page";

interface MoveIdeasClientProps {
  ideas: GlobalMoveIdea[];
}

export function MoveIdeasClient({ ideas }: MoveIdeasClientProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingIdea, setEditingIdea] = React.useState<GlobalMoveIdea | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  function openCreate() {
    setEditingIdea(null);
    setDialogOpen(true);
  }

  function openEdit(idea: GlobalMoveIdea) {
    setEditingIdea(idea);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteGlobalMoveIdea(id);
    if (result.error) {
      setDeleteError(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Move Ideas Library</h1>
        <Button onClick={openCreate}>Create Move Idea</Button>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive">{deleteError}</p>
      )}

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <p className="text-muted-foreground">
            No global move ideas yet. Create one to get started.
          </p>
          <Button onClick={openCreate}>Create Move Idea</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ideas.map((idea) => (
              <TableRow key={idea.id}>
                <TableCell className="font-medium">{idea.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{idea.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(idea)}
                    >
                      Edit
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="destructive" size="sm">
                          Delete
                        </Button>
                      }
                      title="Delete Move Idea"
                      description="Are you sure? Historical moves referencing this idea will retain their title."
                      variant="destructive"
                      confirmLabel="Delete"
                      onConfirm={() => handleDelete(idea.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <MoveIdeaDialog
        idea={editingIdea ?? undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
