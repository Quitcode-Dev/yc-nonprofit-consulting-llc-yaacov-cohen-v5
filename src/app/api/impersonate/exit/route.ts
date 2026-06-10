import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Clear the impersonation cookie and redirect to /admin/organizations
  const response = NextResponse.redirect(
    new URL("/admin/organizations", request.url)
  );

  response.cookies.set("impersonated_org_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}
