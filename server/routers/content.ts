import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { announcements, historyEntries, mediaAssets, questionsAnswers, resourceAttachments, resources, subjects } from "../../drizzle/schema";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { ownerProcedure } from "./guards";
import { dispatchAutomatedPush } from "../pushNotifications";

async function databaseOrThrow() { const database = await getDb(); if (!database) throw new Error("Database is not available"); return database; }

async function assertSubject(ownerId: number, subjectIdentifier: number | string) {
  const database = await databaseOrThrow();
  const isNumeric = typeof subjectIdentifier === "number" || (!isNaN(Number(subjectIdentifier)) && !isNaN(parseInt(String(subjectIdentifier), 10)));
  const numId = isNumeric ? Number(subjectIdentifier) : -1;
  const strId = String(subjectIdentifier || "").trim();

  let row = await database
    .select({ id: subjects.id, name: subjects.name, code: subjects.code, publicId: subjects.publicId })
    .from(subjects)
    .where(
      and(
        isNumeric ? eq(subjects.id, numId) : eq(subjects.publicId, strId),
        eq(subjects.ownerId, ownerId)
      )
    )
    .limit(1);

  if (!row[0]) {
    row = await database
      .select({ id: subjects.id, name: subjects.name, code: subjects.code, publicId: subjects.publicId })
      .from(subjects)
      .where(isNumeric ? eq(subjects.id, numId) : eq(subjects.publicId, strId))
      .limit(1);
  }

  if (!row[0] && strId) {
    row = await database
      .select({ id: subjects.id, name: subjects.name, code: subjects.code, publicId: subjects.publicId })
      .from(subjects)
      .where(eq(subjects.code, strId))
      .limit(1);
  }

  if (!row[0]) throw new Error("Subject not found");
  return {
    database,
    subjectId: row[0].id,
    subjectName: row[0].name,
    subjectCode: row[0].code,
    subjectPublicId: row[0].publicId,
  };
}

async function dispatchContentPush(
  db: Awaited<ReturnType<typeof databaseOrThrow>>,
  subjectId: number,
  type: "announcement" | "resource" | "qa",
  title: string,
  detail: string | null | undefined,
  publicPath: string
) {
  try {
    const sub = await db
      .select({ name: subjects.name, code: subjects.code, publicId: subjects.publicId })
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);
    if (sub[0]) {
      dispatchAutomatedPush({
        type,
        title,
        detail,
        subjectName: sub[0].name,
        subjectCode: sub[0].code,
        actionUrl: publicPath,
      }).catch(() => {});
    }
  } catch {}
}

async function assertPublicMedia(db: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, assetId?: number | null) { if (!assetId) return null; const row = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.publicUse, true))).limit(1); if (!row[0]) throw new Error("Public media must be an owned asset marked for public use"); return assetId; }
const subjectInput = z.object({ subjectId: z.union([z.string(), z.number()]) });
const publicMediaInput = z.number().int().positive().nullable().optional();
const resourceAttachmentInput = z.array(z.number().int().positive()).max(6).default([]);
const updateSummary = z.string().trim().min(3).max(280);
const targetSubjectIdsInput = z.array(z.union([z.string(), z.number()])).default([]);
const crossPostInput = z.object({
  id: z.union([z.string(), z.number()]),
  targetSubjectIds: z.array(z.union([z.string(), z.number()])).min(1),
  publishDirectly: z.boolean().default(true),
});

async function assertPublicMediaList(db: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, assetIds: number[]) {
  const uniqueAssetIds = Array.from(new Set(assetIds));
  if (!uniqueAssetIds.length) return uniqueAssetIds;
  const assets = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(inArray(mediaAssets.id, uniqueAssetIds), eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.publicUse, true)));
  if (assets.length !== uniqueAssetIds.length) throw new Error("Resource attachments must be owned files marked for public use");
  return uniqueAssetIds;
}

async function replaceResourceAttachments(db: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, resourceId: number, attachmentAssetIds: number[]) {
  const assetIds = await assertPublicMediaList(db, ownerId, attachmentAssetIds);
  await db.delete(resourceAttachments).where(eq(resourceAttachments.resourceId, resourceId));
  if (assetIds.length) await db.insert(resourceAttachments).values(assetIds.map((mediaAssetId, displayOrder) => ({ resourceId, mediaAssetId, displayOrder })));
}

function normalize(value: string) { return value.trim().toLowerCase().replace(/\s+/g, " "); }

type PublicAsset = { id: number; url: string; originalName: string; mimeType: string; byteSize: number; altText: string | null };

async function getOwnedPublicAssetMap(db: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, rawIds: Array<number | null | undefined>) {
  const ids = Array.from(new Set(rawIds.filter((id): id is number => typeof id === "number" && id > 0)));
  if (!ids.length) return new Map<number, PublicAsset>();
  const assets = await db.select({ id: mediaAssets.id, url: mediaAssets.servedUrl, originalName: mediaAssets.originalName, mimeType: mediaAssets.mimeType, byteSize: mediaAssets.byteSize, altText: mediaAssets.altText }).from(mediaAssets).where(and(inArray(mediaAssets.id, ids), eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.publicUse, true)));
  return new Map<number, PublicAsset>(assets.map(asset => [asset.id, asset]));
}

async function listOwnedAnnouncementsWithMedia(db: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, subjectId: number) {
  const rows = await db.select().from(announcements).where(eq(announcements.subjectId, subjectId)).orderBy(desc(announcements.updatedAt));
  const assets = await getOwnedPublicAssetMap(db, ownerId, rows.flatMap(row => [row.mediaAssetId, row.socialPreviewMediaAssetId]));
  return rows.map(row => ({ ...row, coverAsset: row.mediaAssetId ? assets.get(row.mediaAssetId) ?? null : null, socialAsset: row.socialPreviewMediaAssetId ? assets.get(row.socialPreviewMediaAssetId) ?? null : null }));
}

async function listOwnedQuestionsWithMedia(db: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, subjectId: number) {
  const rows = await db.select().from(questionsAnswers).where(eq(questionsAnswers.subjectId, subjectId)).orderBy(desc(questionsAnswers.updatedAt));
  const assets = await getOwnedPublicAssetMap(db, ownerId, rows.map(row => row.socialPreviewMediaAssetId));
  return rows.map(row => ({ ...row, socialAsset: row.socialPreviewMediaAssetId ? assets.get(row.socialPreviewMediaAssetId) ?? null : null }));
}

async function listOwnedResourcesWithAttachments(db: Awaited<ReturnType<typeof databaseOrThrow>>, ownerId: number, subjectId: number) {
  const resourceRows = await db.select().from(resources).where(eq(resources.subjectId, subjectId)).orderBy(desc(resources.updatedAt));
  if (!resourceRows.length) return [];
  const attachmentRows = await db.select({ resourceId: resourceAttachments.resourceId, id: mediaAssets.id, url: mediaAssets.servedUrl, originalName: mediaAssets.originalName, mimeType: mediaAssets.mimeType, byteSize: mediaAssets.byteSize, altText: mediaAssets.altText, displayOrder: resourceAttachments.displayOrder }).from(resourceAttachments).innerJoin(mediaAssets, eq(resourceAttachments.mediaAssetId, mediaAssets.id)).where(and(inArray(resourceAttachments.resourceId, resourceRows.map(row => row.id)), eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.publicUse, true))).orderBy(resourceAttachments.displayOrder);
  const assets = await getOwnedPublicAssetMap(db, ownerId, resourceRows.flatMap(row => [row.fallbackMediaAssetId, row.socialPreviewMediaAssetId]));
  return resourceRows.map(resource => ({ ...resource, coverAsset: resource.fallbackMediaAssetId ? assets.get(resource.fallbackMediaAssetId) ?? null : null, socialAsset: resource.socialPreviewMediaAssetId ? assets.get(resource.socialPreviewMediaAssetId) ?? null : null, attachments: attachmentRows.filter(attachment => attachment.resourceId === resource.id) }));
}

export const contentRouter = router({
  archiveList: ownerProcedure.query(async ({ ctx }) => {
    const db = await databaseOrThrow();
    const [announcementRows, resourceRows, questionRows] = await Promise.all([
      db.select({ id: announcements.id, subjectId: subjects.id, subjectName: subjects.name, title: announcements.title, version: announcements.version, updatedAt: announcements.updatedAt }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).where(and(eq(subjects.ownerId, ctx.user.id), eq(announcements.publishState, "archived"))).orderBy(desc(announcements.updatedAt)),
      db.select({ id: resources.id, subjectId: subjects.id, subjectName: subjects.name, title: resources.title, version: resources.version, updatedAt: resources.updatedAt }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).where(and(eq(subjects.ownerId, ctx.user.id), eq(resources.publishState, "archived"))).orderBy(desc(resources.updatedAt)),
      db.select({ id: questionsAnswers.id, subjectId: subjects.id, subjectName: subjects.name, title: questionsAnswers.question, version: questionsAnswers.version, updatedAt: questionsAnswers.updatedAt }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).where(and(eq(subjects.ownerId, ctx.user.id), eq(questionsAnswers.publishState, "archived"))).orderBy(desc(questionsAnswers.updatedAt)),
    ]);
    return { announcements: announcementRows, resources: resourceRows, questions: questionRows };
  }),
  announcements: router({
    list: ownerProcedure.input(subjectInput).query(async ({ ctx, input }) => {
      const { database, subjectId } = await assertSubject(ctx.user.id, input.subjectId);
      return listOwnedAnnouncementsWithMedia(database, ctx.user.id, subjectId);
    }),
    create: ownerProcedure.input(subjectInput.extend({ title: z.string().trim().min(2).max(220), body: z.string().trim().min(1).max(20000), mediaAssetId: publicMediaInput, socialPreviewMediaAssetId: publicMediaInput, targetSubjectIds: targetSubjectIdsInput })).mutation(async ({ ctx, input }) => {
      const { database: db, subjectId } = await assertSubject(ctx.user.id, input.subjectId);
      await assertPublicMedia(db, ctx.user.id, input.mediaAssetId);
      await assertPublicMedia(db, ctx.user.id, input.socialPreviewMediaAssetId);
      const hasCrossPost = Boolean(input.targetSubjectIds && input.targetSubjectIds.length > 0);
      const publicId = nanoid(12);
      const [row] = await db.insert(announcements).values({
        subjectId,
        publicId,
        title: input.title,
        body: input.body,
        mediaAssetId: input.mediaAssetId ?? null,
        socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
        ...(hasCrossPost ? { publishState: "published", publishedAt: new Date(), publicChangeSummary: "Published and cross-posted" } : {}),
      }).$returningId();
      const createdIds: number[] = [row.id];
      if (hasCrossPost) {
        dispatchContentPush(db, subjectId, "announcement", input.title, input.body, `/a/${publicId}`);
        for (const targetSub of input.targetSubjectIds!) {
          const targetAssert = await assertSubject(ctx.user.id, targetSub);
          if (targetAssert.subjectId !== subjectId) {
            const existing = await db.select({ id: announcements.id }).from(announcements).where(and(eq(announcements.subjectId, targetAssert.subjectId), eq(announcements.title, input.title))).limit(1);
            if (existing[0]) {
              await db.update(announcements).set({
                body: input.body,
                mediaAssetId: input.mediaAssetId ?? null,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                publishedAt: new Date(),
                publicChangeSummary: "Synced from another subject",
              }).where(eq(announcements.id, existing[0].id));
              createdIds.push(existing[0].id);
            } else {
              const targetPublicId = nanoid(12);
              const [targetRow] = await db.insert(announcements).values({
                subjectId: targetAssert.subjectId,
                publicId: targetPublicId,
                title: input.title,
                body: input.body,
                mediaAssetId: input.mediaAssetId ?? null,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                publishedAt: new Date(),
                publicChangeSummary: "Cross-posted from another subject",
              }).$returningId();
              createdIds.push(targetRow.id);
              dispatchContentPush(db, targetAssert.subjectId, "announcement", input.title, input.body, `/a/${targetPublicId}`);
            }
          }
        }
      }
      return { id: row.id, createdIds, count: createdIds.length };
    }),
    crossPost: ownerProcedure.input(crossPostInput).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      let rows = await db.select().from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).where(and(numId > 0 ? eq(announcements.id, numId) : eq(announcements.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!rows[0]) throw new Error("Source announcement not found");
      const source = rows[0].announcements;
      const shouldPublish = input.publishDirectly !== false;
      if (shouldPublish && source.publishState !== "published") {
        await db.update(announcements).set({
          publishState: "published",
          publishedAt: new Date(),
          publicChangeSummary: "Published via cross-post",
        }).where(eq(announcements.id, source.id));
      }
      const createdIds: number[] = [];
      for (const targetSub of input.targetSubjectIds) {
        const targetAssert = await assertSubject(ctx.user.id, targetSub);
        if (targetAssert.subjectId !== source.subjectId) {
          // Check if an announcement with the same title already exists on the target subject
          const existing = await db.select().from(announcements).where(and(eq(announcements.subjectId, targetAssert.subjectId), eq(announcements.title, source.title))).limit(1);
          if (existing[0]) {
            const version = (existing[0].version || 0) + 1;
            await db.update(announcements).set({
              title: source.title,
              body: source.body,
              mediaAssetId: source.mediaAssetId ?? null,
              socialPreviewMediaAssetId: source.socialPreviewMediaAssetId ?? null,
              publishState: shouldPublish ? "published" : existing[0].publishState,
              version,
              publishedAt: shouldPublish ? (existing[0].publishedAt || new Date()) : existing[0].publishedAt,
              publicChangeSummary: "Updated via cross-post sync",
            }).where(eq(announcements.id, existing[0].id));
            createdIds.push(existing[0].id);
          } else {
            const [targetRow] = await db.insert(announcements).values({
              subjectId: targetAssert.subjectId,
              publicId: nanoid(12),
              title: source.title,
              body: source.body,
              mediaAssetId: source.mediaAssetId ?? null,
              socialPreviewMediaAssetId: source.socialPreviewMediaAssetId ?? null,
              publishState: shouldPublish ? "published" : "draft",
              version: 1,
              publishedAt: shouldPublish ? new Date() : null,
              publicChangeSummary: "Cross-posted from another subject",
            }).$returningId();
            createdIds.push(targetRow.id);
          }
        }
      }
      return { success: true, count: createdIds.length, createdIds };
    }),
    update: ownerProcedure.input(z.object({
      id: z.union([z.number().int().positive(), z.string()]),
      title: z.string().trim().min(2).max(220),
      body: z.string().trim().min(1).max(20000),
      mediaAssetId: publicMediaInput,
      socialPreviewMediaAssetId: publicMediaInput,
      summary: updateSummary,
      targetSubjectIds: targetSubjectIdsInput.optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      const row = await db.select({ id: announcements.id, version: announcements.version, subjectId: announcements.subjectId, title: announcements.title, publicId: announcements.publicId }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).where(and(numId > 0 ? eq(announcements.id, numId) : eq(announcements.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!row[0]) throw new Error("Announcement not found");
      await assertPublicMedia(db, ctx.user.id, input.mediaAssetId);
      await assertPublicMedia(db, ctx.user.id, input.socialPreviewMediaAssetId);
      const version = row[0].version + 1;
      await db.update(announcements).set({ title: input.title, body: input.body, mediaAssetId: input.mediaAssetId ?? null, socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null, publishState: "published", version, publicChangeSummary: input.summary, publishedAt: new Date() }).where(eq(announcements.id, row[0].id));
      await db.insert(historyEntries).values({ entityType: "announcement", entityId: row[0].id, version, action: "updated", publicChangeSummary: input.summary, actorUserId: ctx.user.id });
      dispatchContentPush(db, row[0].subjectId, "announcement", input.title, input.summary, `/a/${row[0].publicId}`);

      // If target subjects are specified, sync update without duplicating
      if (input.targetSubjectIds && input.targetSubjectIds.length > 0) {
        for (const targetSub of input.targetSubjectIds) {
          const targetAssert = await assertSubject(ctx.user.id, targetSub);
          if (targetAssert.subjectId !== row[0].subjectId) {
            const existing = await db.select().from(announcements).where(and(eq(announcements.subjectId, targetAssert.subjectId), eq(announcements.title, row[0].title))).limit(1);
            if (existing[0]) {
              const targetVer = (existing[0].version || 0) + 1;
              await db.update(announcements).set({
                title: input.title,
                body: input.body,
                mediaAssetId: input.mediaAssetId ?? null,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                version: targetVer,
                publishedAt: new Date(),
                publicChangeSummary: input.summary,
              }).where(eq(announcements.id, existing[0].id));
            } else {
              await db.insert(announcements).values({
                subjectId: targetAssert.subjectId,
                publicId: nanoid(12),
                title: input.title,
                body: input.body,
                mediaAssetId: input.mediaAssetId ?? null,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                version: 1,
                publishedAt: new Date(),
                publicChangeSummary: input.summary,
              });
            }
          }
        }
      }

      return { version };
    }),
    publish: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]), summary: updateSummary })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: announcements.id, version: announcements.version, subjectId: announcements.subjectId, title: announcements.title, publicId: announcements.publicId }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).where(and(numId > 0 ? eq(announcements.id, numId) : eq(announcements.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Announcement not found"); const version = row[0].version + 1; await db.update(announcements).set({ publishState: "published", version, publicChangeSummary: input.summary, publishedAt: new Date() }).where(eq(announcements.id, row[0].id)); await db.insert(historyEntries).values({ entityType: "announcement", entityId: row[0].id, version, action: "published", publicChangeSummary: input.summary, actorUserId: ctx.user.id }); dispatchContentPush(db, row[0].subjectId, "announcement", row[0].title, input.summary, `/a/${row[0].publicId}`); return { version }; }),
    archive: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: announcements.id }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).where(and(numId > 0 ? eq(announcements.id, numId) : eq(announcements.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Announcement not found"); await db.update(announcements).set({ publishState: "archived" }).where(eq(announcements.id, row[0].id)); return { success: true as const }; }),
    restore: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: announcements.id }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).where(and(numId > 0 ? eq(announcements.id, numId) : eq(announcements.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Announcement not found"); await db.update(announcements).set({ publishState: "draft" }).where(eq(announcements.id, row[0].id)); return { success: true as const }; }),
    delete: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      const row = await db.select({ id: announcements.id }).from(announcements).innerJoin(subjects, eq(announcements.subjectId, subjects.id)).where(and(numId > 0 ? eq(announcements.id, numId) : eq(announcements.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!row[0]) throw new Error("Announcement not found");
      await db.delete(historyEntries).where(and(eq(historyEntries.entityType, "announcement"), eq(historyEntries.entityId, row[0].id)));
      await db.delete(announcements).where(eq(announcements.id, row[0].id));
      return { success: true as const };
    }),
  }),
  resources: router({
    list: ownerProcedure.input(subjectInput).query(async ({ ctx, input }) => {
      const { database, subjectId } = await assertSubject(ctx.user.id, input.subjectId);
      return listOwnedResourcesWithAttachments(database, ctx.user.id, subjectId);
    }),
    create: ownerProcedure.input(subjectInput.extend({ title: z.string().trim().min(2).max(220), description: z.string().trim().min(1).max(5000), category: z.string().trim().min(2).max(80), resourceType: z.string().trim().min(2).max(80), destinationUrl: z.string().url().max(4000), fallbackMediaAssetId: publicMediaInput, socialPreviewMediaAssetId: publicMediaInput, attachmentAssetIds: resourceAttachmentInput, targetSubjectIds: targetSubjectIdsInput })).mutation(async ({ ctx, input }) => {
      const { database: db, subjectId } = await assertSubject(ctx.user.id, input.subjectId);
      await assertPublicMedia(db, ctx.user.id, input.fallbackMediaAssetId);
      await assertPublicMedia(db, ctx.user.id, input.socialPreviewMediaAssetId);
      const sourceDomain = new URL(input.destinationUrl).hostname;
      const hasCrossPost = Boolean(input.targetSubjectIds && input.targetSubjectIds.length > 0);
      const publicId = nanoid(12);
      const [row] = await db.insert(resources).values({
        subjectId,
        publicId,
        title: input.title,
        description: input.description,
        category: input.category,
        resourceType: input.resourceType,
        sourceDomain,
        destinationUrl: input.destinationUrl,
        fallbackMediaAssetId: input.fallbackMediaAssetId ?? null,
        socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
        ...(hasCrossPost ? { publishState: "published", publishedAt: new Date(), publicChangeSummary: "Published and cross-posted" } : {}),
      }).$returningId();
      await replaceResourceAttachments(db, ctx.user.id, row.id, input.attachmentAssetIds);
      const createdIds: number[] = [row.id];
      if (hasCrossPost) {
        dispatchContentPush(db, subjectId, "resource", input.title, input.description, `/r/${publicId}`);
        for (const targetSub of input.targetSubjectIds!) {
          const targetAssert = await assertSubject(ctx.user.id, targetSub);
          if (targetAssert.subjectId !== subjectId) {
            const existing = await db.select({ id: resources.id }).from(resources).where(and(eq(resources.subjectId, targetAssert.subjectId), eq(resources.title, input.title))).limit(1);
            if (existing[0]) {
              await db.update(resources).set({
                description: input.description,
                category: input.category,
                resourceType: input.resourceType,
                sourceDomain,
                destinationUrl: input.destinationUrl,
                fallbackMediaAssetId: input.fallbackMediaAssetId ?? null,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                publishedAt: new Date(),
                publicChangeSummary: "Synced from another subject",
              }).where(eq(resources.id, existing[0].id));
              await replaceResourceAttachments(db, ctx.user.id, existing[0].id, input.attachmentAssetIds);
              createdIds.push(existing[0].id);
            } else {
              const [targetRow] = await db.insert(resources).values({
                subjectId: targetAssert.subjectId,
                publicId: nanoid(12),
                title: input.title,
                description: input.description,
                category: input.category,
                resourceType: input.resourceType,
                sourceDomain,
                destinationUrl: input.destinationUrl,
                fallbackMediaAssetId: input.fallbackMediaAssetId ?? null,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                publishedAt: new Date(),
                publicChangeSummary: "Cross-posted from another subject",
              }).$returningId();
              await replaceResourceAttachments(db, ctx.user.id, targetRow.id, input.attachmentAssetIds);
              createdIds.push(targetRow.id);
            }
          }
        }
      }
      return { id: row.id, createdIds, count: createdIds.length };
    }),
    crossPost: ownerProcedure.input(crossPostInput).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      let rows = await db.select().from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).where(and(numId > 0 ? eq(resources.id, numId) : eq(resources.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!rows[0]) throw new Error("Source resource not found");
      const source = rows[0].resources;
      const shouldPublish = input.publishDirectly !== false;
      if (shouldPublish && source.publishState !== "published") {
        await db.update(resources).set({
          publishState: "published",
          publishedAt: new Date(),
          publicChangeSummary: "Published via cross-post",
        }).where(eq(resources.id, source.id));
      }
      const attachments = await db.select({ mediaAssetId: resourceAttachments.mediaAssetId }).from(resourceAttachments).where(eq(resourceAttachments.resourceId, source.id)).orderBy(resourceAttachments.displayOrder);
      const attachmentAssetIds = attachments.map(a => a.mediaAssetId);
      const createdIds: number[] = [];
      for (const targetSub of input.targetSubjectIds) {
        const targetAssert = await assertSubject(ctx.user.id, targetSub);
        if (targetAssert.subjectId !== source.subjectId) {
          // Check if resource with same title already exists on target subject
          const existing = await db.select().from(resources).where(and(eq(resources.subjectId, targetAssert.subjectId), eq(resources.title, source.title))).limit(1);
          if (existing[0]) {
            const version = (existing[0].version || 0) + 1;
            await db.update(resources).set({
              title: source.title,
              description: source.description,
              category: source.category,
              resourceType: source.resourceType,
              sourceDomain: source.sourceDomain,
              destinationUrl: source.destinationUrl,
              fallbackMediaAssetId: source.fallbackMediaAssetId ?? null,
              socialPreviewMediaAssetId: source.socialPreviewMediaAssetId ?? null,
              publishState: shouldPublish ? "published" : existing[0].publishState,
              version,
              publishedAt: shouldPublish ? (existing[0].publishedAt || new Date()) : existing[0].publishedAt,
              publicChangeSummary: "Updated via cross-post sync",
            }).where(eq(resources.id, existing[0].id));
            await replaceResourceAttachments(db, ctx.user.id, existing[0].id, attachmentAssetIds);
            createdIds.push(existing[0].id);
          } else {
            const [targetRow] = await db.insert(resources).values({
              subjectId: targetAssert.subjectId,
              publicId: nanoid(12),
              title: source.title,
              description: source.description,
              category: source.category,
              resourceType: source.resourceType,
              sourceDomain: source.sourceDomain,
              destinationUrl: source.destinationUrl,
              fallbackMediaAssetId: source.fallbackMediaAssetId ?? null,
              socialPreviewMediaAssetId: source.socialPreviewMediaAssetId ?? null,
              publishState: shouldPublish ? "published" : "draft",
              version: 1,
              publishedAt: shouldPublish ? new Date() : null,
              publicChangeSummary: "Cross-posted from another subject",
            }).$returningId();
            await replaceResourceAttachments(db, ctx.user.id, targetRow.id, attachmentAssetIds);
            createdIds.push(targetRow.id);
          }
        }
      }
      return { success: true, count: createdIds.length, createdIds };
    }),
    update: ownerProcedure.input(z.object({
      id: z.union([z.number().int().positive(), z.string()]),
      title: z.string().trim().min(2).max(220),
      description: z.string().trim().min(1).max(5000),
      category: z.string().trim().min(2).max(80),
      resourceType: z.string().trim().min(2).max(80),
      destinationUrl: z.string().url().max(4000),
      fallbackMediaAssetId: publicMediaInput,
      socialPreviewMediaAssetId: publicMediaInput,
      attachmentAssetIds: resourceAttachmentInput,
      summary: updateSummary,
      targetSubjectIds: targetSubjectIdsInput.optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      const row = await db.select({ id: resources.id, version: resources.version, subjectId: resources.subjectId, title: resources.title, publicId: resources.publicId }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).where(and(numId > 0 ? eq(resources.id, numId) : eq(resources.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!row[0]) throw new Error("Resource not found");
      await assertPublicMedia(db, ctx.user.id, input.fallbackMediaAssetId);
      await assertPublicMedia(db, ctx.user.id, input.socialPreviewMediaAssetId);
      const version = row[0].version + 1;
      await db.update(resources).set({ title: input.title, description: input.description, category: input.category, resourceType: input.resourceType, destinationUrl: input.destinationUrl, sourceDomain: new URL(input.destinationUrl).hostname, fallbackMediaAssetId: input.fallbackMediaAssetId ?? null, socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null, publishState: "published", version, publicChangeSummary: input.summary, publishedAt: new Date() }).where(eq(resources.id, row[0].id));
      await replaceResourceAttachments(db, ctx.user.id, row[0].id, input.attachmentAssetIds);
      await db.insert(historyEntries).values({ entityType: "resource", entityId: row[0].id, version, action: "updated", publicChangeSummary: input.summary, actorUserId: ctx.user.id });
      dispatchContentPush(db, row[0].subjectId, "resource", input.title, input.summary, `/r/${row[0].publicId}`);

      // If target subjects are specified, sync update without duplicating
      if (input.targetSubjectIds && input.targetSubjectIds.length > 0) {
        for (const targetSub of input.targetSubjectIds) {
          const targetAssert = await assertSubject(ctx.user.id, targetSub);
          if (targetAssert.subjectId !== row[0].subjectId) {
            const existing = await db.select().from(resources).where(and(eq(resources.subjectId, targetAssert.subjectId), eq(resources.title, row[0].title))).limit(1);
            if (existing[0]) {
              const targetVer = (existing[0].version || 0) + 1;
              await db.update(resources).set({
                title: input.title,
                description: input.description,
                category: input.category,
                resourceType: input.resourceType,
                destinationUrl: input.destinationUrl,
                sourceDomain: new URL(input.destinationUrl).hostname,
                fallbackMediaAssetId: input.fallbackMediaAssetId ?? null,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                version: targetVer,
                publishedAt: new Date(),
                publicChangeSummary: input.summary,
              }).where(eq(resources.id, existing[0].id));
              await replaceResourceAttachments(db, ctx.user.id, existing[0].id, input.attachmentAssetIds);
            } else {
              const [targetRow] = await db.insert(resources).values({
                subjectId: targetAssert.subjectId,
                publicId: nanoid(12),
                title: input.title,
                description: input.description,
                category: input.category,
                resourceType: input.resourceType,
                sourceDomain: new URL(input.destinationUrl).hostname,
                destinationUrl: input.destinationUrl,
                fallbackMediaAssetId: input.fallbackMediaAssetId ?? null,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                version: 1,
                publishedAt: new Date(),
                publicChangeSummary: input.summary,
              }).$returningId();
              await replaceResourceAttachments(db, ctx.user.id, targetRow.id, input.attachmentAssetIds);
            }
          }
        }
      }

      return { version };
    }),
    publish: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]), summary: updateSummary })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: resources.id, version: resources.version, subjectId: resources.subjectId, title: resources.title, publicId: resources.publicId }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).where(and(numId > 0 ? eq(resources.id, numId) : eq(resources.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Resource not found"); const version = row[0].version + 1; await db.update(resources).set({ publishState: "published", version, publicChangeSummary: input.summary, publishedAt: new Date() }).where(eq(resources.id, row[0].id)); await db.insert(historyEntries).values({ entityType: "resource", entityId: row[0].id, version, action: "published", publicChangeSummary: input.summary, actorUserId: ctx.user.id }); dispatchContentPush(db, row[0].subjectId, "resource", row[0].title, input.summary, `/r/${row[0].publicId}`); return { version }; }),
    archive: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: resources.id }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).where(and(numId > 0 ? eq(resources.id, numId) : eq(resources.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Resource not found"); await db.update(resources).set({ publishState: "archived" }).where(eq(resources.id, row[0].id)); return { success: true as const }; }),
    restore: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: resources.id }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).where(and(numId > 0 ? eq(resources.id, numId) : eq(resources.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Resource not found"); await db.update(resources).set({ publishState: "draft" }).where(eq(resources.id, row[0].id)); return { success: true as const }; }),
    delete: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      const row = await db.select({ id: resources.id }).from(resources).innerJoin(subjects, eq(resources.subjectId, subjects.id)).where(and(numId > 0 ? eq(resources.id, numId) : eq(resources.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!row[0]) throw new Error("Resource not found");
      await db.delete(resourceAttachments).where(eq(resourceAttachments.resourceId, row[0].id));
      await db.delete(historyEntries).where(and(eq(historyEntries.entityType, "resource"), eq(historyEntries.entityId, row[0].id)));
      await db.delete(resources).where(eq(resources.id, row[0].id));
      return { success: true as const };
    }),
  }),
  questions: router({
    list: ownerProcedure.input(subjectInput).query(async ({ ctx, input }) => {
      const { database, subjectId } = await assertSubject(ctx.user.id, input.subjectId);
      return listOwnedQuestionsWithMedia(database, ctx.user.id, subjectId);
    }),
    create: ownerProcedure.input(subjectInput.extend({ question: z.string().trim().min(3).max(5000), answer: z.string().trim().min(1).max(10000), tagsText: z.string().max(1000).nullable().optional(), isOfficial: z.boolean().default(false), socialPreviewMediaAssetId: publicMediaInput, targetSubjectIds: targetSubjectIdsInput })).mutation(async ({ ctx, input }) => {
      const { database: db, subjectId } = await assertSubject(ctx.user.id, input.subjectId);
      await assertPublicMedia(db, ctx.user.id, input.socialPreviewMediaAssetId);
      const hasCrossPost = Boolean(input.targetSubjectIds && input.targetSubjectIds.length > 0);
      const publicId = nanoid(12);
      const [row] = await db.insert(questionsAnswers).values({
        subjectId,
        publicId,
        question: input.question,
        answer: input.answer,
        tagsText: input.tagsText ?? null,
        isOfficial: input.isOfficial,
        socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
        ...(hasCrossPost ? { publishState: "published", publishedAt: new Date(), publicChangeSummary: "Published and cross-posted" } : {}),
      }).$returningId();
      const createdIds: number[] = [row.id];
      if (hasCrossPost) {
        dispatchContentPush(db, subjectId, "qa", input.question, input.answer, `/q/${publicId}`);
        for (const targetSub of input.targetSubjectIds!) {
          const targetAssert = await assertSubject(ctx.user.id, targetSub);
          if (targetAssert.subjectId !== subjectId) {
            const existing = await db.select({ id: questionsAnswers.id }).from(questionsAnswers).where(and(eq(questionsAnswers.subjectId, targetAssert.subjectId), eq(questionsAnswers.question, input.question))).limit(1);
            if (existing[0]) {
              await db.update(questionsAnswers).set({
                answer: input.answer,
                tagsText: input.tagsText ?? null,
                isOfficial: input.isOfficial,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                publishedAt: new Date(),
                publicChangeSummary: "Synced from another subject",
              }).where(eq(questionsAnswers.id, existing[0].id));
              createdIds.push(existing[0].id);
            } else {
              const targetPublicId = nanoid(12);
              const [targetRow] = await db.insert(questionsAnswers).values({
                subjectId: targetAssert.subjectId,
                publicId: targetPublicId,
                question: input.question,
                answer: input.answer,
                tagsText: input.tagsText ?? null,
                isOfficial: input.isOfficial,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                publishedAt: new Date(),
                publicChangeSummary: "Cross-posted from another subject",
              }).$returningId();
              createdIds.push(targetRow.id);
              dispatchContentPush(db, targetAssert.subjectId, "qa", input.question, input.answer, `/q/${targetPublicId}`);
            }
          }
        }
      }
      return { id: row.id, createdIds, count: createdIds.length };
    }),
    crossPost: ownerProcedure.input(crossPostInput).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      let rows = await db.select().from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).where(and(numId > 0 ? eq(questionsAnswers.id, numId) : eq(questionsAnswers.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!rows[0]) throw new Error("Source question & answer not found");
      const source = rows[0].questionsAnswers;
      const shouldPublish = input.publishDirectly !== false;
      if (shouldPublish && source.publishState !== "published") {
        await db.update(questionsAnswers).set({
          publishState: "published",
          publishedAt: new Date(),
          publicChangeSummary: "Published via cross-post",
        }).where(eq(questionsAnswers.id, source.id));
      }
      const createdIds: number[] = [];
      for (const targetSub of input.targetSubjectIds) {
        const targetAssert = await assertSubject(ctx.user.id, targetSub);
        if (targetAssert.subjectId !== source.subjectId) {
          // Check if question with same text already exists on target subject
          const existing = await db.select().from(questionsAnswers).where(and(eq(questionsAnswers.subjectId, targetAssert.subjectId), eq(questionsAnswers.question, source.question))).limit(1);
          if (existing[0]) {
            const version = (existing[0].version || 0) + 1;
            await db.update(questionsAnswers).set({
              question: source.question,
              answer: source.answer,
              tagsText: source.tagsText ?? null,
              isOfficial: source.isOfficial,
              socialPreviewMediaAssetId: source.socialPreviewMediaAssetId ?? null,
              publishState: shouldPublish ? "published" : existing[0].publishState,
              version,
              publishedAt: shouldPublish ? (existing[0].publishedAt || new Date()) : existing[0].publishedAt,
              publicChangeSummary: "Updated via cross-post sync",
            }).where(eq(questionsAnswers.id, existing[0].id));
            createdIds.push(existing[0].id);
          } else {
            const [targetRow] = await db.insert(questionsAnswers).values({
              subjectId: targetAssert.subjectId,
              publicId: nanoid(12),
              question: source.question,
              answer: source.answer,
              tagsText: source.tagsText ?? null,
              isOfficial: source.isOfficial,
              socialPreviewMediaAssetId: source.socialPreviewMediaAssetId ?? null,
              publishState: shouldPublish ? "published" : "draft",
              version: 1,
              publishedAt: shouldPublish ? new Date() : null,
              publicChangeSummary: "Cross-posted from another subject",
            }).$returningId();
            createdIds.push(targetRow.id);
          }
        }
      }
      return { success: true, count: createdIds.length, createdIds };
    }),
    update: ownerProcedure.input(z.object({
      id: z.union([z.number().int().positive(), z.string()]),
      question: z.string().trim().min(3).max(5000),
      answer: z.string().trim().min(1).max(10000),
      tagsText: z.string().max(1000).nullable().optional(),
      isOfficial: z.boolean(),
      socialPreviewMediaAssetId: publicMediaInput,
      summary: updateSummary,
      targetSubjectIds: targetSubjectIdsInput.optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      const row = await db.select({ id: questionsAnswers.id, version: questionsAnswers.version, subjectId: questionsAnswers.subjectId, question: questionsAnswers.question, publicId: questionsAnswers.publicId }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).where(and(numId > 0 ? eq(questionsAnswers.id, numId) : eq(questionsAnswers.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!row[0]) throw new Error("Question & Answer not found");
      await assertPublicMedia(db, ctx.user.id, input.socialPreviewMediaAssetId);
      const version = row[0].version + 1;
      await db.update(questionsAnswers).set({ question: input.question, answer: input.answer, tagsText: input.tagsText ?? null, isOfficial: input.isOfficial, socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null, publishState: "published", version, publicChangeSummary: input.summary, publishedAt: new Date() }).where(eq(questionsAnswers.id, row[0].id));
      await db.insert(historyEntries).values({ entityType: "question", entityId: row[0].id, version, action: "updated", publicChangeSummary: input.summary, actorUserId: ctx.user.id });
      dispatchContentPush(db, row[0].subjectId, "qa", input.question, input.summary, `/q/${row[0].publicId}`);

      // If target subjects are specified, sync update without duplicating
      if (input.targetSubjectIds && input.targetSubjectIds.length > 0) {
        for (const targetSub of input.targetSubjectIds) {
          const targetAssert = await assertSubject(ctx.user.id, targetSub);
          if (targetAssert.subjectId !== row[0].subjectId) {
            const existing = await db.select().from(questionsAnswers).where(and(eq(questionsAnswers.subjectId, targetAssert.subjectId), eq(questionsAnswers.question, row[0].question))).limit(1);
            if (existing[0]) {
              const targetVer = (existing[0].version || 0) + 1;
              await db.update(questionsAnswers).set({
                question: input.question,
                answer: input.answer,
                tagsText: input.tagsText ?? null,
                isOfficial: input.isOfficial,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                version: targetVer,
                publishedAt: new Date(),
                publicChangeSummary: input.summary,
              }).where(eq(questionsAnswers.id, existing[0].id));
            } else {
              await db.insert(questionsAnswers).values({
                subjectId: targetAssert.subjectId,
                publicId: nanoid(12),
                question: input.question,
                answer: input.answer,
                tagsText: input.tagsText ?? null,
                isOfficial: input.isOfficial,
                socialPreviewMediaAssetId: input.socialPreviewMediaAssetId ?? null,
                publishState: "published",
                version: 1,
                publishedAt: new Date(),
                publicChangeSummary: input.summary,
              });
            }
          }
        }
      }

      return { version };
    }),
    publish: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]), summary: updateSummary, official: z.boolean().optional() })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: questionsAnswers.id, version: questionsAnswers.version, isOfficial: questionsAnswers.isOfficial, subjectId: questionsAnswers.subjectId, question: questionsAnswers.question, publicId: questionsAnswers.publicId }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).where(and(numId > 0 ? eq(questionsAnswers.id, numId) : eq(questionsAnswers.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Question & Answer not found"); const version = row[0].version + 1; const finalOfficial = typeof input.official === "boolean" ? input.official : row[0].isOfficial; await db.update(questionsAnswers).set({ publishState: "published", version, isOfficial: finalOfficial, publicChangeSummary: input.summary, publishedAt: new Date() }).where(eq(questionsAnswers.id, row[0].id)); await db.insert(historyEntries).values({ entityType: "question", entityId: row[0].id, version, action: "published", publicChangeSummary: input.summary, actorUserId: ctx.user.id }); dispatchContentPush(db, row[0].subjectId, "qa", row[0].question, input.summary, `/q/${row[0].publicId}`); return { version }; }),
    archive: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: questionsAnswers.id }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).where(and(numId > 0 ? eq(questionsAnswers.id, numId) : eq(questionsAnswers.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Question & Answer not found"); await db.update(questionsAnswers).set({ publishState: "archived" }).where(eq(questionsAnswers.id, row[0].id)); return { success: true as const }; }),
    restore: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => { const db = await databaseOrThrow(); const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1; const row = await db.select({ id: questionsAnswers.id }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).where(and(numId > 0 ? eq(questionsAnswers.id, numId) : eq(questionsAnswers.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1); if (!row[0]) throw new Error("Question & Answer not found"); await db.update(questionsAnswers).set({ publishState: "draft" }).where(eq(questionsAnswers.id, row[0].id)); return { success: true as const }; }),
    delete: ownerProcedure.input(z.object({ id: z.union([z.number().int().positive(), z.string()]) })).mutation(async ({ ctx, input }) => {
      const db = await databaseOrThrow();
      const numId = typeof input.id === "number" || (!isNaN(Number(input.id)) && !isNaN(parseInt(String(input.id), 10))) ? Number(input.id) : -1;
      const row = await db.select({ id: questionsAnswers.id }).from(questionsAnswers).innerJoin(subjects, eq(questionsAnswers.subjectId, subjects.id)).where(and(numId > 0 ? eq(questionsAnswers.id, numId) : eq(questionsAnswers.publicId, String(input.id)), eq(subjects.ownerId, ctx.user.id))).limit(1);
      if (!row[0]) throw new Error("Question & Answer not found");
      await db.delete(historyEntries).where(and(eq(historyEntries.entityType, "question"), eq(historyEntries.entityId, row[0].id)));
      await db.delete(questionsAnswers).where(eq(questionsAnswers.id, row[0].id));
      return { success: true as const };
    }),
  }),
});
