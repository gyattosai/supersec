import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Mobile Responsive Overhaul & Safe-Area Defense", () => {
  it("enforces global defensive viewport rules and safe area variables in index.css", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

    // Defensive overflow and box model
    expect(css).toContain("overflow-x: hidden;");
    expect(css).toContain("max-width: 100vw;");

    // Media element bounds
    expect(css).toContain("img, video, canvas, svg");
    expect(css).toContain("max-width: 100%;");

    // Safe-area inset variables
    expect(css).toContain("--sat: env(safe-area-inset-top, 0px);");
    expect(css).toContain("--sab: env(safe-area-inset-bottom, 0px);");
    expect(css).toContain("--sal: env(safe-area-inset-left, 0px);");
    expect(css).toContain("--sar: env(safe-area-inset-right, 0px);");

    // Safe-area utility classes
    expect(css).toContain(".pt-safe");
    expect(css).toContain(".pb-safe");
    expect(css).toContain(".pl-safe");
    expect(css).toContain(".pr-safe");

    // Touch target helpers
    expect(css).toContain(".touch-target");
    expect(css).toContain(".touch-target-compact");
    expect(css).toContain(".touch-target-h");
    expect(css).toContain(".scroll-shadow-x");

    // Fluid typography with clamp
    expect(css).toContain("clamp(");
  });

  it("verifies DashboardLayout mobile bottom navigation, drawer, and safe area padding", () => {
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");

    // Safe-area top header
    expect(layout).toContain("env(safe-area-inset-top");

    // Mobile slide-over drawer and body scroll lock
    expect(layout).toContain("document.body.style.overflow = \"hidden\"");
    expect(layout).toContain("mobileDrawerOpen");

    // 5-item mobile bottom nav (4 core + More)
    expect(layout).toContain("primaryMobileItems");
    expect(layout).toContain("pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]");

    // Safe-area bottom padding
    expect(layout).toContain("env(safe-area-inset-bottom");

    // Touch targets >= 48px
    expect(layout).toContain("min-h-12");
  });

  it("verifies PublicPages and PremiumPublicSubjectHome safe-area insets and touch targets", () => {
    const publicPages = readFileSync(resolve(process.cwd(), "client/src/pages/PublicPages.tsx"), "utf8");
    const subjectHome = readFileSync(resolve(process.cwd(), "client/src/pages/PremiumPublicSubjectHome.tsx"), "utf8");

    // Safe area insets in PublicShell and PublicFrame
    expect(publicPages).toContain("pt-[calc(0.875rem+env(safe-area-inset-top,0px))]");
    expect(publicPages).toContain("pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]");
    expect(subjectHome).toContain("pt-[calc(0.875rem+env(safe-area-inset-top,0px))]");
    expect(subjectHome).toContain("pb-[calc(3rem+env(safe-area-inset-bottom,0px))]");

    // 48px touch targets for action buttons
    expect(publicPages).toContain("inline-flex min-h-12 w-full items-center justify-center");
    expect(publicPages).toContain("bg-emerald-600");
    expect(publicPages).toContain("bg-sky-600");

    // Search bar 48px touch target in Subject Home
    expect(subjectHome).toContain("min-h-12 h-12 sm:h-11");
  });

  it("verifies AttendancePage responsive HUD metrics, status buttons, and floating bulk action bar", () => {
    const attendance = readFileSync(resolve(process.cwd(), "client/src/pages/AttendancePage.tsx"), "utf8");

    // 5th metric card spans 2 columns on mobile to avoid orphaned item
    expect(attendance).toContain('className="col-span-2 sm:col-span-1"');

    // Status buttons have >=44px touch target on mobile with responsive labels
    expect(attendance).toContain("min-h-11 sm:min-h-9");
    expect(attendance).toContain('className="sm:hidden">{shortLabel}</span>');
    expect(attendance).toContain('className="hidden sm:inline">{fullLabel}</span>');

    // Bulk actions bar floats safely above mobile bottom nav bar
    expect(attendance).toContain("bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0");
  });

  it("verifies BulkActionBar floating placement above mobile bottom nav", () => {
    const bulkBar = readFileSync(resolve(process.cwd(), "client/src/components/BulkActionBar.tsx"), "utf8");

    expect(bulkBar).toContain("bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-0");
  });

  it("verifies ReportsPage responsive KPI grid", () => {
    const reports = readFileSync(resolve(process.cwd(), "client/src/pages/ReportsPage.tsx"), "utf8");

    // 5th metric card spans 2 columns on mobile
    expect(reports).toContain("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5");
    expect(reports).toContain('className="col-span-2 sm:col-span-1"');
  });
});
