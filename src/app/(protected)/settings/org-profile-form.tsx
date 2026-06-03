"use client";

import React, { useActionState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateOrganization, type UpdateOrganizationState } from "./actions";

interface OrgProfileFormProps {
  initialName: string;
  initialContactName: string | null;
  initialContactEmail: string | null;
}

const initialState: UpdateOrganizationState = {
  errors: {},
};

export default function OrgProfileForm({
  initialName,
  initialContactName,
  initialContactEmail,
}: OrgProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrganization,
    initialState
  );

  // Toast notification state
  const [toastVisible, setToastVisible] = React.useState(false);

  useEffect(() => {
    if (state.success) {
      setToastVisible(true);
      const timer = setTimeout(() => setToastVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

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
          Organization settings saved successfully
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            {/* General error */}
            {state.errors.general && (
              <p className="text-sm text-destructive">{state.errors.general}</p>
            )}

            <Separator />

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                defaultValue={initialName}
                placeholder="Enter organization name"
                aria-describedby={state.errors.name ? "name-error" : undefined}
                aria-invalid={!!state.errors.name}
              />
              {state.errors.name && (
                <p id="name-error" className="text-sm text-destructive">
                  {state.errors.name}
                </p>
              )}
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                name="contactName"
                type="text"
                defaultValue={initialContactName ?? ""}
                placeholder="Enter contact name (optional)"
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={initialContactEmail ?? ""}
                placeholder="Enter contact email (optional)"
                aria-describedby={
                  state.errors.contactEmail ? "contactEmail-error" : undefined
                }
                aria-invalid={!!state.errors.contactEmail}
              />
              {state.errors.contactEmail && (
                <p id="contactEmail-error" className="text-sm text-destructive">
                  {state.errors.contactEmail}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
