"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Site header containing the dark-mode toggle button.
 *
 * A `mounted` guard prevents a hydration mismatch: on the server (and the
 * initial client render before hydration) the button is rendered as an empty
 * placeholder with the same dimensions, so the DOM stays identical.  Once the
 * component mounts on the client we know the real theme and can show the
 * correct icon.
 */
export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background dark:bg-background dark:text-foreground">
      <span className="text-sm font-semibold">Donor Management</span>

      {/* Reserve space before mount to avoid layout shift */}
      {!mounted ? (
        <div className="h-10 w-10" aria-hidden="true" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      )}
    </header>
  );
}
