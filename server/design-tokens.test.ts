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
    expect(css).toContain("radial-gradient");
    expect(css).toContain("linear-gradient");
  });
});
