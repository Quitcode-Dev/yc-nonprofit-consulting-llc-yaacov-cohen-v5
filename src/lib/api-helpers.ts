import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getUserOrganizationId,
  type CurrentUser,
} from "@/lib/auth";

export interface OrgScopedRequest {
  currentUser: CurrentUser;
  organizationId: string;
}

/**
 * Wraps an API route handler to automatically validate the user's
 * organization membership and inject organization_id filtering.
 *
 * The wrapped handler receives the original NextRequest plus an
 * OrgScopedRequest object containing the authenticated user and
 * their organization_id.
 *
 * Returns 401 if the user is not authenticated.
 * Returns 403 if the user has no associated organization.
 *
 * If the request includes an `organizationId` in the JSON body or
 * as a query parameter, it is validated against the user's org.
 * Super Admins bypass this validation.
 */
export function withOrgScope(
  handler: (
    request: NextRequest,
    orgScoped: OrgScopedRequest
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = currentUser.profile?.is_super_admin === true;

    const organizationId = await getUserOrganizationId();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Forbidden: no organization associated with user" },
        { status: 403 }
      );
    }

    // If the request specifies an organizationId, validate it matches
    // the user's org (Super Admins bypass this check)
    const requestedOrgId = await extractRequestedOrgId(request);

    if (requestedOrgId && !isSuperAdmin && requestedOrgId !== organizationId) {
      return NextResponse.json(
        { error: "Forbidden: organization mismatch" },
        { status: 403 }
      );
    }

    return handler(request, {
      currentUser,
      organizationId: requestedOrgId && isSuperAdmin ? requestedOrgId : organizationId,
    });
  };
}

/**
 * Attempts to extract an organizationId from the request query params
 * or JSON body. Returns null if not found.
 */
async function extractRequestedOrgId(
  request: NextRequest
): Promise<string | null> {
  // Check query parameter first
  const queryOrgId = request.nextUrl.searchParams.get("organizationId");
  if (queryOrgId) {
    return queryOrgId;
  }

  // Try to read from JSON body for POST/PUT/PATCH requests
  if (
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "PATCH"
  ) {
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      if (body && typeof body.organizationId === "string") {
        return body.organizationId;
      }
    } catch {
      // Body is not JSON or not parseable — that's fine
    }
  }

  return null;
}
