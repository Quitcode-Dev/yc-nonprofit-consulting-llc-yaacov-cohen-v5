import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register"];
const PUBLIC_API_ROUTES = [
  "/api/invitations/validate",
  "/api/invitations/complete",
];

function isPublicRoute(pathname: string): boolean {
  // Check exact public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  // Check public API routes
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname.startsWith(route)) {
      return true;
    }
  }

  return false;
}

export async function middleware(request: NextRequest) {
  // First, run the default session update logic (refreshes cookies/tokens)
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Skip session check for public routes
  if (isPublicRoute(pathname)) {
    return response;
  }

  // For protected routes, check if the user session is still valid
  // We need to create a Supabase client that reads from the (possibly refreshed) response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Record<string, unknown>)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // User session has expired or is invalid — redirect to login with expired flag
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("expired", "true");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets (images, svgs, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
