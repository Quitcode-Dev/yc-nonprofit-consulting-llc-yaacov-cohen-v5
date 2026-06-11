import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/validators";

const EXPIRED_OR_USED =
  "This invitation link has expired or has already been used. Please contact your administrator for a new invitation.";

export async function POST(request: NextRequest) {
  let body: { token?: string; firstName?: string; lastName?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { token, firstName, lastName, password } = body;

  if (!token || !firstName || !lastName || !password) {
    return NextResponse.json(
      { success: false, error: "All fields are required." },
      { status: 400 }
    );
  }

  // Validate password
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    return NextResponse.json(
      { success: false, error: passwordErrors.join(" ") },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    // 1. Look up the invitation in org_invites
    const { data: invite, error: lookupError } = await supabase
      .from("org_invites")
      .select("id, email, accepted_at, expires_at, organization_id, role")
      .eq("token", token)
      .single();

    if (lookupError || !invite) {
      return NextResponse.json(
        { success: false, error: EXPIRED_OR_USED },
        { status: 400 }
      );
    }

    // Already accepted?
    if (invite.accepted_at) {
      return NextResponse.json(
        { success: false, error: EXPIRED_OR_USED },
        { status: 400 }
      );
    }

    // Expired?
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: EXPIRED_OR_USED },
        { status: 400 }
      );
    }

    const email = invite.email;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Invitation is missing email address." },
        { status: 400 }
      );
    }

    // 2. Create the Supabase auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        },
      });

    if (authError || !authData.user) {
      // If user already exists, provide a helpful message
      if (authError?.message?.includes("already been registered")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "An account with this email already exists. Please log in instead.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: authError?.message || "Failed to create user account.",
        },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 3. Create the org membership / identity row in user_roles, carrying the
    //    role from the invite (e.g. organization_solicitor, organization_admin).
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      organization_id: invite.organization_id,
      role: invite.role,
      email,
      full_name: `${firstName} ${lastName}`.trim(),
      is_active: true,
      invited_by_user_id: null,
    });

    if (roleError) {
      console.error("Failed to create user_roles record:", roleError);
      // Roll back the auth user so the invite can be retried cleanly.
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { success: false, error: "Failed to set up your account." },
        { status: 500 }
      );
    }

    // 4. Mark the invitation accepted.
    const { error: updateError } = await supabase
      .from("org_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Failed to mark invite accepted:", updateError);
      // Non-fatal: the account is usable; the invite token is single-use via
      // the membership existing, but log for visibility.
    }

    // 5. Generate a magic link so the client can establish a session reliably
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      // User was created but we couldn't generate a sign-in link;
      // fall back to letting the client sign in with password.
      return NextResponse.json({
        success: true,
        email,
        hashedToken: null,
        error: null,
      });
    }

    return NextResponse.json({
      success: true,
      email,
      hashedToken: linkData.properties.hashed_token,
      error: null,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
