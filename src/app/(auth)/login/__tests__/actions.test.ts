import { getUserRole } from "../actions";

// Mock the server client
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockLimit = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...sArgs: unknown[]) => {
          mockSelect(...sArgs);
          return {
            eq: (...eArgs: unknown[]) => {
              mockEq(...eArgs);
              return {
                single: () => mockSingle(),
                eq: (...e2Args: unknown[]) => {
                  mockEq(...e2Args);
                  return {
                    limit: (...lArgs: unknown[]) => {
                      mockLimit(...lArgs);
                      return {
                        single: () => mockSingle(),
                      };
                    },
                  };
                },
              };
            },
          };
        },
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

  it("returns super_admin role when profile is_super_admin is true", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { is_super_admin: true },
      error: null,
    });

    const result = await getUserRole();

    expect(result).toEqual({
      success: true,
      role: "super_admin",
      error: null,
    });
    expect(mockFrom).toHaveBeenCalledWith("profiles");
  });

  it("returns error when profile cannot be retrieved", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const result = await getUserRole();

    expect(result).toEqual({
      success: false,
      role: null,
      error: "Unable to retrieve user profile",
    });
  });

  it("returns org_admin role from organization_users", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    // First single() call: profiles query
    mockSingle
      .mockResolvedValueOnce({
        data: { is_super_admin: false },
        error: null,
      })
      // Second single() call: organization_users query
      .mockResolvedValueOnce({
        data: { role: "org_admin" },
        error: null,
      });

    const result = await getUserRole();

    expect(result).toEqual({
      success: true,
      role: "org_admin",
      error: null,
    });
  });

  it("defaults to solicitor role when no org user found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle
      .mockResolvedValueOnce({
        data: { is_super_admin: false },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
      });

    const result = await getUserRole();

    expect(result).toEqual({
      success: true,
      role: "solicitor",
      error: null,
    });
  });
});
