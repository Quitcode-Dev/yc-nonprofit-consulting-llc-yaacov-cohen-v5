"use server";

import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export type UpdateOrganizationState = {
  errors: {
    name?: string;
    contactEmail?: string;
    general?: string;
  };
  success?: boolean;
};

export async function updateOrganization(
  _prevState: UpdateOrganizationState,
  formData: FormData
): Promise<UpdateOrganizationState> {
  // Verify the caller is an org_admin or super_admin
  await requireRole(["org_admin", "super_admin"]);

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const contactName =
    (formData.get("contactName") as string | null)?.trim() ?? "";
  const contactEmail =
    (formData.get("contactEmail") as string | null)?.trim() ?? "";

  // Validate: name is required
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

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return {
      errors: {
        general: "No organization found for your account.",
      },
    };
  }

  const supabase = await createServerClient();

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      name,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
    })
    .eq("id", organizationId);

  if (updateError) {
    return {
      errors: {
        general: "Failed to update organization settings. Please try again.",
      },
    };
  }

  return {
    errors: {},
    success: true,
  };
}
