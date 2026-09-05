import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { Monitor, Moon, Sun } from "lucide-react";

const options: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle({
  compact = false,
  fullWidth = false,
  className = "",
}: {
  compact?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  const { theme, setTheme, switchable } = useTheme();
  if (!switchable || !setTheme) return null;

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-xl border border-border bg-secondary/50 p-0.5 ${
        fullWidth ? "flex w-full" : ""
      } ${className}`}
      role="radiogroup"
      aria-label="Color theme"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            onClick={() => setTheme(value)}
            className={`relative flex items-center justify-center rounded-[10px] transition-all duration-200 ${
              fullWidth
                ? "flex-1 min-h-8 gap-1.5 px-2 py-1.5"
                : compact
                ? "size-8"
                : "min-h-8 gap-1.5 px-2.5 py-1.5"
            } ${
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            {!compact && (
              <span className="text-[11px] font-semibold leading-none">
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SimpleThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme, switchable } = useTheme();
  if (!switchable || !setTheme) return null;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`grid size-11 sm:size-9 place-items-center rounded-xl border border-border bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all shadow-xs cursor-pointer ${className}`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700 dark:text-slate-300" />}
    </button>
  );
}
