import { createBrowserClient } from "../client";

// Mock @supabase/ssr
jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({ auth: {}, from: jest.fn() })),
}));

describe("createBrowserClient", () => {
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

  it("returns a Supabase client instance", () => {
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("calls createBrowserClient from @supabase/ssr with env vars", () => {
    const { createBrowserClient: mockCreate } = require("@supabase/ssr");
    createBrowserClient();
    expect(mockCreate).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    );
  });
});
