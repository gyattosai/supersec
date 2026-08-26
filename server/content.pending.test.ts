import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { SignalContentList } from "../client/src/pages/FocusedContentPage";

describe("focused content row pending labels", () => {
  it("labels only the targeted published Resource as Archiving during its active mutation", () => {
    const html = renderToStaticMarkup(createElement(Router, { ssrPath: "/" }, createElement(SignalContentList, {
      kind: "resources",
      subjectId: 1,
      loading: false,
      items: [
        { id: 8, title: "Course guide", category: "Course file", resourceType: "Google Drive", publicId: "resource-8", publishState: "published", version: 2, destinationUrl: "https://example.edu/guide" },
        { id: 9, title: "Reading list", category: "Course file", resourceType: "External link", publicId: "resource-9", publishState: "published", version: 1, destinationUrl: "https://example.edu/reading" },
      ],
      onPublish: vi.fn(),
      onArchive: vi.fn(),
      onRestore: vi.fn(),
      pendingAction: { type: "archive", id: 8 },
    })));

    expect(html).toContain("Archiving…");
    expect(html).toContain("Archive");
    expect(html).toContain('aria-busy="true"');
  });
});
