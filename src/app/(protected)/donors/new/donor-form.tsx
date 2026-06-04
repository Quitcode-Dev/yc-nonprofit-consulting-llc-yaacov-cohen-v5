"use client";

import React, { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createDonor, type CreateDonorState } from "../actions";

export interface Solicitor {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface DonorFormProps {
  solicitors: Solicitor[];
}

const initialState: CreateDonorState = {
  errors: {},
};

const CHARACTERISTICS = [
  { name: "is_parent", label: "Parent" },
  { name: "is_grandparent", label: "Grandparent" },
  { name: "is_alumni", label: "Alumni" },
  { name: "is_board_member", label: "Board Member" },
  { name: "is_community_builder", label: "Community Builder" },
  { name: "is_program_attendee", label: "Program Attendee" },
  { name: "is_volunteer", label: "Volunteer" },
  { name: "is_donor_advised_fund", label: "Donor Advised Fund" },
  { name: "is_foundation_trustee", label: "Foundation/Trustee" },
] as const;

export default function DonorForm({ solicitors }: DonorFormProps) {
  const [state, formAction, isPending] = useActionState(
    createDonor,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Read-only score/tier badges */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-sm px-3 py-1">
          Score: --
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          Tier: --
        </Badge>
        <span className="text-xs text-muted-foreground">
          (Calculated after save)
        </span>
      </div>

      {/* General error */}
      {state.errors.general && (
        <p className="text-sm text-destructive">{state.errors.general}</p>
      )}

      {/* Section 1: Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Enter first name"
              aria-describedby={
                state.errors.firstName ? "firstName-error" : undefined
              }
              aria-invalid={!!state.errors.firstName}
              aria-required="true"
            />
            {state.errors.firstName && (
              <p id="firstName-error" className="text-sm text-destructive">
                {state.errors.firstName}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Enter last name"
              aria-describedby={
                state.errors.lastName ? "lastName-error" : undefined
              }
              aria-invalid={!!state.errors.lastName}
              aria-required="true"
            />
            {state.errors.lastName && (
              <p id="lastName-error" className="text-sm text-destructive">
                {state.errors.lastName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email address (optional)"
              aria-describedby={
                state.errors.email ? "email-error" : undefined
              }
              aria-invalid={!!state.errors.email}
            />
            {state.errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {state.errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="e.g. +1 (555) 555-5555 (optional)"
              aria-describedby={
                state.errors.phone ? "phone-error" : undefined
              }
              aria-invalid={!!state.errors.phone}
            />
            {state.errors.phone && (
              <p id="phone-error" className="text-sm text-destructive">
                {state.errors.phone}
              </p>
            )}
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity ($)</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="0"
              step="any"
              placeholder="Enter giving capacity (optional)"
              aria-describedby={
                state.errors.capacity ? "capacity-error" : undefined
              }
              aria-invalid={!!state.errors.capacity}
            />
            {state.errors.capacity && (
              <p id="capacity-error" className="text-sm text-destructive">
                {state.errors.capacity}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignedSolicitorId">Assigned Solicitor</Label>
            <select
              id="assignedSolicitorId"
              name="assignedSolicitorId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {solicitors.map((s) => {
                const fullName = [s.firstName, s.lastName]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <option key={s.userId} value={s.userId}>
                    {fullName || s.email || s.userId}
                  </option>
                );
              })}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Characteristics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Characteristics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHARACTERISTICS.map(({ name, label }) => (
              <div key={name} className="flex items-center gap-2">
                <input
                  id={name}
                  name={name}
                  type="checkbox"
                  value="on"
                  className="h-4 w-4 rounded border border-input accent-primary cursor-pointer"
                />
                <Label htmlFor={name} className="cursor-pointer font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Donor"}
        </Button>
        <a
          href="/donors"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
