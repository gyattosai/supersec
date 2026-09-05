import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from "firebase/auth";
import { getMessaging, getToken, isSupported as isMessagingSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const fbApp = getFirebaseApp();
  if (!fbApp) return null;
  if (!auth) {
    auth = getAuth(fbApp);
  }
  return auth;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const fbApp = getFirebaseApp();
  if (!fbApp) return null;
  const supported = await isMessagingSupported().catch(() => false);
  if (!supported) return null;
  if (!messaging) {
    try {
      messaging = getMessaging(fbApp);
    } catch (err) {
      console.warn("[Firebase] Messaging initialization failed:", err);
      return null;
    }
  }
  return messaging;
}

/**
 * Ensures an anonymous user session exists in Firebase Auth.
 * If Firebase is not configured, provides a persistent local anonymous ID.
 */
export async function ensureAnonymousFirebaseUser(): Promise<{ uid: string; idToken?: string }> {
  const fbAuth = getFirebaseAuth();
  if (fbAuth) {
    try {
      if (fbAuth.currentUser) {
        const idToken = await fbAuth.currentUser.getIdToken().catch(() => undefined);
        return { uid: fbAuth.currentUser.uid, idToken };
      }
      const cred = await signInAnonymously(fbAuth);
      const idToken = await cred.user.getIdToken().catch(() => undefined);
      return { uid: cred.user.uid, idToken };
    } catch (err) {
      console.warn("[Firebase Auth] Anonymous sign in failed, falling back to local ID:", err);
    }
  }

  // Fallback persistent local ID
  const localKey = "supersec_anon_device_id";
  let localId = typeof localStorage !== "undefined" ? localStorage.getItem(localKey) : null;
  if (!localId) {
    localId = "anon_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(localKey, localId);
    }
  }
  return { uid: localId };
}

/**
 * Retrieves an FCM registration token if Firebase Messaging and VAPID key are configured.
 */
export async function getFirebaseFcmToken(): Promise<string | null> {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  try {
    const msg = await getFirebaseMessaging();
    if (!msg) return null;
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: registration });
    return token;
  } catch (err) {
    console.warn("[Firebase Messaging] Could not get FCM registration token:", err);
    return null;
  }
}
