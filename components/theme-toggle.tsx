"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-full justify-start"
    >
      <Sun className="dark:hidden" />
      <span className="dark:hidden">Svetla tema</span>

      <Moon className="hidden dark:block" />
      <span className="hidden dark:block">Tamna tema</span>

      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
