import { describe, expect, it, vi } from "vitest";
import { handleAppwriteClientProcedure } from "../client/src/lib/appwriteAdapter";

describe("Appwrite Client Adapter Integrity", () => {
  it("provides foundation.owner.getOverviewMetrics with all 4 KPIs and attention items", async () => {
    const metrics = await handleAppwriteClientProcedure("foundation.owner.getOverviewMetrics", undefined);
    expect(metrics).toBeDefined();
    expect(typeof metrics.activeSubjects).toBe("number");
    expect(typeof metrics.sharedSubjects).toBe("number");
    expect(typeof metrics.enrolledStudents).toBe("number");
    expect(typeof metrics.totalSessions).toBe("number");
    expect(typeof metrics.attendanceRate).toBe("number");
    expect(typeof metrics.pendingReviewsCount).toBe("number");
    expect(typeof metrics.publishedReports).toBe("number");
    expect(Array.isArray(metrics.attentionItems)).toBe(true);
  });

  it("handles foundation.owner.getContext cleanly", async () => {
    const ctx = await handleAppwriteClientProcedure("foundation.owner.getContext", undefined);
    expect(ctx.mode).toBe("secretary");
    expect(ctx.user).toBeDefined();
  });

  it("handles foundation.owner.improveText cleanly", async () => {
    const res = await handleAppwriteClientProcedure("foundation.owner.improveText", { text: "Please be on time." });
    expect(res.improvedText).toBe("Please be on time.");
  });

  it("handles media asset upload mock in client adapter", async () => {
    const asset = await handleAppwriteClientProcedure("foundation.media.upload", {
      fileName: "syllabus.pdf",
      mimeType: "application/pdf",
      base64Data: "data:application/pdf;base64,JVBERi0xLjQK",
      altText: "Course Syllabus",
    });
    expect(asset.originalName).toBe("syllabus.pdf");
    expect(asset.mimeType).toBe("application/pdf");
    expect(asset.url).toBeDefined();
  });

  it("handles string document IDs and numeric IDs without NaN errors", async () => {
    const bulkReview = await handleAppwriteClientProcedure("subjects.students.reviewBulkImport", {
      sourceText: "Dela Cruz, Juan, Manuel\nSantos, Maria, Clara",
    });
    expect(bulkReview.candidates).toHaveLength(2);
    expect(bulkReview.candidates[0].lastName).toBe("Dela Cruz");
  });

  it("handles content lists with empty, NaN, or string subject IDs safely", async () => {
    const announcements = await handleAppwriteClientProcedure("content.announcements.list", { subjectId: "NaN" });
    expect(announcements).toEqual([]);

    const resources = await handleAppwriteClientProcedure("content.resources.list", { subjectId: "" });
    expect(resources).toEqual([]);

    const questions = await handleAppwriteClientProcedure("content.questions.list", { subjectId: "0" });
    expect(questions).toEqual([]);
  });

  it("handles foundation.publicHistory gracefully", async () => {
    const res = await handleAppwriteClientProcedure("foundation.publicHistory", { kind: "announcement", publicId: "test-id" });
    expect(res).toBeDefined();
    expect(res.available).toBe(true);
    expect(Array.isArray(res.history)).toBe(true);
  });

  it("customTrpcFetch serializes errors in SuperJSON format so client deserialize succeeds", async () => {
    const adapterModule = await import("../client/src/lib/appwriteAdapter");
    const { customTrpcFetch } = await import("../client/src/lib/trpcFetch");
    const superjson = (await import("superjson")).default;

    const spy = vi.spyOn(adapterModule, "handleAppwriteClientProcedure").mockRejectedValueOnce(new Error("Simulated Appwrite failure"));

    const res = await customTrpcFetch("https://supersec.example/api/trpc/testFailureProcedure");
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.json).toBeDefined();
    expect(body.error.json.message).toBe("Simulated Appwrite failure");

    // Verify SuperJSON can deserialize the error and tRPC client requirements are met
    const deserialized: any = superjson.deserialize(body.error);
    expect(deserialized).toBeDefined();
    expect(typeof deserialized.code).toBe("number");
    expect(deserialized.code).toBe(-32603);
    expect(deserialized.message).toBe("Simulated Appwrite failure");

    spy.mockRestore();
  });
});
