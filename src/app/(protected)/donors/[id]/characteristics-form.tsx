"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  updateDonorCharacteristics,
  type DonorCharacteristics,
} from "../actions";

interface CharacteristicsFormProps {
  donorId: string;
  editable: boolean;
  initialValues: DonorCharacteristics;
}

const CHARACTERISTICS: Array<{ field: keyof DonorCharacteristics; label: string }> = [
  { field: "is_parent", label: "Parent" },
  { field: "is_grandparent", label: "Grandparent" },
  { field: "is_alumni", label: "Alumni" },
  { field: "is_board_member", label: "Board Member" },
  { field: "is_community_builder", label: "Community Builder" },
  { field: "is_program_attendee", label: "Program Attendee" },
  { field: "is_volunteer", label: "Volunteer" },
  { field: "is_donor_advised_fund", label: "Donor Advised Fund" },
  { field: "is_foundation_trustee", label: "Foundation/Trustee" },
];

export default function CharacteristicsForm({
  donorId,
  editable,
  initialValues,
}: CharacteristicsFormProps) {
  const [values, setValues] = useState<DonorCharacteristics>(initialValues);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleChange(field: keyof DonorCharacteristics, checked: boolean) {
    setValues((prev) => ({ ...prev, [field]: checked }));
    setIsDirty(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateDonorCharacteristics(donorId, values);
      if (result.error) {
        setErrorMsg(result.error);
        setSuccessMsg(null);
      } else {
        setSuccessMsg("Characteristics saved and score recalculated.");
        setErrorMsg(null);
        setIsDirty(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CHARACTERISTICS.map(({ field, label }) => (
          <div key={field} className="flex items-center gap-2">
            <input
              id={`char-${field}`}
              type="checkbox"
              checked={values[field]}
              disabled={!editable}
              onChange={(e) => handleChange(field, e.target.checked)}
              className="h-4 w-4 rounded border border-input accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
            <label
              htmlFor={`char-${field}`}
              className={`text-sm font-normal ${
                editable ? "cursor-pointer" : "cursor-default text-muted-foreground"
              }`}
            >
              {label}
            </label>
          </div>
        ))}
      </div>

      {editable && (
        <div className="flex items-center gap-4 pt-2">
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || isPending}
            onClick={handleSave}
          >
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
          {errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-sm text-green-600">{successMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}
