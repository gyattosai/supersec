import { describe, expect, it } from "vitest";
import { parseBulkStudentNames } from "./routers/subjects";

describe("bulk Student intake", () => {
  it("normalizes each newline-separated name and removes duplicate values", () => {
    expect(parseBulkStudentNames("  BSIT_REYES, Maria  \nBSIT_SANTOS, Ana\nbsit_reyes, maria\n")).toEqual({
      names: ["BSIT_REYES, Maria", "BSIT_SANTOS, Ana"],
      skipped: 1,
    });
  });

  it("skips empty and invalid short lines without creating a placeholder Student", () => {
    expect(parseBulkStudentNames("\nAl\nBSIT_CRUZ, Juan\n")).toEqual({
      names: ["BSIT_CRUZ, Juan"],
      skipped: 1,
    });
  });
});
