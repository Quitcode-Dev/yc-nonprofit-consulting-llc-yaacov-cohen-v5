import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { valid: false, email: null, error: "Token is required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    // Look up the organization_users record by invitation token
    const { data: orgUser, error } = await supabase
      .from("organization_users")
      .select("id, invited_email, status, invited_at, organization_id")
      .eq("invitation_token", token)
      .single();

    if (error || !orgUser) {
      return NextResponse.json(
        {
          valid: false,
          email: null,
          error:
            "This invitation link has expired or has already been used. Please contact your administrator for a new invitation.",
        },
        { status: 400 }
      );
    }

    // Check if already used (status is active means already completed registration)
    if (orgUser.status === "active") {
      return NextResponse.json(
        {
          valid: false,
          email: null,
          error:
            "This invitation link has expired or has already been used. Please contact your administrator for a new invitation.",
        },
        { status: 400 }
      );
    }

    // Check if expired (48 hours from invited_at)
    if (orgUser.invited_at) {
      const invitedAt = new Date(orgUser.invited_at);
      const now = new Date();
      const hoursDiff =
        (now.getTime() - invitedAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 48) {
        return NextResponse.json(
          {
            valid: false,
            email: null,
            error:
              "This invitation link has expired or has already been used. Please contact your administrator for a new invitation.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      valid: true,
      email: orgUser.invited_email,
      error: null,
    });
  } catch {
    return NextResponse.json(
      { valid: false, email: null, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
