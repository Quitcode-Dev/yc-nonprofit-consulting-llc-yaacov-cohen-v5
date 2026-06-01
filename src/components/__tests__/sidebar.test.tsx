import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/sidebar";

const mockPush = jest.fn();
let mockPathname = "/dashboard";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

const mockSignOut = jest.fn().mockResolvedValue({});
jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

const defaultUser = {
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
};

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/dashboard";
  });

  it("renders super_admin navigation items", () => {
    render(<Sidebar role="super_admin" user={defaultUser} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Organizations")).toBeInTheDocument();
    expect(screen.getByText("Move Ideas Library")).toBeInTheDocument();
    expect(screen.getByText("Feedback Inbox")).toBeInTheDocument();
  });

  it("renders org_admin navigation items", () => {
    render(<Sidebar role="org_admin" user={defaultUser} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Donors")).toBeInTheDocument();
    expect(screen.getByText("Moves")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders fundraiser navigation items", () => {
    render(<Sidebar role="fundraiser" user={defaultUser} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("My Donors")).toBeInTheDocument();
    expect(screen.getByText("My Moves")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  it("renders solicitor navigation items", () => {
    render(<Sidebar role="solicitor" user={defaultUser} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("My Donors")).toBeInTheDocument();
    expect(screen.getByText("My Moves")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  it("renders viewer navigation items for unknown role", () => {
    render(<Sidebar role="unknown_role" user={defaultUser} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Donors")).not.toBeInTheDocument();
    expect(screen.queryByText("Organizations")).not.toBeInTheDocument();
  });

  it("renders viewer navigation items for viewer role", () => {
    render(<Sidebar role="viewer" user={defaultUser} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Donors")).not.toBeInTheDocument();
  });

  it("displays user full name and email when fullName is provided", () => {
    render(<Sidebar role="viewer" user={defaultUser} />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("displays only email when fullName is null", () => {
    render(
      <Sidebar role="viewer" user={{ ...defaultUser, fullName: null }} />
    );

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });

  it("applies active styling to current path link", () => {
    mockPathname = "/dashboard";
    render(<Sidebar role="super_admin" user={defaultUser} />);

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink.className).toContain("bg-accent");
    expect(dashboardLink.className).toContain("text-accent-foreground");
  });

  it("applies active styling for nested paths", () => {
    mockPathname = "/admin/organizations/123";
    render(<Sidebar role="super_admin" user={defaultUser} />);

    const orgLink = screen.getByText("Organizations");
    expect(orgLink.className).toContain("bg-accent");
  });

  it("calls signOut and redirects to /login on logout", async () => {
    render(<Sidebar role="viewer" user={defaultUser} />);

    const logoutButton = screen.getByText("Logout");
    fireEvent.click(logoutButton);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("renders the app title", () => {
    render(<Sidebar role="viewer" user={defaultUser} />);
    expect(screen.getByText("Donor Management")).toBeInTheDocument();
  });
});
