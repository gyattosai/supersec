import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { formatDateTime12Hour } from "@/lib/time";
import {
  CalendarX,
  ArrowLeft,
  Copy,
  ExternalLink,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Check,
  Save,
  Clock,
  Sparkles,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

const PRESET_REASONS = [
  "Typhoon / Severe Weather Suspension",
  "University Administrative Order",
  "Professor Official Travel / Academic Leave",
  "National / Local Official Holiday",
  "Campus Facility Maintenance / Power Interruption",
  "Special University Event / Convocation",
];

export default function NoClassSessionEditPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/attendance/:sessionId/no-class");
  const sessionId = params?.sessionId ?? "";
  const numSessionId = Number(sessionId);
  const isNumeric = !isNaN(numSessionId) && numSessionId > 0;
  const validSession = Boolean(sessionId && sessionId !== "0" && sessionId !== "NaN");
  const sessionQueryParam = (isNumeric ? numSessionId : sessionId) as any;

  const utils = trpc.useUtils();
  const session = trpc.attendance.session.useQuery(
    { sessionId: sessionQueryParam },
    { enabled: validSession }
  );

  const subject = trpc.subjects.get.useQuery(
    { subjectId: session.data?.subjectId as any },
    { enabled: Boolean(session.data?.subjectId) }
  );

  const [reasonDraft, setReasonDraft] = useState("");
  const [copied, setCopied] = useState(false);

  // Initialize draft reason once session data is loaded
  useEffect(() => {
    if (session.data) {
      setReasonDraft((session.data as any)?.noClassReason || "");
    }
  }, [session.data]);

  const setNoClass = trpc.subjects.sessions.setNoClass.useMutation({
    onSuccess: () => {
      utils.attendance.session.invalidate({ sessionId: sessionQueryParam });
      utils.subjects.sessions.list.invalidate();
      if (session.data?.publicId) {
        utils.foundation.publicAttendance.invalidate({ publicId: session.data.publicId });
      }
      toast.success("No Class notice updated successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteSession = trpc.attendance.deleteSession.useMutation({
    onSuccess: () => {
      utils.subjects.sessions.list.invalidate();
      toast.success("Session deleted");
      const targetSubId = session.data?.subjectId || subject.data?.id;
      if (targetSubId) {
        setLocation(`/app/subjects/${targetSubId}/attendance`);
      } else {
        setLocation("/app/subjects");
      }
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleCopyLink = () => {
    if (!session.data?.publicId) return;
    const url = `${window.location.origin}/attendance/${session.data.publicId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Public notice link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonDraft.trim()) {
      toast.error("Please enter a reason for the class suspension");
      return;
    }
    setNoClass.mutate({
      sessionId: sessionQueryParam,
      noClass: true,
      reason: reasonDraft.trim(),
      publish: true,
    });
  };

  const handleRestoreClass = () => {
    setNoClass.mutate(
      {
        sessionId: sessionQueryParam,
        noClass: false,
        publish: true,
      },
      {
        onSuccess: () => {
          toast.success("Class session restored to normal");
          setLocation(`/app/attendance/${sessionId}`);
        },
      }
    );
  };

  const subjectId = session.data?.subjectId || subject.data?.id;
  const backHref = subjectId
    ? `/app/subjects/${subjectId}/attendance`
    : "/app/subjects";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className="signal-action inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <ArrowLeft className="size-3.5" />
            Back to Schedule &amp; Attendance
          </Link>
        </div>

        {/* Page Header */}
        <WorkspacePageHeader
          title="No Class Session Notice"
          kicker={subject.data?.code ? `${subject.data.code} · ${subject.data.name}` : undefined}
          action={
            <div className="flex flex-wrap items-center gap-2.5">
              {session.data?.publicId && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="gap-2 rounded-xl text-xs font-bold"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    Copy Notice Link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="gap-2 rounded-xl text-xs font-bold"
                  >
                    <a
                      href={`/attendance/${session.data.publicId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-3.5" />
                      View Public Notice
                    </a>
                  </Button>
                </>
              )}
            </div>
          }
        >
          {session.data && (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 min-h-6 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-amber-500 dark:bg-amber-400" />
                <span>Notice Active · Class Suspended</span>
              </span>
              {session.data.startsAt && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Clock className="size-3.5" />
                  {formatDateTime12Hour(session.data.startsAt)}
                </span>
              )}
            </div>
          )}
        </WorkspacePageHeader>

        {/* Notice Reason Editor Card */}
        <section className="rounded-2xl border border-amber-500/30 bg-card p-5 sm:p-6 shadow-md shadow-amber-950/5 space-y-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
              <CalendarX className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Suspension Notice &amp; Reason
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Provide a clear reason for students. This reason appears on the public attendance notice page and alerts students that regular roll call is waived.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveReason} className="space-y-4">
            <div>
              <label htmlFor="no-class-reason" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Official Reason
              </label>
              <textarea
                id="no-class-reason"
                rows={3}
                maxLength={255}
                value={reasonDraft}
                onChange={e => setReasonDraft(e.target.value)}
                placeholder="e.g., Heavy Typhoon / Class Suspension ordered by University Admin"
                className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all resize-none"
              />
              <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1">
                <span>Select a preset below or enter a custom reason</span>
                <span className={reasonDraft.length > 240 ? "text-amber-400 font-bold" : ""}>
                  {reasonDraft.length} / 255
                </span>
              </div>
            </div>

            {/* Quick Reason Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground">Quick Presets:</span>
              <div className="flex flex-wrap gap-2">
                {PRESET_REASONS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReasonDraft(preset)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      reasonDraft === preset
                        ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-sm"
                        : "border-border/80 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="submit"
                disabled={setNoClass.isPending || !reasonDraft.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md shadow-amber-600/20 gap-2"
              >
                <Save className="size-4" />
                {setNoClass.isPending ? "Saving…" : "Save Notice Changes"}
              </Button>
            </div>
          </form>
        </section>

        {/* Public Notice Live Preview & Share Card */}
        {session.data?.publicId && (
          <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Share2 className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    Public Notice Link for Students
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Share this link in group chats or announcements. Students will see the suspension notice and waived attendance rules.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
                Live &amp; Accessible
              </Badge>
            </div>

            {/* Live Card Preview */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-amber-500 dark:bg-amber-400" />
                  No Class
                </span>
                <span className="text-xs font-bold text-muted-foreground font-mono">
                  {formatDateTime12Hour(session.data.startsAt)}
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {reasonDraft || (session.data as any)?.noClassReason || "Class suspended"}
              </p>
              <p className="text-xs text-muted-foreground">
                Regular roll call is waived for this date.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="gap-2 rounded-xl font-semibold"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                Copy Public URL
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="gap-2 rounded-xl font-semibold"
              >
                <a
                  href={`/attendance/${session.data.publicId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Open Live Notice Page
                </a>
              </Button>
            </div>
          </section>
        )}

        {/* Lifecycle Management / Danger Zone */}
        <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            Session Lifecycle Controls
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Restore to Class */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <RotateCcw className="size-4 text-primary" />
                  Restore to Normal Class
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Re-opens regular attendance taking for this session. Roll call, Zoom proof, and excuse submissions will become active.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={setNoClass.isPending}
                    className="self-start rounded-xl font-semibold gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    Restore Class Session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore this session to a normal class?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the No Class notice and restore regular attendance tracking for{" "}
                      <strong>{session.data?.startsAt ? formatDateTime12Hour(session.data.startsAt) : "this session"}</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestoreClass} className="bg-primary text-primary-foreground">
                      Restore Normal Class
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Permanently Delete */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-destructive flex items-center gap-2">
                  <Trash2 className="size-4" />
                  Delete Session
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Permanently deletes this class session date from your subject schedule and removes its public notice.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteSession.isPending}
                    className="self-start rounded-xl font-semibold gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    Delete Permanently
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this session completely?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This session and its public URL will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteSession.mutate({ sessionId: sessionQueryParam })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
