"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { validatePassword } from "@/lib/validators";
import { createBrowserClient } from "@/lib/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Loading…</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError(
        "This invitation link has expired or has already been used. Please contact your administrator for a new invitation."
      );
      setValidating(false);
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(
          `/api/invitations/validate?token=${encodeURIComponent(token!)}`,
          { method: "GET" }
        );
        const data = await res.json();

        if (data.valid && data.email) {
          setTokenValid(true);
          setEmail(data.email);
        } else {
          setTokenError(
            data.error ||
              "This invitation link has expired or has already been used. Please contact your administrator for a new invitation."
          );
        }
      } catch {
        setTokenError("An unexpected error occurred while validating your invitation.");
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [token]);

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (value.length > 0) {
      setPasswordErrors(validatePassword(value));
    } else {
      setPasswordErrors([]);
    }
    // Re-check confirm password match
    if (confirmPassword.length > 0 && value !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError(null);
    }
  }

  function handleConfirmPasswordChange(value: string) {
    setConfirmPassword(value);
    if (value.length > 0 && value !== password) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError(null);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    // Validate all fields
    let hasError = false;

    if (!firstName.trim()) {
      setFirstNameError("First name is required.");
      hasError = true;
    } else {
      setFirstNameError(null);
    }

    if (!lastName.trim()) {
      setLastNameError("Last name is required.");
      hasError = true;
    } else {
      setLastNameError(null);
    }

    const pwErrors = validatePassword(password);
    setPasswordErrors(pwErrors);
    if (pwErrors.length > 0) {
      hasError = true;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      hasError = true;
    } else {
      setConfirmPasswordError(null);
    }

    if (hasError) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/invitations/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            password,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          setSubmitError(data.error || "Registration failed. Please try again.");
          return;
        }

        // Sign in the user on the client side
        const supabase = createBrowserClient();
        let signedIn = false;

        // Prefer the server-generated magic link token for reliable sign-in
        if (data.hashedToken) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: data.hashedToken,
            type: "magiclink",
          });
          if (!otpError) {
            signedIn = true;
          }
        }

        // Fall back to password sign-in if magic link wasn't available or failed
        if (!signedIn) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: data.email || email,
            password,
          });
          if (signInError) {
            // Account was created but sign-in failed; redirect to login
            router.push("/login");
            return;
          }
        }

        router.push("/dashboard");
      } catch {
        setSubmitError("An unexpected error occurred. Please try again.");
      }
    });
  }

  // Loading state
  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Validating Invitation</CardTitle>
            <CardDescription>Please wait while we verify your invitation link…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Token invalid / expired
  if (!tokenValid || tokenError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-destructive">{tokenError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration form
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>Set up your account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (e.target.value.trim()) setFirstNameError(null);
                }}
                placeholder="Enter your first name"
              />
              {firstNameError && (
                <p className="text-sm text-destructive">{firstNameError}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (e.target.value.trim()) setLastNameError(null);
                }}
                placeholder="Enter your last name"
              />
              {lastNameError && (
                <p className="text-sm text-destructive">{lastNameError}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Create a password"
              />
              {passwordErrors.length > 0 && (
                <ul className="space-y-1">
                  {passwordErrors.map((err) => (
                    <li key={err} className="text-sm text-destructive">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                placeholder="Confirm your password"
              />
              {confirmPasswordError && (
                <p className="text-sm text-destructive">{confirmPasswordError}</p>
              )}
            </div>

            {/* Submit error */}
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating Account…" : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
