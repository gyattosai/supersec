import { describe, it, expect } from "vitest";
import {
  generateFallbackPushPayload,
  generateAiPushNotification,
  type GeneratePushParams,
} from "./_core/pushNotificationAI";
import {
  formatSubjectTopicId,
  registerPushSubscription,
  unregisterPushSubscription,
  getSubjectSubscriptionStatus,
} from "./pushNotifications";
import { appRouter } from "./routers";

describe("Push Notification AI Synthesizer", () => {
  it("synthesizes bounded payload for Announcements", async () => {
    const params: GeneratePushParams = {
      type: "announcement",
      title: "Midterm Exam Room Assignments and Final Guidelines for Next Week",
      detail: "Please be informed that the exam will take place in Room 402. Bring your scientific calculators and pencils.",
      subjectName: "Operating Systems",
      subjectCode: "CS 311",
      actionUrl: "/s/cs311/a/announcement-1",
    };

    const payload = await generateAiPushNotification(params);
    expect(payload.title).toContain("📢");
    expect(payload.title.length).toBeLessThanOrEqual(55);
    expect(payload.body.length).toBeLessThanOrEqual(130);
    expect(payload.actionUrl).toBe("/s/cs311/a/announcement-1");
  });

  it("synthesizes bounded payload for No-Class suspensions", async () => {
    const params: GeneratePushParams = {
      type: "no_class",
      title: "Class Suspended",
      detail: "Due to heavy typhoon rainfall and transport strike",
      subjectName: "Software Engineering",
      subjectCode: "SE 201",
      actionUrl: "/s/se201/attendance",
      extraContext: "Severe weather warning issued by PAGASA",
    };

    const payload = await generateAiPushNotification(params);
    expect(payload.title).toContain("⚠️");
    expect(payload.title.length).toBeLessThanOrEqual(55);
    expect(payload.body.length).toBeLessThanOrEqual(130);
  });

  it("synthesizes bounded payload for Published Attendance", async () => {
    const params: GeneratePushParams = {
      type: "attendance",
      title: "September 8 Session",
      detail: "Roll call confirmed with 38 present, 2 late, 1 absent.",
      subjectName: "Database Systems",
      subjectCode: "CS 220",
      actionUrl: "/s/cs220/attendance/session-1",
    };

    const payload = await generateAiPushNotification(params);
    expect(payload.title).toContain("📋");
    expect(payload.title.length).toBeLessThanOrEqual(55);
    expect(payload.body.length).toBeLessThanOrEqual(130);
  });

  it("synthesizes bounded payload for Resources", async () => {
    const params: GeneratePushParams = {
      type: "resource",
      title: "Chapter 4 Slide Deck & Lab Source Code",
      detail: "Review slides covering process synchronization and semaphores before tomorrow.",
      subjectName: "Operating Systems",
      subjectCode: "CS 311",
      actionUrl: "/s/cs311/r/res-4",
    };

    const payload = await generateAiPushNotification(params);
    expect(payload.title).toContain("📚");
    expect(payload.title.length).toBeLessThanOrEqual(55);
    expect(payload.body.length).toBeLessThanOrEqual(130);
  });

  it("synthesizes bounded payload for Q&A answers", async () => {
    const params: GeneratePushParams = {
      type: "qa",
      title: "How do we handle memory leaks in circular references?",
      detail: "WeakMap or manual dereferencing should be used in the cleanup handler.",
      subjectName: "Web Development",
      subjectCode: "IT 104",
      actionUrl: "/s/it104/q/question-9",
    };

    const payload = await generateAiPushNotification(params);
    expect(payload.title).toContain("💡");
    expect(payload.title.length).toBeLessThanOrEqual(55);
    expect(payload.body.length).toBeLessThanOrEqual(130);
  });

  it("strictly bounds oversized inputs in fallback generation", () => {
    const longString = "A".repeat(1000);
    const params: GeneratePushParams = {
      type: "announcement",
      title: longString,
      detail: longString,
      subjectName: "Very Long Subject Name That Should Still Fit",
      subjectCode: "LONG-999",
      actionUrl: "/s/long/a/1",
      extraContext: longString,
    };

    const fallback = generateFallbackPushPayload(params);
    expect(fallback.title.length).toBeLessThanOrEqual(48);
    expect(fallback.body.length).toBeLessThanOrEqual(115);
  });
});

describe("Push Notification Services & Store", () => {
  it("formats Appwrite topic IDs safely", () => {
    expect(formatSubjectTopicId("cs-101")).toBe("subj_cs-101");
    expect(formatSubjectTopicId("CS 101/Intro!")).toBe("subj_CS_101_Intro_");
    expect(formatSubjectTopicId("a".repeat(100)).length).toBeLessThanOrEqual(41);
  });

  it("manages push subscriptions lifecycle in memory & db fallback", async () => {
    const testEndpoint = "https://fcm.googleapis.com/fcm/send/test-device-token-123";
    const sub = await registerPushSubscription({
      subjectPublicId: "test-subj-101",
      endpoint: testEndpoint,
      p256dh: "test-p256dh-key",
      auth: "test-auth-key",
      firebaseUid: "anon-firebase-uid-abc",
      fcmToken: "fcm-device-token-xyz",
      preferences: {
        announcements: true,
        attendance: true,
        resources: false,
        qa: true,
      },
    });

    expect(sub.success).toBe(true);

    // Query status
    const status = await getSubjectSubscriptionStatus("test-subj-101", testEndpoint);
    expect(status.subscribed).toBe(true);
    expect(status.preferences?.resources).toBe(false);
    expect(status.preferences?.announcements).toBe(true);

    // Unsubscribe
    await unregisterPushSubscription("test-subj-101", testEndpoint);
    const postUnsubStatus = await getSubjectSubscriptionStatus("test-subj-101", testEndpoint);
    expect(postUnsubStatus.subscribed).toBe(false);
  });
});

describe("Push tRPC Router", () => {
  const caller = appRouter.createCaller({
    req: {} as any,
    res: {} as any,
    user: null,
  });

  it("provides previewAi procedure for content items", async () => {
    const preview = await caller.push.previewAi({
      type: "announcement",
      title: "Preliminary Exam Schedule",
      detail: "Exam starts next Monday at 9:00 AM.",
      subjectName: "Discrete Mathematics",
      subjectCode: "MATH 102",
      actionUrl: "/s/math102",
    });

    expect(preview.title).toBeDefined();
    expect(preview.body).toBeDefined();
    expect(preview.title.length).toBeLessThanOrEqual(55);
    expect(preview.body.length).toBeLessThanOrEqual(130);
  });

  it("handles push.status query for unknown endpoints gracefully", async () => {
    const status = await caller.push.status({
      subjectPublicId: "non-existent-subject",
      endpoint: "https://example.com/unregistered",
    });

    expect(status.subscribed).toBe(false);
  });
});
