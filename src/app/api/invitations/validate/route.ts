import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const EXPIRED_OR_USED =
  "This invitation link has expired or has already been used. Please contact your administrator for a new invitation.";

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

    // Look up the invitation by token in org_invites.
    const { data: invite, error } = await supabase
      .from("org_invites")
      .select("id, email, accepted_at, expires_at")
      .eq("token", token)
      .single();

    if (error || !invite) {
      return NextResponse.json(
        { valid: false, email: null, error: EXPIRED_OR_USED },
        { status: 400 }
      );
    }

    // Already accepted?
    if (invite.accepted_at) {
      return NextResponse.json(
        { valid: false, email: null, error: EXPIRED_OR_USED },
        { status: 400 }
      );
    }

    // Expired?
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, email: null, error: EXPIRED_OR_USED },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      error: null,
    });
  } catch {
    return NextResponse.json(
      { valid: false, email: null, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
