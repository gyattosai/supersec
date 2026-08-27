import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspacePageHeader } from "../client/src/components/WorkspacePageHeader";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("cross-page copy cleanup", () => {
  it("allows a page heading to omit a redundant eyebrow", () => {
    const header = read("client/src/components/WorkspacePageHeader.tsx");
    expect(header).toContain("eyebrow?: string");
    expect(header).toContain("const showEyebrow");
    const markup = renderToStaticMarkup(createElement(WorkspacePageHeader, { eyebrow: "Archive", title: "Archive" }));
    expect(markup).toContain(">Archive</h1>");
    expect(markup).not.toContain("signal-kicker");
  });

  it("removes confirmed duplicate title pairs and the repeated shared-page footer", () => {
    expect(read("client/src/pages/PublicPages.tsx")).not.toContain("Shared class page");
    expect(read("client/src/pages/PremiumPublicSubjectHome.tsx")).not.toContain("Shared class page");
  });
});
