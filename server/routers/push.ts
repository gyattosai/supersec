import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  getSubjectSubscriptionStatus,
  sendTestPushNotification,
  dispatchAutomatedPush,
} from "../pushNotifications";
import { generateAiPushNotification } from "../_core/pushNotificationAI";

const preferencesSchema = z.object({
  announcements: z.boolean().default(true),
  attendance: z.boolean().default(true),
  resources: z.boolean().default(true),
  qa: z.boolean().default(true),
});

export const pushRouter = router({
  /**
   * Subscribe a browser/device to a subject's push notifications.
   */
  subscribe: publicProcedure
    .input(
      z.object({
        subjectPublicId: z.string().min(4).max(36),
        endpoint: z.string().url().max(1024),
        p256dh: z.string().max(256).optional(),
        auth: z.string().max(128).optional(),
        fcmToken: z.string().max(512).optional(),
        firebaseUid: z.string().max(128).optional(),
        preferences: preferencesSchema.default({
          announcements: true,
          attendance: true,
          resources: true,
          qa: true,
        }),
      })
    )
    .mutation(async ({ input }) => {
      const result = await registerPushSubscription({
        subjectPublicId: input.subjectPublicId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        fcmToken: input.fcmToken,
        firebaseUid: input.firebaseUid,
        preferences: input.preferences,
      });
      return result;
    }),

  /**
   * Unsubscribe / opt-out from a subject's push notifications.
   */
  unsubscribe: publicProcedure
    .input(
      z.object({
        subjectPublicId: z.string().min(4).max(36),
        endpoint: z.string().url().max(1024),
        firebaseUid: z.string().max(128).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await unregisterPushSubscription(
        input.subjectPublicId,
        input.endpoint,
        input.firebaseUid
      );
      return result;
    }),

  /**
   * Check subscription status for the current visitor.
   */
  status: publicProcedure
    .input(
      z.object({
        subjectPublicId: z.string().min(4).max(36),
        endpoint: z.string().url().max(1024).optional(),
        firebaseUid: z.string().max(128).optional(),
      })
    )
    .query(async ({ input }) => {
      return getSubjectSubscriptionStatus(
        input.subjectPublicId,
        input.endpoint,
        input.firebaseUid
      );
    }),

  /**
   * Trigger an immediate test notification to confirm device receipt.
   */
  testNotification: publicProcedure
    .input(
      z.object({
        endpoint: z.string().url().max(1024),
        p256dh: z.string().max(256).optional(),
        auth: z.string().max(128).optional(),
        subjectName: z.string().max(160).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return sendTestPushNotification(
        input.endpoint,
        input.p256dh,
        input.auth,
        input.subjectName
      );
    }),

  /**
   * Preview AI-generated notification title & summary before publishing.
   */
  previewAi: publicProcedure
    .input(
      z.object({
        type: z.enum(["announcement", "resource", "attendance", "qa", "no_class"]),
        title: z.string().max(220),
        detail: z.string().max(2000).optional().nullable(),
        subjectName: z.string().max(160),
        subjectCode: z.string().max(64),
        actionUrl: z.string().max(512),
      })
    )
    .query(async ({ input }) => {
      return generateAiPushNotification({
        type: input.type,
        title: input.title,
        detail: input.detail,
        subjectName: input.subjectName,
        subjectCode: input.subjectCode,
        actionUrl: input.actionUrl,
      });
    }),
});
