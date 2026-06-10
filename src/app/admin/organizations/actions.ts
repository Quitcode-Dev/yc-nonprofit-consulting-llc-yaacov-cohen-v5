"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export type CreateOrganizationState = {
  errors: {
    name?: string;
    contactEmail?: string;
    general?: string;
  };
};

export async function createOrganization(
  _prevState: CreateOrganizationState,
  formData: FormData
): Promise<CreateOrganizationState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const contactName = (formData.get("contactName") as string | null)?.trim() ?? "";
  const contactEmail = (formData.get("contactEmail") as string | null)?.trim() ?? "";

  // Validate organization name is not empty
  if (!name) {
    return {
      errors: {
        name: "Organization name is required.",
      },
    };
  }

  // Validate contact email format if provided
  if (contactEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return {
        errors: {
          contactEmail: "Please enter a valid email address.",
        },
      };
    }
  }

  const supabase = await createServerClient();

  // Check for duplicate name (case-insensitive)
  const { data: existing, error: queryError } = await supabase
    .from("organizations")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (queryError) {
    return {
      errors: {
        general: "An error occurred while checking for duplicate names. Please try again.",
      },
    };
  }

  if (existing) {
    return {
      errors: {
        name: "An organization with this name already exists.",
      },
    };
  }

  // Insert the new organization
  const insertPayload: {
    name: string;
    contact_name?: string;
    contact_email?: string;
  } = { name };

  if (contactName) insertPayload.contact_name = contactName;
  if (contactEmail) insertPayload.contact_email = contactEmail;

  const { data: newOrg, error: insertError } = await supabase
    .from("organizations")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !newOrg) {
    return {
      errors: {
        general: "Failed to create organization. Please try again.",
      },
    };
  }

  const newOrgId = newOrg.id as string;

  // Create a default scoring_configs row for the new org with all fields enabled at 0 points
  const { error: scoringError } = await supabase
    .from("scoring_configs")
    .insert({
      organization_id: newOrgId,
      parent_enabled: true,
      parent_points: 0,
      grandparent_enabled: true,
      grandparent_points: 0,
      alumni_enabled: true,
      alumni_points: 0,
      board_member_enabled: true,
      board_member_points: 0,
      community_builder_enabled: true,
      community_builder_points: 0,
      program_attendee_enabled: true,
      program_attendee_points: 0,
      volunteer_enabled: true,
      volunteer_points: 0,
      donor_advised_fund_enabled: true,
      donor_advised_fund_points: 0,
      foundation_trustee_enabled: true,
      foundation_trustee_points: 0,
    });

  if (scoringError) {
    // Log but don't block redirect — org was created successfully
    console.error("Failed to create default scoring config:", scoringError);
  }

  redirect(`/admin/organizations/${newOrgId}`);
}
