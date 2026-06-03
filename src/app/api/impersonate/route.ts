import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Only super_admin can impersonate
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = getUserRole(currentUser);

  if (role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  // Parse body for org ID
  let body: { organizationId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const organizationId = body.organizationId?.trim();

  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: "organizationId is required" },
      { status: 400 }
    );
  }

  // Set impersonation cookie and redirect to /dashboard
  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  response.cookies.set("impersonated_org_id", organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return response;
}
