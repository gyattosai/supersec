import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../client/src/contexts/ThemeContext";
import { resolveViewOnlyIdentity, ViewOnlyHeader } from "../client/src/components/ViewOnlyHeader";
import { Router } from "wouter";

describe("view-only Subject identity", () => {
  it("uses the secretary-configured mark and full name for a Subject header", () => {
    expect(resolveViewOnlyIdentity({ publicId: "subject-public-id", viewOnlyShortMark: "N001", viewOnlyName: "OLCA113N001" })).toEqual({ shortMark: "N001", fullName: "OLCA113N001", subjectHome: "/s/subject-public-id" });
    const markup = renderToStaticMarkup(createElement(ThemeProvider, { defaultTheme: "dark", switchable: true }, createElement(Router, { ssrPath: "/s/subject-public-id" }, createElement(ViewOnlyHeader, { subject: { publicId: "subject-public-id", viewOnlyShortMark: "N001", viewOnlyName: "OLCA113N001" } }))));

    expect(markup).toContain(">N001<");
    expect(markup).toContain(">OLCA113N001<");
    expect(markup).toContain('href="/s/subject-public-id"');
  });

  it("keeps the safe supersec fallback when a Subject has not configured view-only labels", () => {
    expect(resolveViewOnlyIdentity({ publicId: "subject-public-id", viewOnlyShortMark: null, viewOnlyName: null })).toEqual({ shortMark: "SS", fullName: "supersec", subjectHome: "/s/subject-public-id" });
  });

  it("keeps the editable identity limited to the existing public-safe Subject projections", () => {
    const databaseSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const detailsSource = readFileSync(new URL("../client/src/pages/SubjectPages.tsx", import.meta.url), "utf8");
    const subjectHomeSource = readFileSync(new URL("../client/src/pages/PremiumPublicSubjectHome.tsx", import.meta.url), "utf8");
    const resourceSource = readFileSync(new URL("../client/src/pages/PremiumPublicResourcePage.tsx", import.meta.url), "utf8");
    const proofSource = readFileSync(new URL("../client/src/pages/AttendanceProofPage.tsx", import.meta.url), "utf8");

    expect(databaseSource).toContain("viewOnlyShortMark: subjects.viewOnlyShortMark");
    expect(databaseSource).toContain("viewOnlyName: subjects.viewOnlyName");
    expect(detailsSource).toContain(">View-only header</p>");
    expect(detailsSource).toContain('placeholder="N001"');
    expect(detailsSource).toContain('placeholder="OLCA113N001"');
    expect(subjectHomeSource).toContain("return <PublicFrame subject={subject}>");
    expect(subjectHomeSource).toContain("<ViewOnlyHeader subject={subject}");
    expect(resourceSource).toContain("<PublicShell subject={details.subject}>");
    expect(proofSource).toContain("<PublicShell subject={details.subject}>");
  });
});
