import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { protectedProcedure } from "../_core/trpc";

/** The first release has one secretary: the Manus project owner. */
export const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the class secretary can manage this workspace." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
