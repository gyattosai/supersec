import { describe, expect, it } from "vitest";
import { prefetchForPath } from "../client/src/ssr/prefetch";
import { formatSocialTitle, formatSocialDescription, formatShorthandDate } from "../shared/socialTitle";
import { QueryClient } from "@tanstack/react-query";

describe("SEO & OpenGraph Metadata Prefetching with Dynamic Shorthand Titles", () => {
  const mockCaller: any = {
    publicSubject: async (publicId: string) => ({
      available: true,
      subject: {
        id: 1,
        publicId,
        name: "Software Engineering",
        code: "CS-401",
        professorName: "Grace Hopper",
        meetingDays: [],
        latest: { attendance: [], announcements: [], resources: [], questions: [] },
      },
    }),
    publicAttendance: async (publicId: string) => ({
      available: true,
      attendance: {
        id: 1,
        publicId,
        version: 2,
        startsAt: "2026-09-01T10:00:00Z",
        subject: { id: 1, name: "Software Engineering", code: "CS-401" },
        records: [
          { status: "PRESENT" },
          { status: "PRESENT" },
          { status: "ABSENT" },
        ],
      },
    }),
    publicItem: async ({ kind, publicId }: any) => ({
      available: true,
      item: {
        id: 1,
        publicId,
        kind,
        title: "Sprint 1 Deliverables & Rubric",
        body: "Detailed guidelines on project architecture and deliverables.",
        version: 1,
        publishedAt: "2026-09-01T12:00:00Z",
        subject: { id: 1, name: "Software Engineering", code: "CS-401" },
      },
    }),
    publicReport: async (publicId: string) => ({
      available: true,
      report: {
        id: 1,
        publicId,
        title: "Mid-Term Attendance Summary",
        startsAt: "2026-09-01T10:00:00Z",
        version: 1,
      },
    }),
  };

  it("formats Page Type + Shorthand Date/Number - Version correctly", () => {
    expect(
      formatSocialTitle({
        type: "Attendance",
        numberOrDate: "Sep 1",
        version: 2,
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Attendance Sep 1 - v2");

    expect(
      formatSocialTitle({
        type: "Announcement",
        numberOrDate: "Sep 1",
        version: 1,
      })
    ).toBe("Announcement Sep 1 - v1");

    expect(
      formatSocialTitle({
        type: "Resource",
        numberOrDate: "Sep 1",
        version: 3,
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Resource Sep 1 - v3");

    expect(
      formatSocialTitle({
        type: "Q&A",
        numberOrDate: "#1",
        version: 1,
      })
    ).toBe("Q&A #1 - v1");

    expect(
      formatSocialTitle({
        type: "Subject",
        numberOrDate: "CS-401",
        version: 1,
      })
    ).toBe("Subject CS-401 - v1");
  });

  it("formats rich human-readable titles when contentTitle is provided", () => {
    expect(
      formatSocialTitle({
        type: "Announcement",
        contentTitle: "Sprint 1 Deliverables & Rubric",
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Announcement: Sprint 1 Deliverables & Rubric");

    expect(
      formatSocialTitle({
        type: "Resource",
        contentTitle: "Midterm Study Guide & Cheatsheet",
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Resource: Midterm Study Guide & Cheatsheet");

    expect(
      formatSocialTitle({
        type: "Q&A",
        contentTitle: "How to submit GitHub pull requests?",
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Q&A: How to submit GitHub pull requests?");

    expect(
      formatSocialTitle({
        type: "Q&A",
        contentTitle: "Knowledgebase",
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Q&A Knowledgebase · Verified Class FAQs");

    expect(
      formatSocialTitle({
        type: "Subject",
        contentTitle: "Software Engineering",
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Software Engineering · Student Portal");

    expect(
      formatSocialTitle({
        type: "Proof",
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Submit Zoom Attendance Proof · Instant AI Verification");

    expect(
      formatSocialTitle({
        type: "Excuse",
        subjectCode: "CS-401",
      })
    ).toBe("[CS-401] Submit Absence Excuse Letter · Secretary Desk");
  });

  it("formats tailored descriptions based on page type", () => {
    // Subject Portal
    const subDesc = formatSocialDescription({
      type: "subject",
      subjectCode: "CS-401",
      subjectName: "Software Engineering",
      professorName: "Grace Hopper",
    });
    expect(subDesc).toContain("Official student portal for CS-401 (Software Engineering) with Professor Grace Hopper");
    expect(subDesc).toContain("Real-time roll call");

    // Attendance with conflict counts
    const attDesc = formatSocialDescription({
      type: "attendance",
      subjectCode: "CS-401",
      subjectName: "Software Engineering",
      date: "2026-09-01T10:00:00Z",
      totals: { present: 25, absent: 3, excused: 2, conflict: 1 },
    });
    expect(attDesc).toContain("Class Attendance for CS-401 (Software Engineering)");
    expect(attDesc).toContain("Present: 25");
    expect(attDesc).toContain("Absent: 3");
    expect(attDesc).toContain("Excused: 2");
    expect(attDesc).toContain("Conflict: 1");

    // Announcement with markdown stripped
    const annDesc = formatSocialDescription({
      type: "announcement",
      subjectCode: "CS-401",
      contentTitle: "Important Notice",
      contentBody: "# Sprint 1 Deadline\nPlease submit your **final work** to [the portal](https://supersec.example.com).",
    });
    expect(annDesc).toContain('Official announcement for CS-401: "Sprint 1 Deadline Please submit your final work to the portal."');

    // Proof submission
    const proofDesc = formatSocialDescription({
      type: "proof",
      subjectCode: "CS-401",
      subjectName: "Software Engineering",
    });
    expect(proofDesc).toContain("Submit your Zoom meeting participant screenshot for CS-401 (Software Engineering)");
    expect(proofDesc).toContain("Instant automated AI verification");

    // Excuse submission
    const excuseDesc = formatSocialDescription({
      type: "excuse",
      subjectCode: "CS-401",
      subjectName: "Software Engineering",
    });
    expect(excuseDesc).toContain("Submit official absence excuse letter and supporting medical or event documents for CS-401 (Software Engineering)");
  });

  it("prefetches complete metadata and JSON-LD schema for subject portal", async () => {
    const qc = new QueryClient();
    const meta = await prefetchForPath("/s/cs401-portal", qc, mockCaller);

    expect(meta.title).toBe("Subject CS-401 - v1");
    expect(meta.description).toContain("Professor Grace Hopper");
    expect(meta.ogImage).toContain("type=subject");
    expect(meta.jsonLd?.["@type"]).toBe("Course");
    expect(meta.jsonLd?.courseCode).toBe("CS-401");
  });

  it("prefetches live metrics and EducationEvent schema for attendance", async () => {
    const qc = new QueryClient();
    const meta = await prefetchForPath("/attendance/att-session-1", qc, mockCaller);

    expect(meta.title).toBe("[CS-401] Attendance Sep 1 - v2");
    expect(meta.description).toContain("Present: 2");
    expect(meta.description).toContain("Absent: 1");
    expect(meta.ogImage).toContain("present=2");
    expect(meta.ogImage).toContain("absent=1");
    expect(meta.jsonLd?.["@type"]).toBe("EducationEvent");
  });

  it("prefetches article schema and post title for announcements and resources", async () => {
    const qc = new QueryClient();
    const meta = await prefetchForPath("/a/sprint1-announcement", qc, mockCaller);

    expect(meta.title).toBe("[CS-401] Announcement Sep 1 - v1");
    expect(meta.ogType).toBe("article");
    expect(meta.jsonLd?.["@type"]).toBe("Article");
  });

  it("prefetches FAQPage schema for Subject Q&A route", async () => {
    const qc = new QueryClient();
    const meta = await prefetchForPath("/s/cs401-portal/questions", qc, mockCaller);

    expect(meta.title).toBe("[CS-401] Q&A Knowledgebase - v1");
    expect(meta.jsonLd?.["@type"]).toBe("FAQPage");
  });

  it("prefetches dedicated LearningResource schema for resource route", async () => {
    const qc = new QueryClient();
    const meta = await prefetchForPath("/r/sprint1-resource", qc, mockCaller);

    expect(meta.title).toBe("[CS-401] Resource Sep 1 - v1");
    expect(meta.ogType).toBe("article");
  });

  it("prefetches dedicated Q&A schema for question route", async () => {
    const qc = new QueryClient();
    const meta = await prefetchForPath("/q/sprint1-question", qc, mockCaller);

    expect(meta.title).toBe("[CS-401] Q&A Sep 1 - v1");
    expect(meta.ogType).toBe("article");
  });
});
