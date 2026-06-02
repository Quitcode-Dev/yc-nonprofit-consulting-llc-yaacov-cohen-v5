import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { validatePassword } from "@/lib/validators";

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

    // 1. Look up the invitation
    const { data: orgUser, error: lookupError } = await supabase
      .from("organization_users")
      .select("id, invited_email, status, invited_at, organization_id, role")
      .eq("invitation_token", token)
      .single();

    if (lookupError || !orgUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This invitation link has expired or has already been used. Please contact your administrator for a new invitation.",
        },
        { status: 400 }
      );
    }

    // Check if already used
    if (orgUser.status === "active") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This invitation link has expired or has already been used. Please contact your administrator for a new invitation.",
        },
        { status: 400 }
      );
    }

    // Check if expired (48 hours)
    if (orgUser.invited_at) {
      const invitedAt = new Date(orgUser.invited_at);
      const now = new Date();
      const hoursDiff =
        (now.getTime() - invitedAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 48) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This invitation link has expired or has already been used. Please contact your administrator for a new invitation.",
          },
          { status: 400 }
        );
      }
    }

    const email = orgUser.invited_email;

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

    // 3. Create profile record
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        is_super_admin: false,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Failed to create profile:", profileError);
      // Don't fail the whole flow — the user is created
    }

    // 4. Update organization_users: set user_id, status to active, clear token
    const { error: updateError } = await supabase
      .from("organization_users")
      .update({
        user_id: userId,
        status: "active",
        joined_at: new Date().toISOString(),
        invitation_token: null,
      })
      .eq("id", orgUser.id);

    if (updateError) {
      console.error("Failed to update organization_users:", updateError);
    }

    // 5. Generate a session for the new user so they are logged in
    //    We use the admin API to generate a magic link or sign in on their behalf.
    //    Since we're server-side, we return success and let the client sign in.
    return NextResponse.json({
      success: true,
      email,
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
