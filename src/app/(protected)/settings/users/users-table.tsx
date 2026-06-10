"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { deactivateSolicitor, reactivateSolicitor } from "./actions";

export interface SolicitorRow {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  status: string;
  dateAdded: string;
}

interface UsersTableProps {
  solicitors: SolicitorRow[];
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <Badge className="border-transparent bg-green-100 text-green-800 hover:bg-green-100/80">
          Active
        </Badge>
      );
    case "pending":
      return (
        <Badge className="border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80">
          Pending
        </Badge>
      );
    case "inactive":
      return (
        <Badge className="border-transparent bg-gray-100 text-gray-600 hover:bg-gray-100/80">
          Inactive
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface DropdownMenuProps {
  userId: string;
  status: string;
  onToast: (msg: string, isError?: boolean) => void;
}

function RowDropdownMenu({ userId, status, onToast }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const canDeactivate = status === "active";
  const canReactivate = status === "inactive";

  if (!canDeactivate && !canReactivate) {
    return null;
  }

  async function handleDeactivate() {
    setOpen(false);
    setIsPending(true);
    try {
      const result = await deactivateSolicitor(userId);
      if (result.success) {
        onToast("User deactivated successfully.");
      } else {
        onToast(result.error ?? "Failed to deactivate user.", true);
      }
    } catch {
      onToast("An unexpected error occurred.", true);
    } finally {
      setIsPending(false);
    }
  }

  async function handleReactivate() {
    setOpen(false);
    setIsPending(true);
    try {
      const result = await reactivateSolicitor(userId);
      if (result.success) {
        onToast("User reactivated successfully.");
      } else {
        onToast(result.error ?? "Failed to reactivate user.", true);
      }
    } catch {
      onToast("An unexpected error occurred.", true);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isPending}
        aria-label="Open actions menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 min-w-[160px] rounded-md border bg-background shadow-md py-1"
        >
          {canDeactivate && (
            <button
              role="menuitem"
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={handleDeactivate}
            >
              Deactivate
            </button>
          )}
          {canReactivate && (
            <button
              role="menuitem"
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={handleReactivate}
            >
              Reactivate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function UsersTable({ solicitors }: UsersTableProps) {
  const [toast, setToast] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  function showToast(message: string, isError = false) {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-background px-4 py-3 shadow-lg text-sm font-medium"
        >
          <span className={toast.isError ? "text-destructive" : "text-green-600"}>
            {toast.isError ? "✕" : "✓"}
          </span>
          {toast.message}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Added</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {solicitors.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-10"
              >
                No solicitors yet. Invite one to get started.
              </TableCell>
            </TableRow>
          ) : (
            solicitors.map((s) => {
              const fullName = [s.firstName, s.lastName]
                .filter(Boolean)
                .join(" ");
              return (
                <TableRow key={s.userId}>
                  <TableCell className="font-medium">
                    {fullName || (
                      <span className="text-muted-foreground italic">
                        No name
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{s.email ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell>{formatDate(s.dateAdded)}</TableCell>
                  <TableCell>
                    <RowDropdownMenu
                      userId={s.userId}
                      status={s.status}
                      onToast={showToast}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </>
  );
}
