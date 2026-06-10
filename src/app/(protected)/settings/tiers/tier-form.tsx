"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateTierConfigs } from "./actions";

export interface TierRow {
  id: string; // client-side key only
  name: string;
  min_score: number | string;
  max_score: number | string;
}

interface TierFormProps {
  initialTiers: Array<{
    name: string;
    min_score: number;
    max_score: number;
  }>;
}

let nextId = 0;
function genId() {
  return `tier-${++nextId}`;
}

function buildRows(
  tiers: Array<{ name: string; min_score: number; max_score: number }>
): TierRow[] {
  return tiers.map((t) => ({
    id: genId(),
    name: t.name,
    min_score: t.min_score,
    max_score: t.max_score,
  }));
}

export default function TierForm({ initialTiers }: TierFormProps) {
  const [rows, setRows] = useState<TierRow[]>(() => buildRows(initialTiers));
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Hide success toast after 5 seconds
  useEffect(() => {
    if (!successVisible) return;
    const timer = setTimeout(() => setSuccessVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [successVisible]);

  function handleAddTier() {
    setRows((prev) => [
      ...prev,
      { id: genId(), name: "", min_score: "", max_score: "" },
    ]);
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleChange(
    id: string,
    field: keyof Omit<TierRow, "id">,
    value: string
  ) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    // Clear errors on any change
    setOverlapError(null);
    setGeneralError(null);
  }

  function validateOverlap(
    tiers: Array<{ min_score: number; max_score: number; name: string }>
  ): boolean {
    for (let i = 0; i < tiers.length; i++) {
      for (let j = i + 1; j < tiers.length; j++) {
        const a = tiers[i];
        const b = tiers[j];
        if (a.min_score <= b.max_score && b.min_score <= a.max_score) {
          return true; // overlap found
        }
      }
    }
    return false;
  }

  function handleSave() {
    setOverlapError(null);
    setGeneralError(null);

    // Parse and validate all rows
    const parsed = rows.map((r) => ({
      name: r.name.trim(),
      min_score: Number(r.min_score),
      max_score: Number(r.max_score),
    }));

    // Client-side overlap check before calling server
    if (validateOverlap(parsed)) {
      setOverlapError("Score ranges cannot overlap");
      return;
    }

    startTransition(async () => {
      const result = await updateTierConfigs(parsed);
      if (result.errors.overlap) {
        setOverlapError(result.errors.overlap);
      } else if (result.errors.general) {
        setGeneralError(result.errors.general);
      } else if (result.success) {
        setSuccessVisible(true);
      }
    });
  }

  return (
    <>
      {/* Success toast */}
      {successVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-background px-4 py-3 shadow-lg text-sm font-medium"
        >
          <span className="text-green-600">✓</span>
          Tier configuration saved. All donor tiers have been recalculated.
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Tier Configuration</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Define donor tiers with custom names and score ranges. Score ranges
            must not overlap.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Error messages */}
            {overlapError && (
              <p className="text-sm text-destructive">{overlapError}</p>
            )}
            {generalError && (
              <p className="text-sm text-destructive">{generalError}</p>
            )}

            {/* Tier rows */}
            <div className="space-y-3">
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No tiers configured. Click &ldquo;Add Tier&rdquo; to get
                  started.
                </p>
              )}
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-3">
                  {/* Tier Name */}
                  <Input
                    placeholder="Tier name"
                    value={row.name}
                    onChange={(e) =>
                      handleChange(row.id, "name", e.target.value)
                    }
                    aria-label="Tier name"
                    className="flex-1"
                  />
                  {/* Min Score */}
                  <Input
                    type="number"
                    placeholder="Min score"
                    value={row.min_score}
                    onChange={(e) =>
                      handleChange(row.id, "min_score", e.target.value)
                    }
                    aria-label="Minimum score"
                    className="w-28"
                  />
                  {/* Max Score */}
                  <Input
                    type="number"
                    placeholder="Max score"
                    value={row.max_score}
                    onChange={(e) =>
                      handleChange(row.id, "max_score", e.target.value)
                    }
                    aria-label="Maximum score"
                    className="w-28"
                  />
                  {/* Delete button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(row.id)}
                    aria-label="Delete tier"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTier}
                disabled={isPending}
              >
                Add Tier
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save Tiers"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
