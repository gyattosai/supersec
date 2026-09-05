import DashboardLayout from "@/components/DashboardLayout";
import { Time12HourInput, DateTime12HourInput } from "@/components/TimeInputs";
import { formatDateTime12Hour, formatTimeRange12Hour } from "@/lib/time";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { BulkActionBar, BulkCheckbox } from "@/components/BulkActionBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { attendanceWorkspacePath } from "@/lib/attendanceWorkspace";
import { ArrowLeft, ArrowRight, CalendarDays, CalendarX, Copy, ExternalLink, Pencil, Plus, Trash2, ArrowUpDown, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, Redirect, useLocation, useRoute } from "wouter";

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Composer = "session" | "no-class" | null;
type SessionSortMode = "newest" | "oldest" | "no_class";

export const NO_CLASS_PRESETS = [
  { label: "🏛️ Holiday", reason: "Declared National / Official Holiday" },
  { label: "⛈️ Weather / Typhoon", reason: "Inclement Weather / Typhoon Suspension" },
  { label: "🎓 Campus Event", reason: "University / Institutional Activity" },
  { label: "✈️ Faculty Official Business", reason: "Faculty Official Business / Conference" },
  { label: "📝 Exam Week", reason: "Midterm / Final Examination Week" },
  { label: "⚡ Maintenance", reason: "Campus Power / Facility Maintenance" },
  { label: "🏥 Emergency", reason: "Health / Emergency Suspension" },
];

function getUpcomingMeetingDates(
  meetingDays?: Array<{ weekday: number; startTime?: string | null; endTime?: string | null }>,
  count = 4
): Array<{ label: string; date: Date; isoString: string }> {
  if (!meetingDays || !meetingDays.length) return [];
  const results: Array<{ label: string; date: Date; isoString: string }> = [];
  const now = new Date();

  for (let offset = 0; offset <= 21 && results.length < count; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    const dayOfWeek = candidate.getDay();
    const match = meetingDays.find(m => m.weekday === dayOfWeek);
    if (match) {
      const [startHour = "09", startMin = "00"] = (match.startTime || "09:00").split(":");
      candidate.setHours(parseInt(startHour, 10), parseInt(startMin, 10), 0, 0);
      if (candidate.getTime() > now.getTime() - 60 * 60 * 1000) {
        const weekdayName = weekdayNames[dayOfWeek];
        const monthDay = candidate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const timeStr = formatDateTime12Hour(candidate).split(" ").slice(-2).join(" ");
        results.push({
          label: `${offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : weekdayName}, ${monthDay} (${timeStr})`,
          date: candidate,
          isoString: candidate.toISOString(),
        });
      }
    }
  }
  return results;
}

export function LegacyScheduleRedirect() {
  const [, params] = useRoute("/app/subjects/:subjectId/schedule");
  const subjectId = params?.subjectId ?? "";
  return <Redirect to={attendanceWorkspacePath(subjectId as any)} />;
}

export function FocusedAttendancePage(props?: { params?: { subjectId?: string } }) {
  const [, routeParams] = useRoute("/app/subjects/:subjectId/attendance");
  const [location] = useLocation();
  const pathSubjectId = location.startsWith("/app/subjects/")
    ? location.slice("/app/subjects/".length).split("/")[0]?.split("?")[0]
    : "";
  const rawSubjectId = props?.params?.subjectId || routeParams?.subjectId || pathSubjectId || "";
  const subjectId = rawSubjectId;
  const numSubjectId = Number(rawSubjectId);
  const isNumeric = !isNaN(numSubjectId) && numSubjectId > 0;
  const validSubject = Boolean(rawSubjectId && rawSubjectId !== "0" && rawSubjectId !== "NaN");
  const subjectQueryParam = isNumeric ? numSubjectId : rawSubjectId;

  const subject = trpc.subjects.get.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject });
  const sessions = trpc.subjects.sessions.list.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject });
  const utils = trpc.useUtils();
  const [composer, setComposer] = useState<Composer>(null);
  const [sessionAt, setSessionAt] = useState("");
  const [noClassAt, setNoClassAt] = useState("");
  const [reason, setReason] = useState("");
  const [sessionForNoClass, setSessionForNoClass] = useState<string | number | null>(null);
  const [sortMode, setSortMode] = useState<SessionSortMode>("newest");
  const [filterTab, setFilterTab] = useState<"all" | "class" | "no_class">("all");
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

  const withClassCount = useMemo(() => sessions.data?.filter(s => s.sessionState !== "no_class").length ?? 0, [sessions.data]);
  const noClassCount = useMemo(() => sessions.data?.filter(s => s.sessionState === "no_class").length ?? 0, [sessions.data]);
  const totalSessionCount = sessions.data?.length ?? 0;

  const upcomingMeetingDates = useMemo(
    () => getUpcomingMeetingDates(subject.data?.meetingDays || []),
    [subject.data?.meetingDays]
  );
  const targetSession = sessionForNoClass
    ? sessions.data?.find(s => String(s.id) === String(sessionForNoClass))
    : null;
  const isEditingExistingNoClass = targetSession?.sessionState === "no_class";

  const refresh = async () => {
    await utils.subjects.sessions.list.invalidate({ subjectId: subjectQueryParam as any });
    await utils.subjects.sessions.list.invalidate();
  };
  const createSession = trpc.subjects.sessions.create.useMutation({
    onSuccess: () => {
      refresh();
      setSessionAt("");
      setComposer(null);
      toast.success("Class session added");
    },
    onError: error => toast.error(error.message),
  });
  const createNoClass = trpc.subjects.sessions.createNoClass.useMutation({
    onSuccess: () => {
      refresh();
      setNoClassAt("");
      setReason("");
      setComposer(null);
      toast.success("No Class notice added");
    },
    onError: (error: any) => toast.error(error.message),
  });
  const setNoClass = trpc.subjects.sessions.setNoClass.useMutation({
    onSuccess: () => {
      refresh();
      setSessionForNoClass(null);
      setReason("");
      toast.success("No Class status updated");
    },
    onError: (error: any) => toast.error(error.message),
  });
  const deleteSession = trpc.attendance.deleteSession.useMutation({
    onSuccess: () => {
      refresh();
      setSelectedSessionIds(new Set());
      toast.success("Selected sessions deleted");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const closeComposer = () => {
    setComposer(null);
    setSessionForNoClass(null);
    setReason("");
  };

  const scheduleText =
    subject.data?.meetingDays && subject.data.meetingDays.length > 0
      ? subject.data.meetingDays.map(day => `${weekdayNames[day.weekday]}${formatTimeRange12Hour(day.startTime, day.endTime)}`).join(" · ")
      : "No regular weekly pattern set";

  const submitSession = (event: FormEvent) => {
    event.preventDefault();
    if (sessionAt) createSession.mutate({ subjectId: subjectQueryParam as any, startsAt: new Date(sessionAt) });
  };

  const submitNoClass = (event: FormEvent) => {
    event.preventDefault();
    if (noClassAt && reason.trim()) createNoClass.mutate({ subjectId: subjectQueryParam as any, startsAt: new Date(noClassAt), reason: reason.trim() });
  };

  // Sorting
  const sortedSessions = useMemo(() => {
    const list = [...(sessions.data ?? [])];
    if (sortMode === "newest") {
      return list.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    }
    if (sortMode === "oldest") {
      return list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    if (sortMode === "no_class") {
      return list.sort((a, b) => {
        if (a.sessionState === "no_class" && b.sessionState !== "no_class") return -1;
        if (a.sessionState !== "no_class" && b.sessionState === "no_class") return 1;
        return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      });
    }
    return list;
  }, [sessions.data, sortMode]);

  const filteredSessions = useMemo(() => {
    if (filterTab === "class") return sortedSessions.filter(s => s.sessionState !== "no_class");
    if (filterTab === "no_class") return sortedSessions.filter(s => s.sessionState === "no_class");
    return sortedSessions;
  }, [sortedSessions, filterTab]);

  // Bulk selection
  const toggleSession = (id: string) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllSessions = () => {
    setSelectedSessionIds(new Set(filteredSessions.map(s => String(s.id))));
  };
  const deselectAllSessions = () => setSelectedSessionIds(new Set());
  const allSelected = filteredSessions.length > 0 && selectedSessionIds.size === filteredSessions.length;

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedSessionIds);
    for (const id of ids) {
      const num = Number(id);
      const isNum = !isNaN(num) && num > 0;
      await deleteSession.mutateAsync({ sessionId: (isNum ? num : id) as any });
    }
    deselectAllSessions();
    toast.success(`${ids.length} sessions deleted`);
  };

  if (subject.isLoading)
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-4xl">
          <div className="signal-inset mt-6 grid min-h-72 place-items-center text-sm text-muted-foreground">
            Loading Subject workspace…
          </div>
        </section>
      </DashboardLayout>
    );

  if (!subject.data)
    return (
      <DashboardLayout>
        <section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center">
          <div className="signal-panel border-t-2 border-primary p-8 text-center">
            <CalendarDays className="mx-auto text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">Subject unavailable</h1>
            <Link
              href="/app/subjects"
              className="signal-action mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Back to Subjects
            </Link>
          </div>
        </section>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl pb-16">
        <WorkspacePageHeader
          eyebrow="Attendance"
          title="Attendance"
          description="Add class dates, mark No Class, sort sessions, then take Attendance."
          back={
            <Link
              href={`/app/subjects/${subjectId}`}
              className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Subject
            </Link>
          }
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setComposer("no-class")}>
                <CalendarX className="h-4 w-4" />
                Add No Class
              </Button>
              <Button onClick={() => setComposer("session")}>
                <Plus className="h-4 w-4" />
                Add class date
              </Button>
            </div>
          }
        />

        <div className="mt-6 space-y-5">
          <section className="signal-panel border-l-2 border-l-primary p-5 sm:p-6">
            <p className="signal-kicker">Regular class time</p>
            <p className="mt-2 text-xl font-bold tracking-[-0.035em]">{scheduleText}</p>
            <Link
              href={`/app/subjects/${subjectId}/details`}
              className="signal-action mt-4 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-primary hover:bg-secondary"
            >
              Edit class time <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="border-y border-border py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="signal-kicker">Class dates</p>
                  <h2 className="signal-heading mt-1">Attendance sessions</h2>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
                  {sessions.data?.length ?? 0} total
                </Badge>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Sort:</span>
                <select
                  aria-label="Sort sessions"
                  value={sortMode}
                  onChange={e => setSortMode(e.target.value as SessionSortMode)}
                  className="min-h-9 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="no_class">No Class notices</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
                    filterTab === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({totalSessionCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("class")}
                  className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
                    filterTab === "class"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Session With Class ({withClassCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("no_class")}
                  className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
                    filterTab === "no_class"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  No Class ({noClassCount})
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {sessions.isLoading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Loading class dates…</p>
              ) : null}
              {filteredSessions.map(session => {
                const sId = String(session.id);
                const isSelected = selectedSessionIds.has(sId);
                const isNoClass = session.sessionState === "no_class";
                const isCompleted = session.sessionState === "completed";
                return (
                  <div key={sId} className={`signal-card-shell ${isSelected ? "!bg-primary/30" : isNoClass ? "!bg-amber-500/20" : ""}`}>
                    <article className={`signal-record-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${isSelected ? "!bg-primary/5" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <BulkCheckbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSession(sId)}
                          label={`Select session for ${formatDateTime12Hour(session.startsAt)}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm sm:text-base truncate tracking-[-0.02em]">
                            {formatDateTime12Hour(session.startsAt)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {isNoClass ? (
                              <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-amber-400" />
                                No Class • {session.noClassReason || "Suspended"}
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-400" />
                                Attendance completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-muted/40 text-muted-foreground border border-border/40">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-muted-foreground" />
                                Ready for Attendance
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isNoClass ? (
                          <>
                            {session.publicId && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const url = `${window.location.origin}/attendance/${session.publicId}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success("Public notice link copied to clipboard");
                                  }}
                                  title="Copy public notice link for students"
                                  className="gap-1.5"
                                >
                                  <Copy className="size-3.5" />
                                  Copy notice
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a
                                    href={`/attendance/${session.publicId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gap-1.5 inline-flex items-center"
                                  >
                                    <ExternalLink className="size-3.5" />
                                    View notice
                                  </a>
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSessionForNoClass(session.id);
                                setReason(session.noClassReason || "");
                              }}
                              className="gap-1.5"
                            >
                              <Pencil className="size-3.5" />
                              Edit reason
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={setNoClass.isPending}
                              onClick={() => setNoClass.mutate({ sessionId: session.id as any, noClass: false, publish: true })}
                            >
                              Restore class
                            </Button>
                          </>
                        ) : (
                          <>
                            <Link
                              href={`/app/attendance/${session.id}`}
                              className="signal-action inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20"
                            >
                              Take Attendance <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSessionForNoClass(session.id);
                                setReason("");
                              }}
                            >
                              Mark No Class
                            </Button>
                          </>
                        )}

                        {/* Delete Session Button with Dialog */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              aria-label={`Delete session ${formatDateTime12Hour(session.startsAt)}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this class session?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the session for{" "}
                                <strong>{formatDateTime12Hour(session.startsAt)}</strong> and all its attendance records.
                                This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSession.mutate({ sessionId: session.id as any })}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </article>
                  </div>
                );
              })}

              {!sessions.isLoading && sessions.data?.length && !filteredSessions.length ? (
                <div className="signal-inset py-10 text-center">
                  <p className="text-sm font-semibold text-foreground">No sessions match the selected filter</p>
                  <Button variant="outline" size="sm" onClick={() => setFilterTab("all")} className="mt-3">
                    Show all sessions
                  </Button>
                </div>
              ) : null}

              {!sessions.isLoading && !sessions.data?.length ? (
                <div className="signal-inset py-14 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-primary opacity-60" />
                  <p className="mt-4 text-sm font-semibold text-foreground">No class dates yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Add your first session date to start taking attendance.</p>
                  <Button onClick={() => setComposer("session")} className="mt-5">
                    <Plus className="mr-2 h-4 w-4" />
                    Add class date
                  </Button>
                </div>
              ) : null}
            </div>

          </section>
        </div>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedSessionIds.size}
          totalCount={filteredSessions.length}
          onSelectAll={selectAllSessions}
          onDeselectAll={deselectAllSessions}
          allSelected={allSelected}
          noun="session"
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={deleteSession.isPending}>
                <Trash2 className="mr-1.5 size-3.5" />
                Delete selected ({selectedSessionIds.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedSessionIds.size} sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {selectedSessionIds.size} attendance sessions and all associated records.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete all selected
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </BulkActionBar>

        {/* Composers Dialogs */}
        <Dialog open={composer !== null} onOpenChange={open => !open && closeComposer()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{composer === "session" ? "Add class date" : "Add No Class"}</DialogTitle>
              <DialogDescription>
                {composer === "session"
                  ? "Add a date, then take Attendance from this page."
                  : "Post a No Class notice for a holiday, event, weather day, or another change."}
              </DialogDescription>
            </DialogHeader>
            {composer === "session" ? (
              <form onSubmit={submitSession} className="mt-4 flex flex-col gap-3">
                <Label htmlFor="new-session-date">Class date and time</Label>
                <DateTime12HourInput
                  id="new-session-date"
                  value={sessionAt}
                  onChange={setSessionAt}
                  ariaLabel="Class date and time"
                />
                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={closeComposer}>
                    Cancel
                  </Button>
                  <Button disabled={createSession.isPending || !sessionAt}>
                    {createSession.isPending ? "Adding…" : "Add class date"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <form onSubmit={submitNoClass} className="mt-4 flex flex-col gap-3">
                {upcomingMeetingDates.length > 0 && (
                  <div className="space-y-1.5 rounded-xl border border-border/70 bg-secondary/30 p-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="size-3 text-primary" />
                      1-Click Meeting Shortcuts
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {upcomingMeetingDates.map(m => (
                        <Button
                          key={m.isoString}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNoClassAt(m.isoString)}
                          className={`h-7 px-2.5 text-xs font-semibold ${
                            noClassAt === m.isoString ? "border-primary bg-primary/10 text-primary" : ""
                          }`}
                        >
                          {m.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <Label htmlFor="no-class-date">No Class date and time</Label>
                <DateTime12HourInput
                  id="no-class-date"
                  value={noClassAt}
                  onChange={setNoClassAt}
                  ariaLabel="No Class date and time"
                />
                <div className="space-y-1.5">
                  <Label htmlFor="no-class-reason">Reason</Label>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {NO_CLASS_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setReason(preset.reason)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border ${
                          reason === preset.reason
                            ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold"
                            : "border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    id="no-class-reason"
                    required
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    placeholder="Holiday, school event, weather, or other"
                  />
                </div>
                <DialogFooter className="mt-2">
                  <Button type="button" variant="outline" onClick={closeComposer}>
                    Cancel
                  </Button>
                  <Button disabled={createNoClass.isPending || !noClassAt || !reason.trim()}>
                    {createNoClass.isPending ? "Adding…" : "Add No Class"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={sessionForNoClass !== null} onOpenChange={open => !open && setSessionForNoClass(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{isEditingExistingNoClass ? "Edit No Class Reason" : "Set No Class"}</DialogTitle>
              <DialogDescription>
                {isEditingExistingNoClass
                  ? "Update the official cancellation notice displayed to students and on the public attendance page."
                  : "Replace this scheduled session with a direct No Class notice. You can restore the class later."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="session-no-class-reason">Reason</Label>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {NO_CLASS_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setReason(preset.reason)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border ${
                        reason === preset.reason
                          ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold"
                          : "border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <Input
                  id="session-no-class-reason"
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  placeholder="Holiday, event, weather, or other"
                />
              </div>
              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setSessionForNoClass(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={setNoClass.isPending || !reason.trim()}
                  onClick={() =>
                    sessionForNoClass &&
                    setNoClass.mutate({
                      sessionId: sessionForNoClass as any,
                      noClass: true,
                      reason: reason.trim(),
                      publish: true,
                    })
                  }
                >
                  {isEditingExistingNoClass ? "Save Reason" : "Set No Class"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </DashboardLayout>
  );
}
