import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocked = vi.hoisted(() => {
  const insertedProofs: Array<Record<string, unknown>> = [];
  const update = vi.fn();
  const database = {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: vi.fn((values: Record<string, unknown>) => {
      insertedProofs.push(values);
      return { $returningId: vi.fn().mockResolvedValue([{ id: 71 }]) };
    }) })),
    update,
  };
  return { database, getDb: vi.fn(async () => database), insertedProofs, storagePut: vi.fn(async () => ({ key: "attendance-proofs/9/proof.png", url: "/manus-storage/attendance-proofs/9/proof.png" })), storageGetSignedUrl: vi.fn(async () => "https://signed.example/proof.png"), invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ verdict: "needs_review", membershipId: 41 }) } }] })) };
});

vi.mock("./db", () => ({ getDb: mocked.getDb }));
vi.mock("./storage", () => ({ storagePut: mocked.storagePut, storageGetSignedUrl: mocked.storageGetSignedUrl }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocked.invokeLLM }));

import { attendanceProofRouter } from "./routers/attendanceProof";

function publicContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("public attendance proof submission", () => {
  it("stores an uncertain AI decision for private review without updating Attendance", async () => {
    let selectCount = 0;
    mocked.database.select.mockImplementation(() => {
      selectCount += 1;
      const call = selectCount;
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(async () => call === 1 ? [{ id: 9, subjectId: 4, ownerId: 1, subjectName: "Operations Management", subjectCode: "OLCBTQM01", startsAt: new Date("2026-08-24T08:00:00Z") }] : []),
        orderBy: vi.fn(async () => call === 2 ? [{ membershipId: 41, canonicalName: "SECTION_CRUZ, SAM A" }] : []),
      };
      return chain;
    });

    const caller = attendanceProofRouter.createCaller(publicContext());
    const result = await caller.submit({ publicId: "session-public-id", submittedName: "Sam Cruz", fileName: "zoom-proof.png", mimeType: "image/png", base64Data: "data:image/png;base64,cHJvb2Y=" });

    expect(result).toEqual({ submissionId: 71, outcome: "needs_review" });
    expect(mocked.insertedProofs).toContainEqual(expect.objectContaining({ classSessionId: 9, reviewState: "needs_review", matchedSubjectStudentId: null, reviewSummary: "The proof was saved for the secretary to review." }));
    expect(mocked.database.update).not.toHaveBeenCalled();
  });

  it("does not expose the private owner-review list to a public caller", async () => {
    const caller = attendanceProofRouter.createCaller(publicContext());
    await expect(caller.listForSession({ sessionId: 9 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
