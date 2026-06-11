import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

// Invitations live in the `org_invites` table (email, role, token, expires_at,
// accepted_at). Unlike the old design, no auth user or membership row is created
// up front — the auth user + user_roles row are created when the invite is
// accepted (see api/invitations/complete). An invite is "pending" while
// accepted_at IS NULL and expires_at is in the future.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matching live data
const DEFAULT_INVITE_ROLE = "organization_solicitor";

export async function POST(request: NextRequest) {
  // ── Auth: only org_admin or super_admin ──────────────────────────
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = getUserRole(currentUser);

  if (!["org_admin", "super_admin"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  // ── Parse & validate body ────────────────────────────────────────
  let body: { email?: string; firstName?: string; lastName?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email is required" },
      { status: 400 }
    );
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { success: false, error: "Invalid email format" },
      { status: 400 }
    );
  }

  // ── Determine caller's organization ──────────────────────────────
  const organizationId = currentUser.organizationUser?.organization_id;

  if (!organizationId) {
    return NextResponse.json(
      {
        success: false,
        error: "No organization associated with your account",
      },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  // ── Already an active member of this org? ────────────────────────
  const { data: existingMember } = await supabase
    .from("user_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .eq("is_active", true)
    .limit(1);

  if (existingMember && existingMember.length > 0) {
    return NextResponse.json(
      { success: false, error: "User already exists in this organization" },
      { status: 409 }
    );
  }

  // ── Already a pending (unaccepted, unexpired) invite? ────────────
  const nowIso = new Date().toISOString();
  const { data: pendingInvite } = await supabase
    .from("org_invites")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", nowIso)
    .limit(1);

  if (pendingInvite && pendingInvite.length > 0) {
    return NextResponse.json(
      { success: false, error: "An invitation for this email is already pending" },
      { status: 409 }
    );
  }

  // ── Create the invite ────────────────────────────────────────────
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  // Use the service role client to bypass RLS for the insert.
  const adminClient = createServiceRoleClient();

  const { error: insertError } = await adminClient.from("org_invites").insert({
    organization_id: organizationId,
    created_by: currentUser.user.id, // org_invites.created_by is the auth user id
    email,
    role: DEFAULT_INVITE_ROLE,
    token,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("Failed to insert invitation record:", insertError);
    return NextResponse.json(
      { success: false, error: "Failed to create invitation" },
      { status: 500 }
    );
  }

  // ── Look up organization name for the email ──────────────────────
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  const orgName = org?.name ?? "your organization";

  // ── Send invitation email ────────────────────────────────────────
  const emailResult = await sendInvitationEmail({
    email,
    token,
    orgName,
    firstName: body.firstName,
    lastName: body.lastName,
  });

  if (!emailResult.success) {
    // The record was created but the email failed. We still return success
    // for the record creation but warn about the email.
    console.error("Invitation created but email failed:", emailResult.error);
    return NextResponse.json(
      {
        success: true,
        message:
          "Invitation created but email delivery failed. The invitation link can be shared manually.",
        token,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { success: true, message: "Invitation sent" },
    { status: 200 }
  );
}
