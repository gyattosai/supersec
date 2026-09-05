import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { ownerProcedure } from "./routers/guards";
import { subjectsRouter } from "./routers/subjects";
import { attendanceRouter } from "./routers/attendance";
import { contentRouter } from "./routers/content";
import { reportsRouter } from "./routers/reports";
import { attendanceProofRouter } from "./routers/attendanceProof";
import { pushRouter } from "./routers/push";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { isSupportedPublicUploadMimeType, MAX_PUBLIC_UPLOAD_BYTES } from "@shared/mediaPolicy";
import { generateAiText } from "@shared/aiTextEngine";

const publicIdInput = z.object({ publicId: z.string().min(8).max(24) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required").max(100),
          email: z.string().email("Invalid email address").max(320),
          password: z.string().min(8, "Password must be at least 8 characters").max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        const existing = await db.getUserByEmail(email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email address already exists. Please sign in instead.",
          });
        }

        // Generate a stable openId for this user
        const openId = `user_${nanoid(16)}`;
        const name = input.name.trim();

        // Check if this is the configured owner or standard secretary
        const isOwner = !ENV.ownerOpenId || openId === ENV.ownerOpenId;
        const role = isOwner ? ("admin" as const) : ("admin" as const); // All secretaries get administrative access to manage class records

        await db.upsertUser({
          openId,
          name,
          email,
          loginMethod: "password",
          role,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          user: {
            openId,
            name,
            email,
            role,
          },
        };
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Invalid email address"),
          password: z.string().min(1, "Password is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        let user = await db.getUserByEmail(email);

        if (!user) {
          // If no user exists yet with this email, create a new secretary account automatically
          const openId = `user_${nanoid(16)}`;
          const derivedName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          await db.upsertUser({
            openId,
            name: derivedName,
            email,
            loginMethod: "password",
            role: "admin",
            lastSignedIn: new Date(),
          });
          user = (await db.getUserByOpenId(openId)) || {
            id: 1,
            openId,
            name: derivedName,
            email,
            loginMethod: "password",
            role: "admin",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          };
        }

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
          });
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "Class Secretary",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          user: {
            openId: user.openId,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),
    devLogin: publicProcedure
      .input(
        z.object({
          name: z.string().optional(),
          role: z.enum(["admin", "user"]).optional(),
        }).optional()
      )
      .mutation(async ({ ctx, input }) => {
        const openId = ENV.ownerOpenId || "dev-secretary";
        const name = input?.name || "Class Secretary (Dev)";
        const role = input?.role || "admin";

        await db.upsertUser({
          openId,
          name,
          email: "secretary@example.com",
          loginMethod: "dev",
          role,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, token: sessionToken };
      }),
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
      getOverviewMetrics: ownerProcedure.query(async ({ ctx }) => {
        const database = await db.getDb();
        if (!database) {
          return {
            activeSubjects: 0,
            sharedSubjects: 0,
            enrolledStudents: 0,
            totalSessions: 0,
            attendanceRate: 100,
            pendingReviewsCount: 0,
            publishedReports: 0,
            attentionItems: [],
          };
        }

        const { subjects, subjectStudents, students, classSessions, attendanceRecords, zoomMatchSuggestions, zoomImports, attendanceProofSubmissions, reports } = await import("../drizzle/schema");
        const { and, eq, ne, sql } = await import("drizzle-orm");

        const activeSubjectsList = await database.select().from(subjects).where(and(eq(subjects.ownerId, ctx.user.id), eq(subjects.status, "active")));
        const activeSubjects = activeSubjectsList.length;
        const sharedSubjects = activeSubjectsList.filter(s => s.publishState === "published").length;
        const activeSubjectIds = activeSubjectsList.map(s => s.id);

        const studentsList = activeSubjectIds.length
          ? await database.select({ id: students.id }).from(subjectStudents).innerJoin(students, eq(subjectStudents.studentId, students.id)).where(and(sql`${subjectStudents.subjectId} IN (${sql.join(activeSubjectIds.map(id => sql`${id}`), sql`, `)})`, eq(subjectStudents.membershipState, "active")))
          : [];
        const enrolledStudents = new Set(studentsList.map(s => s.id)).size;

        const sessionsList = activeSubjectIds.length
          ? await database.select({ id: classSessions.id, subjectId: classSessions.subjectId, startsAt: classSessions.startsAt, sessionState: classSessions.sessionState }).from(classSessions).where(sql`${classSessions.subjectId} IN (${sql.join(activeSubjectIds.map(id => sql`${id}`), sql`, `)})`)
          : [];
        const totalSessions = sessionsList.filter(s => s.sessionState !== "no_class").length;

        const sessionIds = sessionsList.map(s => s.id);
        const attRecords = sessionIds.length
          ? await database.select({ status: attendanceRecords.attendanceStatus }).from(attendanceRecords).where(sql`${attendanceRecords.classSessionId} IN (${sql.join(sessionIds.map(s => sql`${s}`), sql`, `)})`)
          : [];
        const presentCount = attRecords.filter(r => r.status === "PRESENT").length;
        const totalMarked = attRecords.filter(r => r.status === "PRESENT" || r.status === "ABSENT" || r.status === "EXCUSED").length;
        const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 100;

        const unconfirmedZoom = sessionIds.length
          ? await database.select({ id: zoomMatchSuggestions.id, sourceName: zoomMatchSuggestions.sourceName, sessionId: zoomImports.classSessionId }).from(zoomMatchSuggestions).innerJoin(zoomImports, eq(zoomMatchSuggestions.zoomImportId, zoomImports.id)).where(and(sql`${zoomImports.classSessionId} IN (${sql.join(sessionIds.map(s => sql`${s}`), sql`, `)})`, ne(zoomMatchSuggestions.reviewState, "confirmed"))).limit(8)
          : [];

        const pendingProofs = sessionIds.length
          ? await database.select({ id: attendanceProofSubmissions.id, submittedName: attendanceProofSubmissions.submittedName, sessionId: attendanceProofSubmissions.classSessionId, summary: attendanceProofSubmissions.reviewSummary, createdAt: attendanceProofSubmissions.createdAt }).from(attendanceProofSubmissions).where(and(sql`${attendanceProofSubmissions.classSessionId} IN (${sql.join(sessionIds.map(s => sql`${s}`), sql`, `)})`, eq(attendanceProofSubmissions.reviewState, "needs_review"))).limit(8)
          : [];

        const pendingReviewsCount = unconfirmedZoom.length + pendingProofs.length;

        const reportsList = await database.select().from(reports).where(and(eq(reports.ownerId, ctx.user.id), eq(reports.publishState, "published")));
        const publishedReports = reportsList.length;

        return {
          activeSubjects,
          sharedSubjects,
          enrolledStudents,
          totalSessions,
          attendanceRate,
          pendingReviewsCount,
          publishedReports,
          attentionItems: [
            ...pendingProofs.map(p => ({
              type: "proof" as const,
              id: p.id,
              sessionId: p.sessionId,
              title: p.submittedName,
              description: p.summary || "Student attendance proof / excuse awaiting review",
              createdAt: p.createdAt,
            })),
            ...unconfirmedZoom.map(z => ({
              type: "zoom" as const,
              id: z.id,
              sessionId: z.sessionId,
              title: z.sourceName,
              description: "Unconfirmed Zoom participant match",
              createdAt: new Date(),
            })),
          ],
        };
      }),
      improveText: ownerProcedure
        .input(
          z.object({
            target: z.enum(["student_note", "announcement", "resource_description", "question_answer", "excuse_reason", "general_text"]),
            mode: z.enum(["improve", "autofill", "messenger", "action_items", "summarize", "polish"]).optional(),
            text: z.string().max(12000),
            context: z.string().max(600).optional(),
          })
        )
        .mutation(async ({ input }) => {
          const result = await generateAiText({
            target: input.target,
            mode: input.mode,
            text: input.text,
            context: input.context,
            apiKey: ENV.geminiApiKey,
          });
          return {
            text: result.text.slice(0, 12000),
            improvedText: result.improvedText.slice(0, 12000),
            mode: result.mode,
            target: result.target,
            provider: result.provider,
            changesMade: true,
          };
        }),
    }),
    publicSubject: publicProcedure.input(publicIdInput).query(async ({ input }) => {
      const subject = await db.getPublicSubjectById(input.publicId);
      return subject ? { available: true as const, subject } : { available: false as const };
    }),
    publicStudents: publicProcedure.input(publicIdInput).query(async ({ input }) => {
      const subject = await db.getPublicSubjectById(input.publicId);
      if (!subject) return { available: false as const };
      return {
        available: true as const,
        count: subject.students?.length ?? 0,
        students: subject.students ?? [],
      };
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
          if (!bytes.length || bytes.length > MAX_PUBLIC_UPLOAD_BYTES) throw new Error("Upload must be between 1 byte and 8 MB");
          if (!isSupportedPublicUploadMimeType(input.mimeType)) throw new Error("Choose a supported image, PDF, document, spreadsheet, presentation, text file, or CSV");
          const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
          const stored = await storagePut(`class-media/${ctx.user.id}/${Date.now()}-${safeName}`, bytes, input.mimeType);
          const id = await db.createMediaReference({ ownerId: ctx.user.id, storageKey: stored.key, servedUrl: stored.url, originalName: input.fileName, mimeType: input.mimeType, byteSize: bytes.length, altText: input.altText, publicUse: input.publicUse });
          return { id, key: stored.key, url: stored.url, byteSize: bytes.length, originalName: input.fileName, mimeType: input.mimeType };
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
  attendanceProof: attendanceProofRouter,
  content: contentRouter,
  reports: reportsRouter,
  push: pushRouter,
});

export type AppRouter = typeof appRouter;
