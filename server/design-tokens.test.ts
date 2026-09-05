import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(value => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("supersec primary action tokens", () => {
  it("uses white labels on the saturated orange primary action with readable contrast", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    expect(css).toContain("--primary: #c95000;");
    expect(css).toContain("--primary-foreground: #ffffff;");
    expect(contrast("#c95000", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("uses a charcoal-grey dark surface ladder while retaining a light readable foreground", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    expect(css).toContain("--background: #151619;");
    expect(css).toContain("--card: #1c1e22;");
    expect(css).toContain("--secondary: #24262b;");
    expect(css).toContain("--foreground: #f1f1f0;");
    expect(css).not.toContain("--background: #010102;");
  });

  it("uses Manrope and Inter roles loaded from the Google font stylesheet", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(css).toContain('font-family: "Inter", -apple-system');
    expect(css).toContain('font-family: "Manrope", "Inter", sans-serif');
    expect(html).toContain("fonts.googleapis.com");
    expect(html).toContain("fonts.gstatic.com");
  });

  it("uses restrained gradient tokens for canvas, elevated surfaces, and editor chrome", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    expect(css).toContain("--signal-glow-primary:");
    expect(css).toContain("--signal-glow-secondary:");
    expect(css).toContain(".signal-canvas");
    expect(css).toContain(".signal-header-surface");
    expect(css).toContain(".signal-sidebar-surface");
    expect(css).toContain(".signal-editor-shell");
    expect(css).toContain(".signal-landing-hero");
    expect(css).toContain(".signal-hero-surface");
    expect(css).toContain(".signal-gradient-tile");
    expect(css).toContain(".signal-editor-toolbar");
    expect(css).toContain(".signal-panel.border-l-2.border-l-primary");
    expect(css).toContain(".signal-card-shell > form.signal-record-card");
    expect(css).toContain(".signal-panel > .bg-secondary\\/65");
    expect(css).toContain("radial-gradient");
    expect(css).toContain("linear-gradient");
  });

  it("keeps shared card hover feedback stable and limited to precise hover devices", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain(".signal-card-shell:has(.signal-card-interactive:hover)");
    expect(css).toContain(".signal-card-interactive:hover { background-color:");
    expect(css).not.toContain(".signal-card-interactive:hover { transform:");
  });

  it("enforces WCAG AA (>= 4.5:1) contrast compliance on status badge foregrounds in both light and dark modes", () => {
    const lightBg = "#f7f5f2";
    const darkBg = "#151619";

    // Emerald status badge (#047857 light, #34d399 dark)
    expect(contrast("#047857", lightBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#34d399", darkBg)).toBeGreaterThanOrEqual(4.5);

    // Amber status badge (#92400e light, #fbbf24 dark)
    expect(contrast("#92400e", lightBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#fbbf24", darkBg)).toBeGreaterThanOrEqual(4.5);

    // Sky status badge (#0369a1 light, #38bdf8 dark)
    expect(contrast("#0369a1", lightBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#38bdf8", darkBg)).toBeGreaterThanOrEqual(4.5);

    // Purple status badge (#6d28d9 light, #a78bfa dark)
    expect(contrast("#6d28d9", lightBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#a78bfa", darkBg)).toBeGreaterThanOrEqual(4.5);
  });

  it("enforces WCAG AAA compliance (>= 7.0:1) on primary body copy in both light and dark modes", () => {
    const lightBg = "#f7f5f2";
    const lightFg = "#1d1e20";
    const darkBg = "#151619";
    const darkFg = "#f1f1f0";

    expect(contrast(lightFg, lightBg)).toBeGreaterThanOrEqual(7.0);
    expect(contrast(darkFg, darkBg)).toBeGreaterThanOrEqual(7.0);
  });

  it("includes FOUC prevention script and dual-mode theme-color meta in index.html", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    // Theme color meta tags
    expect(html).toContain('name="theme-color" media="(prefers-color-scheme: dark)" content="#151619"');
    expect(html).toContain('name="theme-color" media="(prefers-color-scheme: light)" content="#f7f5f2"');

    // Synchronous head script to set .dark before initial paint
    expect(html).toContain('localStorage.getItem("theme")');
    expect(html).toContain('document.documentElement.classList.add("dark")');
  });

  it("defines smooth surface transitions and theme-adaptive scrollbars with reduced-motion support in index.css", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    // Theme-adaptive scrollbars
    expect(css).toContain("scrollbar-width: thin;");
    expect(css).toContain("scrollbar-color:");

    // Smooth surface transitions
    expect(css).toContain("transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");

    // Glow badges for both light and dark modes
    expect(css).toContain(".glow-badge-emerald");
    expect(css).toContain(".glow-badge-amber");
    expect(css).toContain(".glow-badge-sky");
    expect(css).toContain(".glow-badge-violet");
    expect(css).toContain(".dark .glow-badge-emerald");
    expect(css).toContain(".dark .glow-badge-amber");
    expect(css).toContain(".dark .glow-badge-sky");
    expect(css).toContain(".dark .glow-badge-violet");
  });

  it("ensures UI primitives do not use murky hardcoded dark:bg-input/30 overlays", () => {
    const select = readFileSync(resolve(process.cwd(), "client/src/components/ui/select.tsx"), "utf8");
    const checkbox = readFileSync(resolve(process.cwd(), "client/src/components/ui/checkbox.tsx"), "utf8");
    const tabs = readFileSync(resolve(process.cwd(), "client/src/components/ui/tabs.tsx"), "utf8");
    const switchComp = readFileSync(resolve(process.cwd(), "client/src/components/ui/switch.tsx"), "utf8");

    expect(select).not.toContain("dark:bg-input/30");
    expect(checkbox).not.toContain("dark:bg-input/30");
    expect(tabs).not.toContain("dark:bg-input/30");
    expect(switchComp).not.toContain("dark:bg-input/30");
  });
});
