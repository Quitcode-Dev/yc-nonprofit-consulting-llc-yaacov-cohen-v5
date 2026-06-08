"use client";

import React, { useActionState, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  updateScoringConfig,
  type UpdateScoringConfigState,
} from "./actions";

interface FieldConfig {
  key: string;
  label: string;
  enabled: boolean;
  points: number;
}

interface ScoringFormProps {
  initialFields: FieldConfig[];
}

const initialState: UpdateScoringConfigState = {
  errors: {},
};

export default function ScoringForm({ initialFields }: ScoringFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateScoringConfig,
    initialState
  );

  // Local state for switch toggles and point values
  const [fields, setFields] = useState<FieldConfig[]>(initialFields);

  // Track per-field validation errors (client-side on blur)
  const [blurErrors, setBlurErrors] = useState<Record<string, string>>({});

  // Toast
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (state.success) {
      setToastVisible(true);
      const timer = setTimeout(() => setToastVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  function handleToggle(key: string, checked: boolean) {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: checked } : f))
    );
  }

  function handlePointsChange(key: string, value: string) {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, points: Number(value) } : f))
    );
    // Clear blur error on change
    setBlurErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handlePointsBlur(key: string, value: string) {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      setBlurErrors((prev) => ({
        ...prev,
        [key]: "Must be a non-negative integer.",
      }));
    } else {
      setBlurErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  const hasBlurErrors = Object.keys(blurErrors).length > 0;

  return (
    <>
      {/* Toast notification */}
      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-background px-4 py-3 shadow-lg text-sm font-medium"
        >
          <span className="text-green-600">✓</span>
          Scoring configuration saved. All donor scores have been recalculated.
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Scoring Configuration</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable each field and set the point value awarded when a
            donor has that attribute.
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {/* General error */}
            {state.errors.general && (
              <p className="text-sm text-destructive">{state.errors.general}</p>
            )}

            {/* Field rows */}
            <div>
              {fields.map((field) => {
                const serverError = state.errors.fields?.[field.key];
                const clientError = blurErrors[field.key];
                const errorMsg = clientError ?? serverError;

                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between py-3 border-b last:border-b-0"
                  >
                    {/* Field name */}
                    <span className="text-sm font-medium w-48 shrink-0">
                      {field.label}
                    </span>

                    {/* Hidden inputs so form data is submitted correctly */}
                    <input
                      type="hidden"
                      name={`${field.key}_enabled`}
                      value={field.enabled ? "true" : "false"}
                    />

                    {/* Toggle switch */}
                    <div className="flex items-center">
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={(checked) =>
                          handleToggle(field.key, checked)
                        }
                        aria-label={`Enable ${field.label}`}
                      />
                    </div>

                    {/* Point value input + error */}
                    <div className="flex flex-col items-end gap-1 w-28">
                      <Input
                        type="number"
                        name={`${field.key}_points`}
                        value={field.points}
                        min={0}
                        step={1}
                        disabled={!field.enabled}
                        onChange={(e) =>
                          handlePointsChange(field.key, e.target.value)
                        }
                        onBlur={(e) =>
                          handlePointsBlur(field.key, e.target.value)
                        }
                        className="w-28 text-right"
                        aria-label={`Points for ${field.label}`}
                        aria-invalid={!!errorMsg}
                        aria-describedby={
                          errorMsg ? `${field.key}-error` : undefined
                        }
                      />
                      {errorMsg && (
                        <p
                          id={`${field.key}-error`}
                          className="text-destructive text-sm"
                        >
                          {errorMsg}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={isPending || hasBlurErrors}>
                {isPending ? "Saving…" : "Save Configuration"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
