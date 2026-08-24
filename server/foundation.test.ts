import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { ENV } from "./_core/env";
import type { TrpcContext } from "./_core/context";

function contextFor(openId: string): TrpcContext {
  return {
    user: {
      id: 1,
      openId,
      name: "Class Secretary",
      email: "secretary@example.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("Milestone 2 foundation access", () => {
  it("rejects a signed-in non-owner from secretary procedures", async () => {
    const caller = appRouter.createCaller(contextFor("not-the-project-owner"));
    await expect(caller.foundation.owner.getContext()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the project owner into the secretary context", async () => {
    const caller = appRouter.createCaller(contextFor(ENV.ownerOpenId));
    await expect(caller.foundation.owner.getContext()).resolves.toMatchObject({ mode: "secretary" });
  });

  it("returns a safe unavailable state for unimplemented public item pages", async () => {
    const caller = appRouter.createCaller(contextFor("public-caller"));
    await expect(caller.foundation.publicItem({ kind: "resource", publicId: "not-a-real-public-id" })).resolves.toEqual({ available: false });
  });
});
