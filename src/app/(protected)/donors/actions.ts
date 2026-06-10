"use server";

import { redirect } from "next/navigation";
import { requireRole, getUserOrganizationId, getCurrentUser, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { calculateDonorScore } from "@/lib/scoring";

export type CreateDonorState = {
  errors: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    capacity?: string;
    general?: string;
  };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9\s\-()+]*$/;

export async function createDonor(
  _prevState: CreateDonorState,
  formData: FormData
): Promise<CreateDonorState> {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return {
      errors: {
        general: "No organization found for your account.",
      },
    };
  }

  const firstName = (formData.get("firstName") as string | null)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";
  const capacityRaw = (formData.get("capacity") as string | null)?.trim() ?? "";
  const assignedSolicitorId =
    (formData.get("assignedSolicitorId") as string | null)?.trim() ?? "";

  // Boolean characteristics
  const isParent = formData.get("is_parent") === "on";
  const isGrandparent = formData.get("is_grandparent") === "on";
  const isAlumni = formData.get("is_alumni") === "on";
  const isBoardMember = formData.get("is_board_member") === "on";
  const isCommunityBuilder = formData.get("is_community_builder") === "on";
  const isProgramAttendee = formData.get("is_program_attendee") === "on";
  const isVolunteer = formData.get("is_volunteer") === "on";
  const isDonorAdvisedFund = formData.get("is_donor_advised_fund") === "on";
  const isFoundationTrustee = formData.get("is_foundation_trustee") === "on";

  const errors: CreateDonorState["errors"] = {};

  // Validate required fields
  if (!firstName) {
    errors.firstName = "First name is required.";
  }
  if (!lastName) {
    errors.lastName = "Last name is required.";
  }

  // Validate email format if provided
  if (email && !EMAIL_REGEX.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  // Validate phone format if provided
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone =
      "Phone number may only contain digits, spaces, dashes, parentheses, and plus sign.";
  }

  // Validate capacity if provided
  let capacity: number | null = null;
  if (capacityRaw !== "") {
    const parsed = Number(capacityRaw);
    if (isNaN(parsed) || parsed < 0) {
      errors.capacity = "Capacity must be a valid non-negative number.";
    } else {
      capacity = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createServerClient();

  const { data: newDonor, error: insertError } = await supabase
    .from("donors")
    .insert({
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      capacity: capacity,
      assigned_solicitor_id: assignedSolicitorId || null,
      is_parent: isParent,
      is_grandparent: isGrandparent,
      is_alumni: isAlumni,
      is_board_member: isBoardMember,
      is_community_builder: isCommunityBuilder,
      is_program_attendee: isProgramAttendee,
      is_volunteer: isVolunteer,
      is_donor_advised_fund: isDonorAdvisedFund,
      is_foundation_trustee: isFoundationTrustee,
    })
    .select("id")
    .single();

  if (insertError || !newDonor) {
    return {
      errors: {
        general: "Failed to create donor. Please try again.",
      },
    };
  }

  // Calculate score and assign tier after creation
  await calculateDonorScore(newDonor.id, organizationId);

  redirect(`/donors/${newDonor.id}`);
}

// ─── Donor Characteristics ────────────────────────────────────────────────────

export type DonorCharacteristics = {
  is_parent: boolean;
  is_grandparent: boolean;
  is_alumni: boolean;
  is_board_member: boolean;
  is_community_builder: boolean;
  is_program_attendee: boolean;
  is_volunteer: boolean;
  is_donor_advised_fund: boolean;
  is_foundation_trustee: boolean;
};

export type UpdateCharacteristicsState = {
  error?: string;
  success?: boolean;
};

export async function updateDonorCharacteristics(
  donorId: string,
  characteristics: DonorCharacteristics
): Promise<UpdateCharacteristicsState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    return { error: "No organization found for your account." };
  }

  const supabase = await createServerClient();

  // Fetch donor to verify ownership and org
  const { data: donor, error: donorError } = await supabase
    .from("donors")
    .select("id, organization_id, assigned_solicitor_id")
    .eq("id", donorId)
    .eq("organization_id", organizationId)
    .single();

  if (donorError || !donor) {
    return { error: "Donor not found." };
  }

  // Check authorization: admin can edit any donor; solicitor can only edit assigned donors
  const role = getUserRole(currentUser);
  const isAdmin = role === "org_admin" || role === "super_admin";
  const isSolicitorAssigned =
    role === "solicitor" &&
    donor.assigned_solicitor_id === currentUser.user.id;

  if (!isAdmin && !isSolicitorAssigned) {
    return { error: "You are not authorized to edit this donor." };
  }

  const { error: updateError } = await supabase
    .from("donors")
    .update(characteristics)
    .eq("id", donorId);

  if (updateError) {
    return { error: "Failed to update characteristics. Please try again." };
  }

  // Recalculate score
  await calculateDonorScore(donorId, organizationId);

  return { success: true };
}
