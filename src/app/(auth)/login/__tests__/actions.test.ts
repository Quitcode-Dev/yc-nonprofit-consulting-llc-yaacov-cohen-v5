import { getUserRole } from "../actions";

// Mock the server client. Roles are read from `user_roles` via
// .from("user_roles").select(...).eq("user_id", id).eq("is_active", true)
// which resolves to { data: rows[], error }.
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockRolesResult = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: () => ({
          eq: () => ({
            // second .eq() resolves the query to the rows array
            eq: () => mockRolesResult(),
          }),
        }),
      };
    },
  }),
}));

describe("getUserRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Not authenticated" } });

    const result = await getUserRole();

    expect(result).toEqual({
      success: false,
      role: null,
      error: "Not authenticated",
    });
  });

  it("returns super_admin when a super_admin role row exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockRolesResult.mockResolvedValue({
      data: [{ role: "super_admin", organization_id: null, is_active: true }],
      error: null,
    });

    const result = await getUserRole();

    expect(result).toEqual({
      success: true,
      role: "super_admin",
      error: null,
    });
    expect(mockFrom).toHaveBeenCalledWith("user_roles");
  });

  it("returns error when the user_roles query fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockRolesResult.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const result = await getUserRole();

    expect(result).toEqual({
      success: false,
      role: null,
      error: "Unable to retrieve user profile",
    });
  });

  it("returns error when the user has no active role rows", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockRolesResult.mockResolvedValue({ data: [], error: null });

    const result = await getUserRole();

    expect(result).toEqual({
      success: false,
      role: null,
      error: "Unable to retrieve user profile",
    });
  });

  it("returns the organization role for a non-super-admin member", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockRolesResult.mockResolvedValue({
      data: [{ role: "organization_admin", organization_id: "org-1", is_active: true }],
      error: null,
    });

    const result = await getUserRole();

    expect(result).toEqual({
      success: true,
      role: "organization_admin",
      error: null,
    });
  });

  it("prefers super_admin when the user has both super_admin and org rows", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockRolesResult.mockResolvedValue({
      data: [
        { role: "organization_admin", organization_id: "org-1", is_active: true },
        { role: "super_admin", organization_id: null, is_active: true },
      ],
      error: null,
    });

    const result = await getUserRole();

    expect(result).toEqual({
      success: true,
      role: "super_admin",
      error: null,
    });
  });
});
