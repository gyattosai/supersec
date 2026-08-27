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
});
