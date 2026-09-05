import React, { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  BellOff,
  Check,
  Smartphone,
  Shield,
  Loader2,
  Sparkles,
  Info,
  Radio,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToBrowserPush,
  unsubscribeFromBrowserPush,
  isSubjectSubscribedLocally,
  setSubjectSubscribedLocally,
  getSubjectPushPreferences,
  saveSubjectPushPreferences,
  type PushPreferences,
  DEFAULT_PUSH_PREFERENCES,
} from "@/lib/pushNotifications";
import { ensureAnonymousFirebaseUser, getFirebaseFcmToken } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export interface PushNotificationSubscribeButtonProps {
  subjectPublicId: string;
  subjectName: string;
  subjectCode: string;
  variant?: "button" | "pill" | "icon" | "card";
  className?: string;
}

export function PushNotificationSubscribeButton({
  subjectPublicId,
  subjectName,
  subjectCode,
  variant = "button",
  className = "",
}: PushNotificationSubscribeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULT_PUSH_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);

  // tRPC mutations (with safe fallbacks for partial-mock and SSR test environments)
  const subscribeMutation = trpc.push?.subscribe?.useMutation
    ? trpc.push.subscribe.useMutation()
    : ({ mutateAsync: async () => ({}) } as any);
  const unsubscribeMutation = trpc.push?.unsubscribe?.useMutation
    ? trpc.push.unsubscribe.useMutation()
    : ({ mutateAsync: async () => ({}) } as any);
  const testNotificationMutation = trpc.push?.testNotification?.useMutation
    ? trpc.push.testNotification.useMutation()
    : ({ mutateAsync: async () => ({}) } as any);

  useEffect(() => {
    const isSup = isPushNotificationSupported();
    setSupported(isSup);
    if (isSup) {
      setPermission(getNotificationPermission());
      setIsSubscribed(isSubjectSubscribedLocally(subjectPublicId));
      setPreferences(getSubjectPushPreferences(subjectPublicId));
    }
  }, [subjectPublicId]);

  if (!supported) {
    return null;
  }

  const handleOpenDialog = async () => {
    setLoading(true);
    try {
      const fbUser = await ensureAnonymousFirebaseUser();
      setFirebaseUid(fbUser.uid);
    } catch (err) {
      console.warn("[Push] Anonymous Firebase session notice:", err);
    } finally {
      setLoading(false);
      setIsOpen(true);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 1. Request browser permission and obtain Web Push subscription
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const subData = await subscribeToBrowserPush(vapidKey);
      if (!subData) {
        throw new Error("Could not initialize push notification client.");
      }

      setPermission("granted");

      // 2. Ensure Firebase Auth anonymous session
      const fbUser = await ensureAnonymousFirebaseUser();
      setFirebaseUid(fbUser.uid);

      // 3. Optional FCM token
      const fcmToken = await getFirebaseFcmToken().catch(() => null);

      // 4. Register with Appwrite & backend
      await subscribeMutation.mutateAsync({
        subjectPublicId,
        endpoint: subData.endpoint,
        p256dh: subData.p256dh,
        auth: subData.auth,
        fcmToken: fcmToken || undefined,
        firebaseUid: fbUser.uid,
        preferences,
      });

      // 5. Update local state
      setIsSubscribed(true);
      setSubjectSubscribedLocally(subjectPublicId, true);
      saveSubjectPushPreferences(subjectPublicId, preferences);

      toast.success("Subscribed to Class Alerts!", {
        description: `You will now receive instant push updates for ${subjectCode}.`,
      });

      // 6. Send optional test push
      testNotificationMutation.mutate({
        endpoint: subData.endpoint,
        p256dh: subData.p256dh,
        auth: subData.auth,
        subjectName: `${subjectCode} — ${subjectName}`,
      });

      setIsOpen(false);
    } catch (err: any) {
      console.error("[Push] Subscribe error:", err);
      const msg = err?.message || "Failed to enable notifications.";
      if (Notification.permission === "denied") {
        setPermission("denied");
        toast.error("Notifications Blocked", {
          description: "Please unblock notifications in your browser address bar settings.",
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribeFromBrowserPush();
      if (firebaseUid) {
        await unsubscribeMutation.mutateAsync({
          subjectPublicId,
          endpoint: "local",
          firebaseUid,
        });
      }

      setIsSubscribed(false);
      setSubjectSubscribedLocally(subjectPublicId, false);

      toast.success("Unsubscribed from Notifications", {
        description: `You will no longer receive push alerts for ${subjectCode}.`,
      });
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to unsubscribe.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = () => {
    saveSubjectPushPreferences(subjectPublicId, preferences);
    toast.success("Preferences Saved", {
      description: "Your notification category settings have been updated.",
    });
    setIsOpen(false);
  };

  // Render variant: Card
  if (variant === "card") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-5 shadow-sm ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            {isSubscribed ? <BellRing className="size-5" /> : <Bell className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 bg-primary/15 text-primary text-[10px] font-extrabold uppercase tracking-wider">
                Instant Alerts
              </Badge>
              {isSubscribed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              )}
            </div>
            <h3 className="mt-1 text-sm sm:text-base font-black tracking-tight text-foreground">
              {isSubscribed ? "Notifications Enabled" : "Never Miss Class Updates"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {isSubscribed
                ? `You are receiving automated push alerts whenever ${subjectCode} publishes announcements, attendance, or resources.`
                : `Get instant phone and desktop alerts for urgent class announcements, no-class notices, lecture resources, and attendance.`}
            </p>
            <div className="mt-3.5 flex items-center gap-2">
              <Button
                onClick={handleOpenDialog}
                size="sm"
                className="font-bold text-xs rounded-xl shadow-sm"
              >
                {isSubscribed ? "Manage Preferences" : "Enable Push Notifications"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render variant: Icon only
  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleOpenDialog}
          aria-label="Push notifications"
          className={`relative grid size-9 place-items-center rounded-xl border border-border/80 bg-background/80 hover:bg-secondary/60 text-foreground transition-all ${className}`}
        >
          {isSubscribed ? (
            <>
              <BellRing className="size-4 text-primary" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </>
          ) : (
            <Bell className="size-4 text-muted-foreground hover:text-foreground" />
          )}
        </button>
        {renderDialog()}
      </>
    );
  }

  // Render variant: Pill or Standard Button
  return (
    <>
      <button
        onClick={handleOpenDialog}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
          isSubscribed
            ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : permission === "denied"
            ? "border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            : "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 shadow-sm"
        } ${className}`}
      >
        {isSubscribed ? (
          <>
            <span className="relative flex size-2 shrink-0 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
            </span>
            <BellRing className="size-3.5" />
            <span>Alerts On</span>
          </>
        ) : permission === "denied" ? (
          <>
            <BellOff className="size-3.5" />
            <span>Alerts Blocked</span>
          </>
        ) : (
          <>
            <Bell className="size-3.5" />
            <span>Get Class Alerts</span>
          </>
        )}
      </button>

      {renderDialog()}
    </>
  );

  function renderDialog() {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                {isSubscribed ? <BellRing className="size-5" /> : <Bell className="size-5" />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight">
                  {isSubscribed ? "Notification Settings" : "Subscribe to Class Alerts"}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground truncate">
                  {subjectCode} • {subjectName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-xs">
            {permission === "denied" && (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300">
                <p className="font-bold flex items-center gap-1.5 text-xs">
                  <Info className="size-4 shrink-0" />
                  Notifications Are Blocked in Your Browser
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-300/90">
                  To receive updates, click the site settings icon (padlock/tune) next to the URL in your browser address bar and set Notifications to <strong>Allow</strong>.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">📢 Announcements & Urgents</p>
                  <p className="text-[11px] text-muted-foreground">Urgent notices and class broadcasts</p>
                </div>
                <Switch
                  checked={preferences.announcements}
                  onCheckedChange={(val) => setPreferences((p) => ({ ...p, announcements: val }))}
                />
              </div>

              <div className="h-px bg-border/60" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">⚠️ Attendance & No-Class Notices</p>
                  <p className="text-[11px] text-muted-foreground">Class cancellations and verified rosters</p>
                </div>
                <Switch
                  checked={preferences.attendance}
                  onCheckedChange={(val) => setPreferences((p) => ({ ...p, attendance: val }))}
                />
              </div>

              <div className="h-px bg-border/60" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">📚 Resources & Materials</p>
                  <p className="text-[11px] text-muted-foreground">New lecture slides, syllabi, and handouts</p>
                </div>
                <Switch
                  checked={preferences.resources}
                  onCheckedChange={(val) => setPreferences((p) => ({ ...p, resources: val }))}
                />
              </div>

              <div className="h-px bg-border/60" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">💡 Q&A Answers & Forum</p>
                  <p className="text-[11px] text-muted-foreground">Replies to subject inquiries</p>
                </div>
                <Switch
                  checked={preferences.qa}
                  onCheckedChange={(val) => setPreferences((p) => ({ ...p, qa: val }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
              <Shield className="size-3.5 text-primary shrink-0" />
              <span>Zero-friction setup. Powered by Firebase Auth & Appwrite Push.</span>
            </div>
          </div>

          <DialogFooter className="mt-5 flex flex-col sm:flex-row gap-2">
            {isSubscribed ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnsubscribe}
                  disabled={loading}
                  className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                >
                  {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <BellOff className="size-3.5 mr-1.5" />}
                  Opt Out
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePreferences}
                  disabled={loading}
                  className="rounded-xl font-bold ml-auto"
                >
                  Save Settings
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full rounded-xl font-bold shadow-md shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Enabling Notifications...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Enable Notifications (1-Click)
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
