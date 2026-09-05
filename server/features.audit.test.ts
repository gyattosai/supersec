import { describe, expect, it } from "vitest";
import { parseStudentImportText, studentDisplayName, studentNameKey } from "./routers/subjects";
import { normalizeZoomParticipantName, attendanceDefaultForMembership } from "./routers/attendance";
import { sortStudents, sortAttendance, type StudentSortMode, type AttendanceSortMode } from "../shared/attendanceSorting";
import { formatTimeRange12Hour, formatDateTime12Hour } from "../client/src/lib/time";
import { isSupportedResourceFileMimeType, isPublicImageMimeType, MAX_PUBLIC_UPLOAD_BYTES } from "../shared/mediaPolicy";

describe("Feature Audit: 1. Subjects and Meeting Days", () => {
  it("meets 12-hour rhythm formatting requirements", () => {
    expect(formatTimeRange12Hour("07:30", "09:00")).toBe(" · 7:30 AM – 9:00 AM");
    expect(formatTimeRange12Hour("13:00", "16:30")).toBe(" · 1:00 PM – 4:30 PM");
    expect(formatTimeRange12Hour("12:00", "13:00")).toBe(" · 12:00 PM – 1:00 PM");
    expect(formatTimeRange12Hour("00:00", "01:30")).toBe(" · 12:00 AM – 1:30 AM");
    expect(formatTimeRange12Hour(null, null)).toBe("");
  });

  it("formats date-times into 12-hour format", () => {
    const d = new Date(2026, 7, 30, 14, 45);
    const formatted = formatDateTime12Hour(d);
    expect(formatted).toContain("2026");
    expect(formatted).toContain("2:45 PM");
  });
});

describe("Feature Audit: 2. Students and Master List Intake", () => {
  it("parses CSV, strips section code prefixes, and structures names", () => {
    const csv = "CS101_Dela Cruz, Juan, Manuel\nCS101_Santos, Maria, Clara\nIT202_Reyes, Pedro Jose, Bautista";
    const parsed = parseStudentImportText(csv);
    expect(parsed.candidates).toHaveLength(3);
    expect(parsed.candidates[0]).toEqual({ lastName: "Dela Cruz", firstName: "Juan", middleName: "Manuel" });
    expect(parsed.candidates[1]).toEqual({ lastName: "Santos", firstName: "Maria", middleName: "Clara" });
    expect(parsed.candidates[2]).toEqual({ lastName: "Reyes", firstName: "Pedro", middleName: "Bautista" });
    expect(parsed.skipped).toBe(0);
  });

  it("deduplicates identical students case-insensitively", () => {
    const input = "DELA CRUZ, JUAN, M.\ndela cruz, juan, m.\nSantos, Maria, A.";
    const parsed = parseStudentImportText(input);
    expect(parsed.candidates).toHaveLength(2);
    expect(parsed.skipped).toBe(1);
  });

  it("sorts students across all 4 sort modes", () => {
    const roster = [
      { canonicalName: "Santos, Maria", firstName: "Maria", lastName: "Santos", hasScheduleConflict: false, privateNotes: "Scholar" },
      { canonicalName: "Abad, Antonio", firstName: "Antonio", lastName: "Abad", hasScheduleConflict: true, privateNotes: null },
      { canonicalName: "Cruz, Bernardo", firstName: "Bernardo", lastName: "Cruz", hasScheduleConflict: false, privateNotes: null },
    ];
    const byLastName = sortStudents(roster, "last-name");
    expect(byLastName.map(s => s.lastName)).toEqual(["Abad", "Cruz", "Santos"]);
    const byConflict = sortStudents(roster, "conflict");
    expect(byConflict[0].hasScheduleConflict).toBe(true);
  });
});

describe("Feature Audit: 3. Attendance and Zoom / Excuses", () => {
  it("defaults schedule conflict students to PRESENT while others default to NOT_SET", () => {
    expect(attendanceDefaultForMembership(true)).toEqual({ attendanceStatus: "PRESENT", hasScheduleConflict: true });
    expect(attendanceDefaultForMembership(false)).toEqual({ attendanceStatus: "NOT_SET", hasScheduleConflict: false });
  });

  it("normalizes Zoom display names", () => {
    const zoom1 = normalizeZoomParticipantName("CS101_DELA CRUZ, JUAN M.");
    expect(zoom1.normalizationState).toBe("canonical");
    expect(zoom1.normalizedCandidate).toBe("CS101_DELA CRUZ, JUAN M.");
  });

  it("sorts attendance records by status priority", () => {
    const records = [
      { canonicalName: "Santos, Maria", status: "NOT_SET" as const, hasScheduleConflict: false },
      { canonicalName: "Abad, Antonio", status: "PRESENT" as const, hasScheduleConflict: true },
      { canonicalName: "Cruz, Bernardo", status: "ABSENT" as const, hasScheduleConflict: false },
    ];
    const byStatus = sortAttendance(records, "status");
    expect(byStatus.map(r => r.status)).toEqual(["NOT_SET", "ABSENT", "PRESENT"]);
  });
});

describe("Feature Audit: 4, 5, 6. Announcements, Resources and QA Policies", () => {
  it("enforces upload mime types and 8 MB limit", () => {
    expect(isPublicImageMimeType("image/jpeg")).toBe(true);
    expect(isPublicImageMimeType("image/png")).toBe(true);
    expect(isSupportedResourceFileMimeType("application/pdf")).toBe(true);
    expect(MAX_PUBLIC_UPLOAD_BYTES).toBe(8_000_000);
  });
});

describe("Feature Audit: 7. Public Subject Search, Categorization, and Multi-Criteria Sorting", () => {
  const sampleItems = [
    {
      id: "a-1",
      kind: "announcements" as const,
      title: "Midterm Exam Guidelines",
      date: new Date("2026-03-10T10:00:00Z"),
      dateFormatted: "Mar 10, 2026",
      snippet: "Please review the coverage for chapters 1 to 4 before Monday.",
      badge: "Announcement",
      badgeTone: "amber" as const,
      href: "/a/midterm-guide",
      actionLabel: "Read announcement",
      meta: { tags: ["exam", "guidelines"] },
    },
    {
      id: "r-1",
      kind: "resources" as const,
      title: "Algorithms Lecture Slides PDF",
      date: new Date("2026-03-01T08:00:00Z"),
      dateFormatted: "Mar 1, 2026",
      snippet: "Week 1 slide deck covering asymptotic analysis.",
      badge: "Resource",
      badgeTone: "sky" as const,
      href: "/r/algos-pdf",
      actionLabel: "View resource",
      meta: { category: "Lecture", resourceType: "file", tags: ["slides", "algorithms"] },
    },
    {
      id: "q-1",
      kind: "questions" as const,
      title: "How to submit late assignments?",
      date: new Date("2026-03-12T14:00:00Z"),
      dateFormatted: "Mar 12, 2026",
      snippet: "Late submissions require a valid excuse slip from the department.",
      badge: "Q&A",
      badgeTone: "purple" as const,
      href: "/q/late-submission",
      actionLabel: "View answer",
      meta: { isOfficial: true, tags: ["policies"] },
    },
    {
      id: "att-1",
      kind: "attendance" as const,
      title: "Class Session · Mar 15, 2026",
      date: new Date("2026-03-15T09:00:00Z"),
      dateFormatted: "Mar 15, 2026",
      snippet: "Regular classroom meeting attendance sheet.",
      badge: "Active",
      badgeTone: "emerald" as const,
      href: "/attendance/mar-15",
      actionLabel: "View session",
      meta: { sessionState: "ACTIVE" },
    },
  ];

  it("filters items by active category tab", async () => {
    const { filterAndSortItems } = await import("../client/src/pages/PremiumPublicSubjectHome");
    const all = filterAndSortItems(sampleItems, { activeCategory: "all" });
    expect(all).toHaveLength(4);

    const announcements = filterAndSortItems(sampleItems, { activeCategory: "announcements" });
    expect(announcements).toHaveLength(1);
    expect(announcements[0].id).toBe("a-1");

    const resources = filterAndSortItems(sampleItems, { activeCategory: "resources" });
    expect(resources).toHaveLength(1);
    expect(resources[0].id).toBe("r-1");

    const questions = filterAndSortItems(sampleItems, { activeCategory: "questions" });
    expect(questions).toHaveLength(1);
    expect(questions[0].id).toBe("q-1");

    const attendance = filterAndSortItems(sampleItems, { activeCategory: "attendance" });
    expect(attendance).toHaveLength(1);
    expect(attendance[0].id).toBe("att-1");
  });

  it("searches across title, snippet body, and tags case-insensitively", async () => {
    const { filterAndSortItems } = await import("../client/src/pages/PremiumPublicSubjectHome");
    // Search by title keyword
    const byTitle = filterAndSortItems(sampleItems, { searchQuery: "midterm" });
    expect(byTitle).toHaveLength(1);
    expect(byTitle[0].id).toBe("a-1");

    // Search by snippet keyword
    const bySnippet = filterAndSortItems(sampleItems, { searchQuery: "asymptotic" });
    expect(bySnippet).toHaveLength(1);
    expect(bySnippet[0].id).toBe("r-1");

    // Search by tag
    const byTag = filterAndSortItems(sampleItems, { searchQuery: "policies" });
    expect(byTag).toHaveLength(1);
    expect(byTag[0].id).toBe("q-1");

    // Search with non-matching query returns empty array
    const noMatch = filterAndSortItems(sampleItems, { searchQuery: "nonexistent term" });
    expect(noMatch).toHaveLength(0);
  });

  it("sorts items by newest, oldest, title ascending, and title descending", async () => {
    const { filterAndSortItems } = await import("../client/src/pages/PremiumPublicSubjectHome");

    const newest = filterAndSortItems(sampleItems, { sortBy: "newest" });
    expect(newest.map(i => i.id)).toEqual(["att-1", "q-1", "a-1", "r-1"]);

    const oldest = filterAndSortItems(sampleItems, { sortBy: "oldest" });
    expect(oldest.map(i => i.id)).toEqual(["r-1", "a-1", "q-1", "att-1"]);

    const titleAsc = filterAndSortItems(sampleItems, { sortBy: "title_asc" });
    expect(titleAsc.map(i => i.id)).toEqual(["r-1", "att-1", "q-1", "a-1"]); // Algorithms, Class Session, How to, Midterm

    const titleDesc = filterAndSortItems(sampleItems, { sortBy: "title_desc" });
    expect(titleDesc.map(i => i.id)).toEqual(["a-1", "q-1", "att-1", "r-1"]);
  });

  it("combines category filtering, keyword search, and sorting", async () => {
    const { filterAndSortItems } = await import("../client/src/pages/PremiumPublicSubjectHome");
    const combined = filterAndSortItems(sampleItems, {
      activeCategory: "announcements",
      searchQuery: "exam",
      sortBy: "title_asc",
    });
    expect(combined).toHaveLength(1);
    expect(combined[0].title).toBe("Midterm Exam Guidelines");

    // If category does not match even if search term matches
    const mismatch = filterAndSortItems(sampleItems, {
      activeCategory: "questions",
      searchQuery: "exam",
      sortBy: "newest",
    });
    expect(mismatch).toHaveLength(0);
  });
});

