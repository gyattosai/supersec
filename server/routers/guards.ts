import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { protectedProcedure } from "../_core/trpc";

/** The first release has one secretary: the Manus project owner. */
export function isWorkspaceOwner(user: { openId: string }) {
  const configuredOwnerOpenId = ENV.ownerOpenId.trim();
  return configuredOwnerOpenId.length > 0 && user.openId.trim() === configuredOwnerOpenId;
}

export const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!isWorkspaceOwner(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the class secretary can manage this workspace." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
