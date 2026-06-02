"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { getUserRole } from "./actions";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const expired = searchParams.get("expired") === "true";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    startTransition(async () => {
      const supabase = createBrowserClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Invalid email or password");
        return;
      }

      const result = await getUserRole();

      if (!result.success) {
        setError(result.error ?? "Unable to retrieve user profile");
        return;
      }

      // Redirect based on role
      if (result.role === "super_admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    });
  }

  return (
    <Card className="w-full max-w-md p-6">
      <CardHeader className="space-y-1 px-0 pt-0">
        <CardTitle className="text-2xl font-bold text-center">
          Sign In
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {expired && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Your session has expired. Please log in again.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-muted-foreground underline hover:text-primary"
          >
            Forgot Password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
