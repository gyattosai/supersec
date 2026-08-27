import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { ThemeProvider } from "../client/src/contexts/ThemeContext";

const configuredSubject = {
  publicId: "subject-public-id",
  name: "Operations Management",
  code: "OLCBTQM01",
  viewOnlyShortMark: "N001",
  viewOnlyName: "OLCA113N001",
  professorName: "Professor Casimiro",
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    foundation: {
      publicSubject: { useQuery: vi.fn(() => ({ data: { available: true, subject: { ...configuredSubject, meetingDays: [], noClass: null, latest: { attendance: [], announcements: [], resources: [], questions: [] } } } })) },
      publicItem: { useQuery: vi.fn(() => ({ data: { available: true, item: { kind: "resource", publicId: "resource-public-id", title: "Class guide", body: "Read this guide.", version: 1, publishedAt: null, destinationUrl: null, category: "Guide", resourceType: "Link", sourceDomain: "example.edu", media: null, socialPreviewMedia: null, attachments: [], subject: configuredSubject } } })) },
      publicHistory: { useQuery: vi.fn(() => ({ data: { available: false } })) },
    },
  },
}));

import { PremiumPublicResourcePage } from "../client/src/pages/PremiumPublicResourcePage";
import { PremiumPublicSubjectHome } from "../client/src/pages/PremiumPublicSubjectHome";

function renderPage(path: string, Page: () => React.ReactNode) {
  return renderToStaticMarkup(createElement(ThemeProvider, { defaultTheme: "dark", switchable: true }, createElement(Router, { ssrPath: path }, createElement(Page))));
}

describe("configured view-only identity pages", () => {
  it("renders the configured identity in the full premium Subject home", () => {
    const markup = renderPage("/s/subject-public-id", PremiumPublicSubjectHome);

    expect(markup).toContain(">N001<");
    expect(markup).toContain(">OLCA113N001<");
    expect(markup).not.toContain("Class updates");
    expect(markup).not.toContain("See what is shared.");
  });

  it("renders the configured identity in a related public Resource page", () => {
    const markup = renderPage("/r/resource-public-id", PremiumPublicResourcePage);

    expect(markup).toContain(">N001<");
    expect(markup).toContain(">OLCA113N001<");
  });
});
