/**
 * Validates a password against the following rules:
 * - Minimum 8 characters
 * - At least 1 number
 * - At least 1 special character
 *
 * Returns an array of error strings (empty if valid).
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least 1 number.");
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("Password must contain at least 1 special character.");
  }

  return errors;
}

/**
 * Validates an email address format.
 * Returns an array of error strings (empty if valid).
 */
export function validateEmail(email: string): string[] {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push("Email is required.");
    return errors;
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Please enter a valid email address.");
  }

  return errors;
}
