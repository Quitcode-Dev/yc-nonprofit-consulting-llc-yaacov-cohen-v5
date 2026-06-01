import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

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

  // ── Check for duplicate in same org ──────────────────────────────
  const supabase = await createServerClient();

  // Check by invited_email (pending invitations)
  const { data: existingByInvitedEmail } = await supabase
    .from("organization_users")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("invited_email", email)
    .in("status", ["active", "pending"])
    .limit(1);

  if (existingByInvitedEmail && existingByInvitedEmail.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "User already exists in this organization",
      },
      { status: 409 }
    );
  }

  // Also check if there's an existing user whose profile email matches
  // and who is already in this organization
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (existingProfiles && existingProfiles.length > 0) {
    const profileUserId = existingProfiles[0].id;

    const { data: existingOrgUser } = await supabase
      .from("organization_users")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("user_id", profileUserId)
      .in("status", ["active", "pending"])
      .limit(1);

    if (existingOrgUser && existingOrgUser.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "User already exists in this organization",
        },
        { status: 409 }
      );
    }
  }

  // ── Create auth user via service role client ─────────────────────
  // The organization_users table requires a non-null user_id FK to
  // profiles(id) which references auth.users. We use the admin API to
  // create the auth user (or retrieve the existing one).
  let userId: string;

  try {
    const adminClient = createServiceRoleClient();

    // Check if an auth user already exists for this email
    const { data: existingUsers, error: listError } =
      await adminClient.auth.admin.listUsers();

    if (listError) {
      console.error("Failed to list users:", listError);
      return NextResponse.json(
        { success: false, error: "Failed to process invitation" },
        { status: 500 }
      );
    }

    const existingAuthUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (existingAuthUser) {
      userId = existingAuthUser.id;
    } else {
      // Create a new auth user with a random password (they'll set their
      // own password during registration via the invitation token flow)
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: false,
          user_metadata: {
            first_name: body.firstName || null,
            last_name: body.lastName || null,
            invited: true,
          },
        });

      if (createError || !newUser.user) {
        console.error("Failed to create auth user:", createError);
        return NextResponse.json(
          { success: false, error: "Failed to create user account" },
          { status: 500 }
        );
      }

      userId = newUser.user.id;

      // Create a profile record for the new user
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          id: userId,
          first_name: body.firstName || null,
          last_name: body.lastName || null,
          email,
          role: "solicitor",
          status: "pending",
        });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
        // Clean up the auth user we just created
        await adminClient.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { success: false, error: "Failed to create user profile" },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Service role client error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process invitation" },
      { status: 500 }
    );
  }

  // ── Generate token & expiry ──────────────────────────────────────
  const invitationToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  // ── Insert organization_users record ─────────────────────────────
  // Use the service role client to bypass RLS for the insert
  const adminClient = createServiceRoleClient();

  const { error: insertError } = await adminClient
    .from("organization_users")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      invited_email: email,
      invitation_token: invitationToken,
      invitation_expires_at: expiresAt,
      role: "solicitor",
      status: "pending",
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
    token: invitationToken,
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
        token: invitationToken,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { success: true, message: "Invitation sent" },
    { status: 200 }
  );
}
