import { createServerClient } from "../server";

// Mock next/headers
const mockGetAll = jest.fn(() => []);
const mockSet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      getAll: mockGetAll,
      set: mockSet,
    })
  ),
}));

// Mock @supabase/ssr
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({ auth: {}, from: jest.fn() })),
}));

describe("createServerClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it("returns a Supabase client instance", async () => {
    const client = await createServerClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("calls createServerClient from @supabase/ssr with env vars and cookie handlers", async () => {
    const { createServerClient: mockCreate } = require("@supabase/ssr");
    await createServerClient();
    expect(mockCreate).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });
});
