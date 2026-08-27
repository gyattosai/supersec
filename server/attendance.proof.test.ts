import { describe, expect, it } from "vitest";
import { acceptProofReview, proofSubmissionState } from "./routers/attendanceProof";

describe("public attendance proof review", () => {
  it("accepts only an AI-approved match that belongs to the session roster", () => {
    expect(acceptProofReview({ verdict: "accepted", membershipId: 14 }, [14, 28])).toBe(14);
  });

  it("keeps uncertain, missing, and out-of-roster matches in secretary review", () => {
    const uncertainMatch = acceptProofReview({ verdict: "needs_review", membershipId: 14 }, [14, 28]);

    expect(uncertainMatch).toBeNull();
    expect(proofSubmissionState(uncertainMatch)).toEqual({ reviewState: "needs_review", reviewSummary: "The proof was saved for the secretary to review." });
    expect(acceptProofReview({ verdict: "accepted", membershipId: null }, [14, 28])).toBeNull();
    expect(acceptProofReview({ verdict: "accepted", membershipId: 99 }, [14, 28])).toBeNull();
  });
});
