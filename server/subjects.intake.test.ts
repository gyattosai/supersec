import { describe, expect, it } from "vitest";
import { parseBulkStudentNames, parseStudentImportText } from "./routers/subjects";

describe("bulk Student intake", () => {
  it("normalizes each newline-separated name and removes duplicate values", () => {
    expect(parseBulkStudentNames("  BSIT_REYES, Maria  \nBSIT_SANTOS, Ana\nbsit_reyes, maria\n")).toEqual({
      names: ["REYES, Maria", "SANTOS, Ana"],
      skipped: 1,
    });
  });

  it("skips empty and invalid short lines without creating a placeholder Student", () => {
    expect(parseBulkStudentNames("\nAl\nBSIT_CRUZ, Juan\n")).toEqual({
      names: ["CRUZ, Juan"],
      skipped: 1,
    });
  });

  it("reads copied Google Sheets or CSV header columns into sortable first, middle, and last name fields", () => {
    expect(parseStudentImportText("Last Name,First Name,Middle Name\nDominguez,Howard,\nBalubar,Matthew,Johannes C.")).toEqual({
      candidates: [
        { lastName: "Dominguez", firstName: "Howard", middleName: "" },
        { lastName: "Balubar", firstName: "Matthew", middleName: "Johannes C." },
      ],
      skipped: 0,
      sourceRows: 3,
    });
  });

  it("removes a section prefix only from the new sortable last-name field", () => {
    expect(parseStudentImportText("BSIT_DELA CRUZ, Juan M.")).toEqual({
      candidates: [{ lastName: "DELA CRUZ", firstName: "Juan", middleName: "M." }],
      skipped: 0,
      sourceRows: 1,
    });
  });
});
