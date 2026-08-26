import { describe, expect, it } from "vitest";
import { attendanceDefaultForMembership, normalizeZoomDisplayName, normalizeZoomParticipantName, parseParticipantLines } from "./routers/attendance";

describe("Attendance defaults", () => {
  it("keeps the three official status values and defaults a conflict-designated Student to PRESENT", () => {
    expect(attendanceDefaultForMembership(true)).toEqual({ attendanceStatus: "PRESENT", hasScheduleConflict: true });
    expect(attendanceDefaultForMembership(false)).toEqual({ attendanceStatus: "NOT_SET", hasScheduleConflict: false });
  });
});

describe("Zoom participant parsing", () => {
  it("preserves each newline-separated comma-based participant name", () => {
    expect(parseParticipantLines("Participants\nBSIT_DELA CRUZ, Juan M.\nBSIT_SANTOS, Ana")).toEqual(["BSIT_DELA CRUZ, Juan M.", "BSIT_SANTOS, Ana"]);
  });

  it("removes only blank lines and the participant heading", () => {
    expect(parseParticipantLines("\nParticipants\r\n\r\nBSIT_REYES, Maria\r\n")).toEqual(["BSIT_REYES, Maria"]);
  });

  it("removes a common Zoom participant-count heading without splitting any comma-based names", () => {
    expect(parseParticipantLines("Participants (2)\nBSIT_DELA CRUZ, Juan M.\nBSIT_SANTOS, Ana")).toEqual(["BSIT_DELA CRUZ, Juan M.", "BSIT_SANTOS, Ana"]);
  });
});

describe("Zoom display-name cleanup", () => {
  it("normalizes spacing, casing, and comma placement into the required display candidate", () => {
    expect(normalizeZoomDisplayName("  bsit_reyes  ,   maria  l. ")).toBe("BSIT_REYES, MARIA L.");
  });
});

describe("structured Zoom-name normalization", () => {
  it("keeps an already canonical name as a confident required-format candidate", () => {
    expect(normalizeZoomParticipantName("BSIT_REYES, MARIA L.")).toMatchObject({ sourceName: "BSIT_REYES, MARIA L.", normalizedCandidate: "BSIT_REYES, MARIA L.", normalizationState: "canonical", flags: [], reviewNote: null });
  });

  it("normalizes confidently delimited casing and whitespace without inventing a name", () => {
    expect(normalizeZoomParticipantName("  bsit_dela cruz , juan m. ")).toMatchObject({ normalizedCandidate: "BSIT_DELA CRUZ, JUAN M.", normalizationState: "normalized", flags: [], reviewNote: null });
  });

  it("reorders only when the section and surname segment is explicit after one comma", () => {
    expect(normalizeZoomParticipantName("Juan M., BSIT_DELA CRUZ")).toMatchObject({ normalizedCandidate: "BSIT_DELA CRUZ, JUAN M.", normalizationState: "normalized", flags: ["reordered"] });
  });

  it("converts an explicit non-comma separator without guessing a whitespace-only boundary", () => {
    expect(normalizeZoomParticipantName("BSIT_DELA CRUZ - Juan M.")).toMatchObject({ normalizedCandidate: "BSIT_DELA CRUZ, JUAN M.", normalizationState: "normalized", flags: ["missing_comma"] });
  });

  it("flags a sectionless name instead of inventing a section or surname order", () => {
    expect(normalizeZoomParticipantName("Juan M., Dela Cruz")).toMatchObject({ normalizedCandidate: null, normalizationState: "review_required", flags: ["missing_section"] });
  });

  it("flags a comma-less name for secretary review instead of guessing the boundary", () => {
    expect(normalizeZoomParticipantName("BSIT_DELA CRUZ JUAN M.")).toMatchObject({ normalizedCandidate: null, normalizationState: "review_required", flags: ["missing_comma"] });
  });

  it("flags multiple comma boundaries as structurally uncertain", () => {
    expect(normalizeZoomParticipantName("BSIT_DELA CRUZ, JUAN, M.")).toMatchObject({ normalizedCandidate: null, normalizationState: "review_required", flags: ["ambiguous_delimiters"] });
  });
});
