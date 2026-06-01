import { getCurrentUser, getUserRole, requireRole, CurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(),
}));

const mockRedirect = redirect as unknown as jest.Mock;
const mockCreateServerClient = createServerClient as jest.Mock;

function buildMockSupabase({
  user = null,
  authError = null,
  profile = null,
  organizationUser = null,
}: {
  user?: { id: string; email: string } | null;
  authError?: Error | null;
  profile?: Record<string, unknown> | null;
  organizationUser?: Record<string, unknown> | null;
}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: jest.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: profile, error: null }),
            }),
          }),
        };
      }
      if (table === "organization_users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: organizationUser, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }),
  };
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when there is no authenticated user", async () => {
    const mockSupabase = buildMockSupabase({ user: null });
    mockCreateServerClient.mockResolvedValue(mockSupabase);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns null when auth returns an error", async () => {
    const mockSupabase = buildMockSupabase({
      user: null,
      authError: new Error("Auth error"),
    });
    mockCreateServerClient.mockResolvedValue(mockSupabase);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns user, profile, and organizationUser when authenticated", async () => {
    const user = { id: "user-1", email: "test@example.com" };
    const profile = {
      id: "user-1",
      email: "test@example.com",
      full_name: "Test User",
      avatar_url: null,
      is_super_admin: false,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };
    const orgUser = {
      id: "ou-1",
      organization_id: "org-1",
      user_id: "user-1",
      role: "org_admin",
      status: "active",
      invited_email: null,
      invited_at: null,
      joined_at: "2024-01-01",
      created_at: "2024-01-01",
    };

    const mockSupabase = buildMockSupabase({
      user,
      profile,
      organizationUser: orgUser,
    });
    mockCreateServerClient.mockResolvedValue(mockSupabase);

    const result = await getCurrentUser();
    expect(result).not.toBeNull();
    expect(result!.user.id).toBe("user-1");
    expect(result!.user.email).toBe("test@example.com");
    expect(result!.profile).toEqual(profile);
    expect(result!.organizationUser).toEqual(orgUser);
  });

  it("returns null profile and organizationUser when not found", async () => {
    const user = { id: "user-1", email: "test@example.com" };
    const mockSupabase = buildMockSupabase({ user, profile: null, organizationUser: null });
    mockCreateServerClient.mockResolvedValue(mockSupabase);

    const result = await getCurrentUser();
    expect(result).not.toBeNull();
    expect(result!.profile).toBeNull();
    expect(result!.organizationUser).toBeNull();
  });
});

describe("getUserRole", () => {
  it("returns super_admin when profile.is_super_admin is true", () => {
    const currentUser: CurrentUser = {
      user: { id: "u1", email: "admin@test.com" },
      profile: {
        id: "u1",
        email: "admin@test.com",
        full_name: "Admin",
        avatar_url: null,
        is_super_admin: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      organizationUser: null,
    };

    expect(getUserRole(currentUser)).toBe("super_admin");
  });

  it("returns the organization user role when not super_admin", () => {
    const currentUser: CurrentUser = {
      user: { id: "u1", email: "user@test.com" },
      profile: {
        id: "u1",
        email: "user@test.com",
        full_name: "User",
        avatar_url: null,
        is_super_admin: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      organizationUser: {
        id: "ou1",
        organization_id: "org1",
        user_id: "u1",
        role: "org_admin" as never,
        status: "active" as never,
        invited_email: null,
        invited_at: null,
        joined_at: "2024-01-01",
        created_at: "2024-01-01",
      },
    };

    expect(getUserRole(currentUser)).toBe("org_admin");
  });

  it("returns solicitor role when organization user role is solicitor", () => {
    const currentUser: CurrentUser = {
      user: { id: "u1", email: "sol@test.com" },
      profile: {
        id: "u1",
        email: "sol@test.com",
        full_name: "Solicitor",
        avatar_url: null,
        is_super_admin: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      organizationUser: {
        id: "ou1",
        organization_id: "org1",
        user_id: "u1",
        role: "solicitor" as never,
        status: "active" as never,
        invited_email: null,
        invited_at: null,
        joined_at: "2024-01-01",
        created_at: "2024-01-01",
      },
    };

    expect(getUserRole(currentUser)).toBe("solicitor");
  });

  it("returns fundraiser role when organization user role is fundraiser", () => {
    const currentUser: CurrentUser = {
      user: { id: "u1", email: "fr@test.com" },
      profile: {
        id: "u1",
        email: "fr@test.com",
        full_name: "Fundraiser",
        avatar_url: null,
        is_super_admin: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      organizationUser: {
        id: "ou1",
        organization_id: "org1",
        user_id: "u1",
        role: "fundraiser" as never,
        status: "active" as never,
        invited_email: null,
        invited_at: null,
        joined_at: "2024-01-01",
        created_at: "2024-01-01",
      },
    };

    expect(getUserRole(currentUser)).toBe("fundraiser");
  });

  it("returns viewer when no profile and no organization user", () => {
    const currentUser: CurrentUser = {
      user: { id: "u1", email: "user@test.com" },
      profile: null,
      organizationUser: null,
    };

    expect(getUserRole(currentUser)).toBe("viewer");
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects to /login when user is not authenticated", async () => {
    const mockSupabase = buildMockSupabase({ user: null });
    mockCreateServerClient.mockResolvedValue(mockSupabase);

    await expect(requireRole(["super_admin"])).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /dashboard when user role is not in allowed roles", async () => {
    const user = { id: "u1", email: "user@test.com" };
    const profile = {
      id: "u1",
      email: "user@test.com",
      full_name: "User",
      avatar_url: null,
      is_super_admin: false,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };
    const mockSupabase = buildMockSupabase({ user, profile, organizationUser: null });
    mockCreateServerClient.mockResolvedValue(mockSupabase);

    await expect(requireRole(["super_admin"])).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("returns currentUser when role is allowed", async () => {
    const user = { id: "u1", email: "admin@test.com" };
    const profile = {
      id: "u1",
      email: "admin@test.com",
      full_name: "Admin",
      avatar_url: null,
      is_super_admin: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };
    const mockSupabase = buildMockSupabase({ user, profile, organizationUser: null });
    mockCreateServerClient.mockResolvedValue(mockSupabase);

    const result = await requireRole(["super_admin"]);
    expect(result.user.id).toBe("u1");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
