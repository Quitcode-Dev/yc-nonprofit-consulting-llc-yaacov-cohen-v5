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
import { deleteOrgMoveIdea } from "./actions";
import type { OrgMoveIdea, GlobalMoveIdea } from "./page";

interface OrgMoveIdeasClientProps {
  orgIdeas: OrgMoveIdea[];
  globalIdeas: GlobalMoveIdea[];
  orgId: string;
}

export function OrgMoveIdeasClient({
  orgIdeas,
  globalIdeas,
  orgId,
}: OrgMoveIdeasClientProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingIdea, setEditingIdea] = React.useState<OrgMoveIdea | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  function openCreate() {
    setEditingIdea(null);
    setDialogOpen(true);
  }

  function openEdit(idea: OrgMoveIdea) {
    setEditingIdea(idea);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteOrgMoveIdea(id);
    if (result.error) {
      setDeleteError(result.error);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Move Ideas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage custom move ideas for your organization, or browse global ideas.
          </p>
        </div>
        <Button onClick={openCreate}>Create Move Idea</Button>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive">{deleteError}</p>
      )}

      {/* Organization Move Ideas section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Organization Move Ideas</h2>

        {orgIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-12 space-y-4">
            <p className="text-muted-foreground">
              No custom move ideas yet. Create one to get started.
            </p>
            <Button variant="outline" onClick={openCreate}>
              Create Move Idea
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgIdeas.map((idea) => (
                  <TableRow key={idea.id}>
                    <TableCell className="font-medium">{idea.title}</TableCell>
                    <TableCell>{idea.category}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Custom</Badge>
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
          </div>
        )}
      </section>

      {/* Global Move Ideas section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Global Move Ideas</h2>
        <p className="text-sm text-muted-foreground">
          These ideas are managed by the platform and are available to all organizations. They cannot be edited or deleted here.
        </p>

        {globalIdeas.length === 0 ? (
          <div className="rounded-lg border bg-card py-8 flex items-center justify-center">
            <p className="text-muted-foreground">No global move ideas available.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {globalIdeas.map((idea) => (
                  <TableRow key={idea.id}>
                    <TableCell className="font-medium">{idea.title}</TableCell>
                    <TableCell>{idea.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Global</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Create / Edit dialog */}
      <MoveIdeaDialog
        idea={editingIdea ?? undefined}
        orgId={orgId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
