import { Client, Messaging, Databases, Query, ID } from "node-appwrite";
import webpush from "web-push";
import { ENV } from "./_core/env";
import { generateAiPushNotification, type GeneratePushParams, type GeneratedPushPayload } from "./_core/pushNotificationAI";

// Initialize VAPID for Web Push if keys are present
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.VITE_FIREBASE_VAPID_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@supersec.local";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn("[Push] WebPush VAPID configuration notice:", err);
  }
}

/**
 * Appwrite Messaging & Database client helper
 */
function getAppwriteServices() {
  if (!ENV.appwriteProjectId || !ENV.appwriteApiKey) {
    return null;
  }
  const client = new Client()
    .setEndpoint(ENV.appwriteEndpoint)
    .setProject(ENV.appwriteProjectId)
    .setKey(ENV.appwriteApiKey);

  return {
    messaging: new Messaging(client),
    databases: new Databases(client),
    dbId: ENV.appwriteDatabaseId,
  };
}

export interface SubscriptionRecord {
  subjectPublicId: string;
  endpoint: string;
  p256dh?: string;
  auth?: string;
  fcmToken?: string;
  firebaseUid?: string;
  preferences: {
    announcements: boolean;
    attendance: boolean;
    resources: boolean;
    qa: boolean;
  };
}

// In-memory subscription storage for high speed and local dev resilience
const inMemorySubscriptions = new Map<string, SubscriptionRecord[]>();

/**
 * Topic ID formatting for a subject: valid chars are a-z, A-Z, 0-9, period, hyphen, underscore.
 */
export function formatSubjectTopicId(subjectPublicId: string): string {
  const safeId = subjectPublicId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);
  return `subj_${safeId}`;
}

/**
 * Ensures an Appwrite Messaging Topic exists for a subject.
 */
export async function ensureSubjectTopic(
  subjectPublicId: string,
  subjectName: string
): Promise<string | null> {
  const services = getAppwriteServices();
  if (!services) return null;

  const topicId = formatSubjectTopicId(subjectPublicId);

  try {
    await services.messaging.getTopic(topicId);
    return topicId;
  } catch {
    // Topic does not exist, create it
    try {
      await services.messaging.createTopic(
        topicId,
        `${subjectName.slice(0, 80)} Updates`
      );
      return topicId;
    } catch (createErr: any) {
      console.warn(`[Appwrite Messaging] Topic creation notice for ${topicId}:`, createErr?.message || createErr);
      return topicId;
    }
  }
}

/**
 * Register a user/device subscription for a subject.
 */
export async function registerPushSubscription(sub: SubscriptionRecord): Promise<{ success: boolean }> {
  // 1. Store in memory
  const list = inMemorySubscriptions.get(sub.subjectPublicId) || [];
  const filtered = list.filter((item) => item.endpoint !== sub.endpoint);
  filtered.push(sub);
  inMemorySubscriptions.set(sub.subjectPublicId, filtered);

  // 2. Persist to Appwrite Database if available
  const services = getAppwriteServices();
  if (services) {
    try {
      const colId = "pushSubscriptions";
      // Try to find existing document for this endpoint
      const existing = await services.databases.listDocuments(services.dbId, colId, [
        Query.equal("endpoint", sub.endpoint),
        Query.equal("subjectPublicId", sub.subjectPublicId),
        Query.limit(1),
      ]);

      const docData = {
        subjectPublicId: sub.subjectPublicId,
        endpoint: sub.endpoint,
        p256dhKey: sub.p256dh || "",
        authKey: sub.auth || "",
        fcmToken: sub.fcmToken || "",
        firebaseUid: sub.firebaseUid || "",
        allowAnnouncements: sub.preferences.announcements,
        allowAttendance: sub.preferences.attendance,
        allowResources: sub.preferences.resources,
        allowQa: sub.preferences.qa,
        active: true,
      };

      if (existing.total > 0 && existing.documents[0]) {
        await services.databases.updateDocument(
          services.dbId,
          colId,
          existing.documents[0].$id,
          docData
        );
      } else {
        await services.databases.createDocument(
          services.dbId,
          colId,
          ID.unique(),
          docData
        );
      }
    } catch (err: any) {
      // Non-fatal: in-memory subscription remains active
      console.warn("[Appwrite DB] pushSubscriptions store notice:", err?.message || err);
    }

    // 3. Ensure Appwrite Topic exists
    try {
      await ensureSubjectTopic(sub.subjectPublicId, sub.subjectPublicId);
    } catch {}
  }

  return { success: true };
}

/**
 * Unregister / opt out a user/device from a subject's push notifications.
 */
export async function unregisterPushSubscription(
  subjectPublicId: string,
  endpoint: string,
  firebaseUid?: string
): Promise<{ success: boolean }> {
  // 1. Remove from in-memory
  const list = inMemorySubscriptions.get(subjectPublicId) || [];
  inMemorySubscriptions.set(
    subjectPublicId,
    list.filter((item) => item.endpoint !== endpoint && (!firebaseUid || item.firebaseUid !== firebaseUid))
  );

  // 2. Update Appwrite Database if available
  const services = getAppwriteServices();
  if (services) {
    try {
      const colId = "pushSubscriptions";
      const existing = await services.databases.listDocuments(services.dbId, colId, [
        Query.equal("endpoint", endpoint),
        Query.equal("subjectPublicId", subjectPublicId),
      ]);
      for (const doc of existing.documents) {
        await services.databases.updateDocument(services.dbId, colId, doc.$id, {
          active: false,
        });
      }
    } catch (err: any) {
      console.warn("[Appwrite DB] pushSubscriptions unsubscribe notice:", err?.message || err);
    }
  }

  return { success: true };
}

/**
 * Check if an endpoint or Firebase UID is actively subscribed to a subject.
 */
export async function getSubjectSubscriptionStatus(
  subjectPublicId: string,
  endpoint?: string,
  firebaseUid?: string
): Promise<{ subscribed: boolean; preferences?: SubscriptionRecord["preferences"] }> {
  // Check in-memory first
  const list = inMemorySubscriptions.get(subjectPublicId) || [];
  const found = list.find(
    (item) => (endpoint && item.endpoint === endpoint) || (firebaseUid && item.firebaseUid === firebaseUid)
  );

  if (found) {
    return { subscribed: true, preferences: found.preferences };
  }

  // Check database
  const services = getAppwriteServices();
  if (services && (endpoint || firebaseUid)) {
    try {
      const queries = [
        Query.equal("subjectPublicId", subjectPublicId),
        Query.equal("active", true),
        Query.limit(1),
      ];
      if (endpoint) queries.push(Query.equal("endpoint", endpoint));
      else if (firebaseUid) queries.push(Query.equal("firebaseUid", firebaseUid));

      const res = await services.databases.listDocuments(services.dbId, "pushSubscriptions", queries);
      if (res.total > 0 && res.documents[0]) {
        const doc = res.documents[0] as any;
        return {
          subscribed: true,
          preferences: {
            announcements: doc.allowAnnouncements ?? true,
            attendance: doc.allowAttendance ?? true,
            resources: doc.allowResources ?? true,
            qa: doc.allowQa ?? true,
          },
        };
      }
    } catch {}
  }

  return { subscribed: false };
}

/**
 * Send an immediate test push notification directly to an endpoint.
 */
export async function sendTestPushNotification(
  endpoint: string,
  p256dh?: string,
  auth?: string,
  subjectName?: string
): Promise<{ success: boolean; message: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return {
      success: true,
      message: "Test notification simulated (configure VAPID keys for direct delivery).",
    };
  }

  if (!p256dh || !auth) {
    return { success: false, message: "Missing p256dh or auth keys for Web Push." };
  }

  try {
    const payload = JSON.stringify({
      title: "🎉 Notifications Enabled!",
      body: `You'll now receive instant alerts for ${subjectName || "this subject"}.`,
      icon: "/apple-touch-icon.png",
      badge: "/favicon-32x32.png",
      url: "/",
    });

    await webpush.sendNotification(
      {
        endpoint,
        keys: { p256dh, auth },
      },
      payload
    );

    return { success: true, message: "Test notification delivered successfully!" };
  } catch (err: any) {
    console.warn("[Push] Direct webpush send test failed:", err?.message || err);
    return { success: false, message: err?.message || "Failed to deliver push notification." };
  }
}

/**
 * Dispatches an automated AI-generated push notification for a subject.
 * Runs asynchronously and never throws so publishing workflows are never blocked.
 */
export async function dispatchAutomatedPush(
  params: GeneratePushParams
): Promise<{ success: boolean; payload: GeneratedPushPayload }> {
  // 1. Generate AI payload (with guaranteed fallback)
  const payload = await generateAiPushNotification(params);

  // Run dispatch in background
  (async () => {
    try {
      const topicId = formatSubjectTopicId(params.actionUrl.split("/")[2] || "general");

      // 2. Dispatch via Appwrite Messaging if enabled
      const services = getAppwriteServices();
      if (services) {
        try {
          await services.messaging.createPush(
            ID.unique(),
            payload.title,
            payload.body,
            [topicId],
            undefined, // users
            undefined, // targets
            { url: payload.actionUrl, type: params.type },
            payload.actionUrl
          );
        } catch (msgErr: any) {
          // Non-fatal if FCM provider not yet linked in Appwrite Console
          console.warn("[Appwrite Messaging] createPush notice:", msgErr?.message || msgErr);
        }
      }

      // 3. Dispatch directly to active Web Push subscribers in memory / DB
      const subjectPublicId = params.actionUrl.split("/")[2];
      if (subjectPublicId && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        const subscribers = inMemorySubscriptions.get(subjectPublicId) || [];
        const pushPayloadStr = JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: "/apple-touch-icon.png",
          badge: "/favicon-32x32.png",
          url: payload.actionUrl,
          data: {
            url: payload.actionUrl,
            type: params.type,
          },
        });

        for (const sub of subscribers) {
          // Check preferences
          const prefKey =
            params.type === "no_class" ? "attendance" : params.type;
          if (sub.preferences && sub.preferences[prefKey as keyof typeof sub.preferences] === false) {
            continue;
          }

          if (sub.endpoint && sub.p256dh && sub.auth) {
            webpush
              .sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                pushPayloadStr
              )
              .catch((sendErr) => {
                console.warn("[WebPush] Subscriber dispatch failed:", sendErr?.message || sendErr);
              });
          }
        }
      }
    } catch (bgErr) {
      console.warn("[Push] Automated background dispatch notice:", bgErr);
    }
  })();

  return { success: true, payload };
}
