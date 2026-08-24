import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ownerProcedure } from "./routers/guards";
import { subjectsRouter } from "./routers/subjects";
import { attendanceRouter } from "./routers/attendance";
import { contentRouter } from "./routers/content";
import { reportsRouter } from "./routers/reports";
import { storagePut } from "./storage";

const publicIdInput = z.object({ publicId: z.string().min(8).max(24) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  foundation: router({
    owner: router({
      getContext: ownerProcedure.query(({ ctx }) => ({
        mode: "secretary" as const,
        name: ctx.user.name ?? "Class secretary",
        email: ctx.user.email ?? null,
      })),
    }),
    publicSubject: publicProcedure.input(publicIdInput).query(async ({ input }) => {
      const subject = await db.getPublicSubjectById(input.publicId);
      return subject ? { available: true as const, subject } : { available: false as const };
    }),
    /** Reserved safe response shape for later public Announcement, Resource, Question & Answer, Attendance, and Report pages. */
    publicItem: publicProcedure
      .input(z.object({ kind: z.enum(["announcement", "resource", "question", "attendance", "report"]), publicId: z.string().min(8).max(24) }))
      .query(async ({ input }) => {
        if (input.kind === "attendance" || input.kind === "report") return { available: false as const };
        const item = await db.getPublicContentItem(input.kind, input.publicId);
        return item ? { available: true as const, item } : { available: false as const };
      }),
    history: publicProcedure
      .input(z.object({ entityType: z.string().min(1).max(48), entityId: z.number().int().positive() }))
      .query(async ({ input }) => db.getPublicHistory(input.entityType, input.entityId)),
    media: router({
      upload: ownerProcedure
        .input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(128), base64Data: z.string().min(1).max(12_000_000), altText: z.string().max(280).nullable().optional(), publicUse: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
          const bytes = Buffer.from(input.base64Data.replace(/^data:[^;]+;base64,/, ""), "base64");
          if (!bytes.length || bytes.length > 8_000_000) throw new Error("Upload must be between 1 byte and 8 MB");
          const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
          const stored = await storagePut(`class-media/${ctx.user.id}/${Date.now()}-${safeName}`, bytes, input.mimeType);
          await db.createMediaReference({ ownerId: ctx.user.id, storageKey: stored.key, servedUrl: stored.url, originalName: input.fileName, mimeType: input.mimeType, byteSize: bytes.length, altText: input.altText, publicUse: input.publicUse });
          return { key: stored.key, url: stored.url, byteSize: bytes.length };
        }),
      createReference: ownerProcedure
        .input(
          z.object({
            storageKey: z.string().min(1).max(512),
            servedUrl: z.string().min(1).max(768),
            originalName: z.string().min(1).max(255),
            mimeType: z.string().min(1).max(128),
            byteSize: z.number().int().nonnegative(),
            altText: z.string().max(280).nullable().optional(),
            publicUse: z.boolean(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          await db.createMediaReference({ ...input, ownerId: ctx.user.id });
          return { success: true as const };
        }),
    }),
  }),
  subjects: subjectsRouter,
  attendance: attendanceRouter,
  content: contentRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
