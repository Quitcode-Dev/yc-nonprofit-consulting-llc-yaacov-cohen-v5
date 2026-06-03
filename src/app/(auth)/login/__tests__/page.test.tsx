import React from "react";
import { render, screen } from "@testing-library/react";
import LoginPage from "../page";

// Mock next/navigation
const mockGet = jest.fn(() => null);
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock the browser client
jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
    },
  })),
}));

// Mock the server action
jest.mock("../actions", () => ({
  getUserRole: jest.fn(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockGet.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders email and password fields", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders the Sign In button", () => {
    render(<LoginPage />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the Forgot Password link", () => {
    render(<LoginPage />);

    const link = screen.getByRole("link", { name: /forgot password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/forgot-password");
  });

  it("renders the Sign In heading", () => {
    render(<LoginPage />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows session expired alert when expired=true query param is present", () => {
    mockGet.mockImplementation((key: string) => (key === "expired" ? "true" : null));
    render(<LoginPage />);

    expect(
      screen.getByText("Your session has expired. Please log in again.")
    ).toBeInTheDocument();
  });

  it("does not show session expired alert when expired param is absent", () => {
    render(<LoginPage />);

    expect(
      screen.queryByText("Your session has expired. Please log in again.")
    ).not.toBeInTheDocument();
  });
});
