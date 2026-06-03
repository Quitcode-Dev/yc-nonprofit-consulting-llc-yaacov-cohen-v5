"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createOrganization, type CreateOrganizationState } from "../actions";

const initialState: CreateOrganizationState = {
  errors: {},
};

export default function CreateOrganizationPage() {
  const [state, formAction, isPending] = useActionState(
    createOrganization,
    initialState
  );

  return (
    <div className="max-w-lg mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            {/* General error */}
            {state.errors.general && (
              <p className="text-sm text-destructive">{state.errors.general}</p>
            )}

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
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

            {/* Primary Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Primary Contact Name</Label>
              <Input
                id="contactName"
                name="contactName"
                type="text"
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

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create Organization"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/organizations">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
