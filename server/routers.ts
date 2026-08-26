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
import { invokeLLM } from "./_core/llm";

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
      improveText: ownerProcedure.input(z.object({ target: z.enum(["student_note", "announcement", "resource_description", "question_answer", "excuse_reason"]), mode: z.enum(["improve", "autofill"]), text: z.string().max(12000), context: z.string().max(600).optional() })).mutation(async ({ input }) => {
        const instruction = input.mode === "improve" ? "Improve the supplied draft for clarity, grammar, and scannability while preserving its facts, tone, and intent." : "Draft a concise starting point from the supplied context. Do not invent facts, personal details, dates, attendance reasons, or commitments.";
        const result = await invokeLLM({ model: "gpt-5-mini", maxTokens: 1800, messages: [{ role: "system", content: `You are a private writing assistant for a class secretary. ${instruction} The target field is ${input.target}. Return only a suggested field value. Use plain text or lightweight Markdown when formatting helps. Never include raw HTML. This suggestion is advisory and must be reviewed before saving.` }, { role: "user", content: JSON.stringify({ currentText: input.text, context: input.context ?? "" }) }], outputSchema: { name: "private_text_suggestion", strict: true, schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } } });
        const content = result.choices[0]?.message.content;
        const parsed = typeof content === "string" ? JSON.parse(content) as { text: string } : null;
        const text = parsed?.text?.trim();
        if (!text) throw new Error("The AI assistant could not prepare a suggestion. Try again with more context.");
        return { text: text.slice(0, 12000) };
      }),
    }),
    publicSubject: publicProcedure.input(publicIdInput).query(async ({ input }) => {
      const subject = await db.getPublicSubjectById(input.publicId);
      return subject ? { available: true as const, subject } : { available: false as const };
    }),
    publicQuestions: publicProcedure.input(publicIdInput.extend({ query: z.string().trim().max(100).optional() })).query(async ({ input }) => {
      const result = await db.getPublicQuestionsBySubjectId(input.publicId, input.query);
      return result ? { available: true as const, ...result } : { available: false as const };
    }),
    publicAttendance: publicProcedure.input(publicIdInput).query(async ({ input }) => {
      const attendance = await db.getPublicAttendanceById(input.publicId);
      return attendance ? { available: true as const, attendance } : { available: false as const };
    }),
    /** Reserved safe response shape for later public Announcement, Resource, Question & Answer, Attendance, and Report pages. */
    publicItem: publicProcedure
      .input(z.object({ kind: z.enum(["announcement", "resource", "question", "attendance", "report"]), publicId: z.string().min(8).max(24) }))
      .query(async ({ input }) => {
        if (input.kind === "attendance" || input.kind === "report") return { available: false as const };
        const item = await db.getPublicContentItem(input.kind, input.publicId);
        return item ? { available: true as const, item } : { available: false as const };
      }),
    publicHistory: publicProcedure
      .input(z.object({ kind: z.enum(["announcement", "resource", "question"]), publicId: z.string().min(8).max(24) }))
      .query(async ({ input }) => {
        const history = await db.getPublicContentHistory(input.kind, input.publicId);
        return history ? { available: true as const, history } : { available: false as const };
      }),
    publicReport: publicProcedure.input(publicIdInput).query(async ({ input }) => {
      const report = await db.getPublicReportById(input.publicId);
      return report ? { available: true as const, report } : { available: false as const };
    }),
    media: router({
      upload: ownerProcedure
        .input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(128), base64Data: z.string().min(1).max(12_000_000), altText: z.string().max(280).nullable().optional(), publicUse: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
          const bytes = Buffer.from(input.base64Data.replace(/^data:[^;]+;base64,/, ""), "base64");
          if (!bytes.length || bytes.length > 8_000_000) throw new Error("Upload must be between 1 byte and 8 MB");
          const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
          const stored = await storagePut(`class-media/${ctx.user.id}/${Date.now()}-${safeName}`, bytes, input.mimeType);
          const id = await db.createMediaReference({ ownerId: ctx.user.id, storageKey: stored.key, servedUrl: stored.url, originalName: input.fileName, mimeType: input.mimeType, byteSize: bytes.length, altText: input.altText, publicUse: input.publicUse });
          return { id, key: stored.key, url: stored.url, byteSize: bytes.length };
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
          const id = await db.createMediaReference({ ...input, ownerId: ctx.user.id });
          return { success: true as const, id };
        }),
    }),
  }),
  subjects: subjectsRouter,
  attendance: attendanceRouter,
  content: contentRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
