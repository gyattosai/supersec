import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return <button type="button" onClick={toggleTheme} className="signal-action grid size-10 place-items-center rounded-xl border border-border bg-card/70 text-foreground hover:bg-secondary" aria-label={`Use ${nextTheme} mode`} title={`Use ${nextTheme} mode`}><Icon className="size-4" /></button>;
}
