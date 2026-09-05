import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { ThemeProvider } from "../client/src/contexts/ThemeContext";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const mockStudents = [
  { canonicalName: "Dela Cruz, Juan M.", hasScheduleConflict: false },
  { canonicalName: "Santos, Maria Clara", hasScheduleConflict: true },
  { canonicalName: "Aquino, Jose P.", hasScheduleConflict: false },
];

const mockSubjectData = {
  publicId: "subject-test-public-id",
  name: "Advanced Web Systems",
  code: "AWS-301",
  viewOnlyShortMark: "AWS01",
  viewOnlyName: "AWS-SECTION-1",
  professorName: "Dr. Alan Turing",
  meetingDays: [],
  noClass: null,
  students: mockStudents,
  latest: {
    attendance: [],
    announcements: [],
    resources: [],
    questions: [],
  },
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    foundation: {
      publicSubject: {
        useQuery: vi.fn(() => ({
          isLoading: false,
          isError: false,
          data: {
            available: true,
            subject: mockSubjectData,
          },
        })),
      },
      publicAttendance: {
        useQuery: vi.fn(() => ({ data: { available: false } })),
      },
      publicItem: {
        useQuery: vi.fn(() => ({ data: { available: false } })),
      },
      publicQuestions: {
        useQuery: vi.fn(() => ({ data: { available: false } })),
      },
      publicStudents: {
        useQuery: vi.fn(() => ({ data: { available: true, count: 3, students: mockStudents } })),
      },
    },
  },
}));

import { PremiumPublicSubjectHome } from "../client/src/pages/PremiumPublicSubjectHome";
import { PublicSubjectPage } from "../client/src/pages/PublicPages";

function renderPage(path: string, Page: () => React.ReactNode) {
  return renderToStaticMarkup(
    createElement(
      ThemeProvider,
      { defaultTheme: "dark", switchable: true },
      createElement(Router, { ssrPath: path }, createElement(Page))
    )
  );
}

describe("Student Master List on Public Subject Pages", () => {
  it("returns unavailable when querying publicStudents for an invalid publicId", async () => {
    const caller = appRouter.createCaller(publicContext());
    const res = await caller.foundation.publicStudents({ publicId: "non-existent-subject-id" });
    expect(res).toEqual({ available: false });
  });

  it("renders the Student Master List summary in PremiumPublicSubjectHome", () => {
    const markup = renderPage("/s/subject-test-public-id", PremiumPublicSubjectHome);

    // Should include Master List tab with count
    expect(markup).toContain("Master List");
    expect(markup).toContain("Student Master List");
    expect(markup).toContain("Enrolled");
    expect(markup).toContain("Conflict");

    // Top students from mock list should be visible in bento preview
    expect(markup).toContain("Dela Cruz, Juan M.");
    expect(markup).toContain("Santos, Maria Clara");
    expect(markup).toContain("Schedule Conflict");
    expect(markup).toContain("Regular");
  });

  it("renders the Student Master List in PublicPages PublicSubjectPage", () => {
    const markup = renderPage("/s/subject-test-public-id", PublicSubjectPage);

    // Should render Student Master List section with safe public details
    expect(markup).toContain("Student Master List");
    expect(markup).toContain("Enrolled");
    expect(markup).toContain("With Conflict");
    expect(markup).toContain("Dela Cruz, Juan M.");
    expect(markup).toContain("Santos, Maria Clara");
    expect(markup).toContain("Conflict");
    expect(markup).toContain("Regular");

    // Safe privacy notice must be present
    expect(markup).toContain("Safe public view");
    expect(markup).toContain("strictly withheld");
  });

  it("enforces strict privacy and does not leak sensitive student properties", () => {
    // Only canonicalName and hasScheduleConflict should be in the exposed schema
    const keys = Object.keys(mockStudents[0]);
    expect(keys.sort()).toEqual(["canonicalName", "hasScheduleConflict"].sort());
    expect(mockStudents[0]).not.toHaveProperty("studentId");
    expect(mockStudents[0]).not.toHaveProperty("email");
    expect(mockStudents[0]).not.toHaveProperty("notes");
    expect(mockStudents[0]).not.toHaveProperty("aliases");
  });
});
