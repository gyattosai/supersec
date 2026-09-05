import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { appwriteDatabases } from "../client/src/lib/appwrite";
import { handleAppwriteClientProcedure } from "../client/src/lib/appwriteAdapter";
import { SignalContentList } from "../client/src/pages/FocusedContentPage";

describe("Cross-Posting across Multiple Subjects", () => {
  const store = new Map<string, any>();

  beforeEach(() => {
    store.clear();

    vi.spyOn(appwriteDatabases, "createDocument").mockImplementation(async (dbId, colId, docId, data) => {
      const finalId = !docId || docId === "unique()" ? "doc_" + Math.random().toString(36).substring(2, 9) : docId;
      const record = {
        $id: finalId,
        $collectionId: colId,
        $databaseId: dbId,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        ...data,
      };
      store.set(`${colId}:${finalId}`, record);
      return record as any;
    });

    vi.spyOn(appwriteDatabases, "updateDocument").mockImplementation(async (dbId, colId, docId, data) => {
      const existing = store.get(`${colId}:${docId}`) || { $id: docId, $collectionId: colId, $databaseId: dbId };
      const updated = {
        ...existing,
        ...data,
        $updatedAt: new Date().toISOString(),
      };
      store.set(`${colId}:${docId}`, updated);
      return updated as any;
    });

    vi.spyOn(appwriteDatabases, "deleteDocument").mockImplementation(async (dbId, colId, docId) => {
      store.delete(`${colId}:${docId}`);
      return {} as any;
    });

    vi.spyOn(appwriteDatabases, "getDocument").mockImplementation(async (dbId, colId, docId) => {
      const record = store.get(`${colId}:${docId}`);
      if (!record) {
        throw new Error(`Document ${docId} not found in ${colId}`);
      }
      return record as any;
    });

    vi.spyOn(appwriteDatabases, "listDocuments").mockImplementation(async (dbId, colId, queries) => {
      let docs = Array.from(store.values()).filter((d) => d.$collectionId === colId);
      if (Array.isArray(queries)) {
        for (const q of queries) {
          const str = String(q);
          try {
            const parsed = JSON.parse(str);
            if (parsed.method === "equal" && parsed.attribute && Array.isArray(parsed.values)) {
              docs = docs.filter((d) => parsed.values.map(String).includes(String(d[parsed.attribute])));
              continue;
            }
          } catch {}
          const match = str.match(/equal\("([^"]+)",\s*(\[.*?\]|"[^"]*"|'[^']*'|[^)]+)\)/);
          if (match) {
            const field = match[1];
            let val = match[2].trim();
            if (val.startsWith("[") && val.endsWith("]")) {
              val = val.slice(1, -1).trim();
            }
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            docs = docs.filter((d) => String(d[field]) === String(val));
          }
        }
      }
      return { total: docs.length, documents: docs } as any;
    });
  });
  it("renders the Cross-Post action button on non-archived items in SignalContentList", () => {
    const onCrossPostMock = vi.fn();
    const html = renderToStaticMarkup(
      createElement(Router, { ssrPath: "/" },
        createElement(SignalContentList, {
          kind: "announcements",
          subjectId: "101",
          loading: false,
          items: [
            { id: "ann-1", title: "Midterm Room Assignment", body: "Room 402", publishState: "draft", version: 1, publicId: "p1" },
            { id: "ann-2", title: "Finals Schedule", body: "Starts Monday", publishState: "published", version: 2, publicId: "p2" },
          ],
          onPublish: vi.fn(),
          onArchive: vi.fn(),
          onRestore: vi.fn(),
          onCrossPost: onCrossPostMock,
          pendingAction: { type: "publish", id: -1 },
        })
      )
    );

    expect(html).toContain("Cross-Post");
    expect(html).toContain("Midterm Room Assignment");
    expect(html).toContain("Finals Schedule");
  });

  it("does not render the Cross-Post button on archived items", () => {
    const onCrossPostMock = vi.fn();
    const html = renderToStaticMarkup(
      createElement(Router, { ssrPath: "/" },
        createElement(SignalContentList, {
          kind: "announcements",
          subjectId: "101",
          loading: false,
          items: [
            { id: "ann-3", title: "Old Schedule", body: "Expired", publishState: "archived", version: 1, publicId: "p3" },
          ],
          onPublish: vi.fn(),
          onArchive: vi.fn(),
          onRestore: vi.fn(),
          onCrossPost: onCrossPostMock,
          pendingAction: { type: "publish", id: -1 },
        })
      )
    );

    expect(html).not.toContain("Cross-Post");
    expect(html).toContain("Restore as draft");
  });

  it("creates cross-posted announcement documents across target subjects in Appwrite client adapter", async () => {
    const result = await handleAppwriteClientProcedure("content.announcements.create", {
      subjectId: "OLCBTQM01",
      title: "Class Suspended on Friday",
      body: "Due to holiday, classes are suspended.",
      targetSubjectIds: ["SEC401", "CS101"],
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.publicId).toBeDefined();
  });

  it("creates cross-posted resource documents across target subjects in Appwrite client adapter", async () => {
    const result = await handleAppwriteClientProcedure("content.resources.create", {
      subjectId: "OLCBTQM01",
      title: "Course Syllabus 2026",
      description: "Updated syllabus for this term.",
      category: "lecture",
      resourceType: "link",
      destinationUrl: "https://example.com/syllabus",
      targetSubjectIds: ["SEC401"],
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("creates cross-posted Q&A documents across target subjects in Appwrite client adapter", async () => {
    const result = await handleAppwriteClientProcedure("content.questions.create", {
      subjectId: "OLCBTQM01",
      question: "Where can we find the Zoom recording?",
      answer: "Recordings are uploaded to the portal after 24 hours.",
      targetSubjectIds: ["SEC401"],
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("handles crossPost mutation for existing announcement in Appwrite client adapter", async () => {
    const source = await handleAppwriteClientProcedure("content.announcements.create", {
      subjectId: "OLCBTQM01",
      title: "Universal Announcement",
      body: "Important school update for all students.",
    });

    const crossPostRes = await handleAppwriteClientProcedure("content.announcements.crossPost", {
      id: source.id,
      targetSubjectIds: ["SEC401"],
      publishDirectly: true,
    });

    expect(crossPostRes.success).toBe(true);
    expect(crossPostRes.count).toBe(1);
  });

  it("handles crossPost mutation for existing resource in Appwrite client adapter", async () => {
    const source = await handleAppwriteClientProcedure("content.resources.create", {
      subjectId: "OLCBTQM01",
      title: "Student Handbook 2026",
      description: "Official student handbook",
      destinationUrl: "https://example.com/handbook",
      category: "handbook",
      resourceType: "link",
    });

    const crossPostRes = await handleAppwriteClientProcedure("content.resources.crossPost", {
      id: source.id,
      targetSubjectIds: ["SEC401", "CS101"],
      publishDirectly: false,
    });

    expect(crossPostRes.success).toBe(true);
    expect(crossPostRes.count).toBe(2);
  });

  it("handles crossPost mutation for existing question in Appwrite client adapter", async () => {
    const source = await handleAppwriteClientProcedure("content.questions.create", {
      subjectId: "OLCBTQM01",
      question: "How to apply for graduation?",
      answer: "Submit forms to the registrar.",
    });

    const crossPostRes = await handleAppwriteClientProcedure("content.questions.crossPost", {
      id: source.id,
      targetSubjectIds: ["SEC401"],
      publishDirectly: true,
    });

    expect(crossPostRes.success).toBe(true);
    expect(crossPostRes.count).toBe(1);
  });

  it("updates existing target document instead of duplicating when cross-posting twice", async () => {
    const source = await handleAppwriteClientProcedure("content.announcements.create", {
      subjectId: "OLCBTQM01",
      title: "Exam Instructions",
      body: "Initial instructions.",
    });

    // First cross-post
    await handleAppwriteClientProcedure("content.announcements.crossPost", {
      id: source.id,
      targetSubjectIds: ["SEC401"],
      publishDirectly: true,
    });

    const afterFirst = await handleAppwriteClientProcedure("content.announcements.list", {
      subjectId: "SEC401",
    });
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0].title).toBe("Exam Instructions");

    // Second cross-post of the same item
    await handleAppwriteClientProcedure("content.announcements.crossPost", {
      id: source.id,
      targetSubjectIds: ["SEC401"],
      publishDirectly: true,
    });

    const afterSecond = await handleAppwriteClientProcedure("content.announcements.list", {
      subjectId: "SEC401",
    });
    // Should NOT duplicate!
    expect(afterSecond).toHaveLength(1);
    expect(afterSecond[0].version).toBe(2);
  });

  it("permanently deletes announcements, resources, and questions in Appwrite client adapter", async () => {
    const ann = await handleAppwriteClientProcedure("content.announcements.create", {
      subjectId: "OLCBTQM01",
      title: "To Delete",
      body: "Will be deleted",
    });
    const delAnn = await handleAppwriteClientProcedure("content.announcements.delete", {
      id: ann.id,
    });
    expect(delAnn.success).toBe(true);

    const res = await handleAppwriteClientProcedure("content.resources.create", {
      subjectId: "OLCBTQM01",
      title: "To Delete Res",
      description: "Will be deleted",
      destinationUrl: "https://example.com",
    });
    const delRes = await handleAppwriteClientProcedure("content.resources.delete", {
      id: res.id,
    });
    expect(delRes.success).toBe(true);

    const q = await handleAppwriteClientProcedure("content.questions.create", {
      subjectId: "OLCBTQM01",
      question: "To Delete Q?",
      answer: "Will be deleted",
    });
    const delQ = await handleAppwriteClientProcedure("content.questions.delete", {
      id: q.id,
    });
    expect(delQ.success).toBe(true);
  });

  it("auto-publishes both source and target items when cross-posting a draft", async () => {
    // 1. Create a draft announcement with no cross-post targets initially
    const source = await handleAppwriteClientProcedure("content.announcements.create", {
      subjectId: "OLCBTQM01",
      title: "Draft To Auto-Publish",
      body: "Will auto-publish on cross-post",
    });

    const sourceDocBefore = await appwriteDatabases.getDocument("main", "announcements", source.id);
    expect(sourceDocBefore.publishState).toBe("draft");

    // 2. Cross-post to SEC401 without explicitly setting publishDirectly (should default to auto-publishing)
    const crossPostRes = await handleAppwriteClientProcedure("content.announcements.crossPost", {
      id: source.id,
      targetSubjectIds: ["SEC401"],
    });
    expect(crossPostRes.success).toBe(true);

    // 3. Verify source document was auto-published
    const sourceDocAfter = await appwriteDatabases.getDocument("main", "announcements", source.id);
    expect(sourceDocAfter.publishState).toBe("published");
    expect(sourceDocAfter.publishedAt).toBeDefined();

    // 4. Verify target document is published
    const targetDocs = await handleAppwriteClientProcedure("content.announcements.list", {
      subjectId: "SEC401",
    });
    const targetDoc = targetDocs.find((d: any) => d.title === "Draft To Auto-Publish");
    expect(targetDoc).toBeDefined();
    expect(targetDoc.publishState).toBe("published");
    expect(targetDoc.publishedAt).toBeDefined();
  });

  it("auto-publishes source and targets when created with targetSubjectIds", async () => {
    const created = await handleAppwriteClientProcedure("content.resources.create", {
      subjectId: "OLCBTQM01",
      title: "Auto-Published Resource",
      description: "Directly published across subjects",
      category: "syllabus",
      resourceType: "link",
      destinationUrl: "https://example.com/res",
      targetSubjectIds: ["SEC401"],
    });

    const sourceDoc = await appwriteDatabases.getDocument("main", "resources", created.id);
    expect(sourceDoc.publishState).toBe("published");

    const targetDocs = await handleAppwriteClientProcedure("content.resources.list", {
      subjectId: "SEC401",
    });
    const targetDoc = targetDocs.find((d: any) => d.title === "Auto-Published Resource");
    expect(targetDoc).toBeDefined();
    expect(targetDoc.publishState).toBe("published");
  });
});

