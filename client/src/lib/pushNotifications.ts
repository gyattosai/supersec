import { ensureAnonymousFirebaseUser, getFirebaseFcmToken } from "./firebase";

export interface PushPreferences {
  announcements: boolean;
  attendance: boolean;
  resources: boolean;
  qa: boolean;
}

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  announcements: true,
  attendance: true,
  resources: true,
  qa: true,
};

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (!isPushNotificationSupported()) return "denied";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error("[Push] Service Worker registration failed:", err);
    return null;
  }
}

export interface BrowserPushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function subscribeToBrowserPush(vapidPublicKey?: string): Promise<BrowserPushSubscriptionData | null> {
  if (!isPushNotificationSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Push notification permissions were not granted.");
  }

  const reg = await registerServiceWorker();
  if (!reg) {
    throw new Error("Could not register push notification service worker.");
  }

  // Get existing or create new subscription
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
    };
    if (vapidPublicKey) {
      subscribeOptions.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource;
    }
    sub = await reg.pushManager.subscribe(subscribeOptions);
  }

  const rawKey = sub.getKey ? sub.getKey("p256dh") : null;
  const rawAuth = sub.getKey ? sub.getKey("auth") : null;

  const p256dh = arrayBufferToBase64(rawKey);
  const auth = arrayBufferToBase64(rawAuth);

  return {
    endpoint: sub.endpoint,
    p256dh,
    auth,
  };
}

export async function unsubscribeFromBrowserPush(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        return await sub.unsubscribe();
      }
    }
    return true;
  } catch (err) {
    console.warn("[Push] Error during browser unsubscribe:", err);
    return false;
  }
}

// === Local Storage Preferences & Subscription State Cache ===

const STORAGE_PREFIX = "supersec_push_sub_";
const PREFS_PREFIX = "supersec_push_prefs_";

export function isSubjectSubscribedLocally(subjectPublicId: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(`${STORAGE_PREFIX}${subjectPublicId}`) === "true";
}

export function setSubjectSubscribedLocally(subjectPublicId: string, subscribed: boolean) {
  if (typeof localStorage === "undefined") return;
  if (subscribed) {
    localStorage.setItem(`${STORAGE_PREFIX}${subjectPublicId}`, "true");
  } else {
    localStorage.removeItem(`${STORAGE_PREFIX}${subjectPublicId}`);
  }
}

export function getSubjectPushPreferences(subjectPublicId: string): PushPreferences {
  if (typeof localStorage === "undefined") return DEFAULT_PUSH_PREFERENCES;
  try {
    const stored = localStorage.getItem(`${PREFS_PREFIX}${subjectPublicId}`);
    if (stored) return { ...DEFAULT_PUSH_PREFERENCES, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_PUSH_PREFERENCES;
}

export function saveSubjectPushPreferences(subjectPublicId: string, prefs: PushPreferences) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${PREFS_PREFIX}${subjectPublicId}`, JSON.stringify(prefs));
  } catch {}
}
