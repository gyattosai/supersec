import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { protectedProcedure } from "../_core/trpc";

/** The first release has one secretary: the Manus project owner. */
export function isWorkspaceOwner(user: { openId: string; role: "user" | "admin" } | null | undefined) {
  if (!user) return false;
  const configuredOwnerOpenId = ENV.ownerOpenId.trim();
  return user.role === "admin" || (configuredOwnerOpenId.length > 0 && user.openId.trim() === configuredOwnerOpenId);
}

export const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!isWorkspaceOwner(ctx.user)) {
    console.warn("[Auth] Workspace owner guard rejected", {
      configuredOwnerPresent: ENV.ownerOpenId.trim().length > 0,
      configuredOwnerLength: ENV.ownerOpenId.trim().length,
      sessionOpenIdLength: ctx.user.openId.trim().length,
      normalizedOpenIdMatch: ctx.user.openId.trim() === ENV.ownerOpenId.trim(),
      role: ctx.user.role,
    });
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the class secretary can manage this workspace." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
