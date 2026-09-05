import DashboardLayout from "@/components/DashboardLayout";
import { AttendanceProofTimestamp } from "@/components/AttendanceProofTimestamp";
import { DateTime12HourInput } from "@/components/TimeInputs";
import { formatDateTime12Hour } from "@/lib/time";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { WorkspaceFormFooter } from "@/components/WorkspaceFormFooter";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { attendanceWorkspacePath } from "@/lib/attendanceWorkspace";
import { trpc } from "@/lib/trpc";
import { sortAttendance, type AttendanceSortMode } from "@shared/attendanceSorting";
import { formatSocialTitle, formatShorthandDate } from "@shared/socialTitle";
import { SocialPreviewCard } from "@/components/SocialPreviewCard";
import { formatConflictDaysSummary } from "@shared/scheduleConflict";
import { downloadClassAttendancePdf } from "@/lib/reportPdf";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BadgeCheck, CalendarX, ChartNoAxesCombined, Check, CheckCheck, ClipboardPaste, Clock, Copy, ExternalLink, FileDown, FileText, Pencil, Sparkles, Upload, Trash2, ChevronDown, Search, UserPlus, X } from "lucide-react";
import { NO_CLASS_PRESETS } from "./FocusedSchedulePage";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const statusOptions = ["PRESENT", "ABSENT", "EXCUSED", "CONFLICT", "NOT_SET"] as const;
const statusFilters = ["ALL", ...statusOptions] as const;
export type AttendanceScreen = "main" | "zoom" | "proofs" | "social";
const localDateTimeValue = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

function parseZoomNameToStudent(sourceName: string): { lastName: string; firstName: string; middleName: string } {
  let clean = sourceName.replace(/^[A-Z0-9-]+_/i, "").trim();
  if (clean.includes(",")) {
    const [last, rest] = clean.split(",").map(s => s.trim());
    const restParts = (rest || "").split(/\s+/).filter(Boolean);
    const hasInitial = restParts.length > 1 && restParts[restParts.length - 1].length <= 2;
    const first = (hasInitial ? restParts.slice(0, -1) : restParts).join(" ");
    const middle = hasInitial ? restParts[restParts.length - 1].replace(/\.$/, "") : "";
    return { lastName: last || "", firstName: first || "", middleName: middle || "" };
  }
  if (clean.includes("-") || clean.includes("–")) {
    const [last, first] = clean.split(/[-–]/).map(s => s.trim());
    return { lastName: last || "", firstName: first || "", middleName: "" };
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { lastName: parts[0], firstName: "", middleName: "" };
  if (parts.length === 2) return { lastName: parts[1], firstName: parts[0], middleName: "" };
  return {
    lastName: parts[parts.length - 1],
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
  };
}

export default function AttendancePage() {
  const [, params] = useRoute("/app/attendance/:sessionId");
  const sessionId = params?.sessionId ?? "";
  const numSessionId = Number(sessionId);
  const isNumeric = !isNaN(numSessionId) && numSessionId > 0;
  const validSession = Boolean(sessionId && sessionId !== "0" && sessionId !== "NaN");
  const sessionQueryParam = (isNumeric ? numSessionId : sessionId) as any;
  const utils = trpc.useUtils();
  const session = trpc.attendance.session.useQuery({ sessionId: sessionQueryParam }, { enabled: validSession });
  const subject = trpc.subjects.get.useQuery(
    { subjectId: session.data?.subjectId as any },
    { enabled: Boolean(session.data?.subjectId) }
  );
  const subjectMeetingDays = useMemo(() => {
    return subject.data?.meetingDays?.map((m: any) => Number(m.weekday)) || [];
  }, [subject.data]);
  const records = trpc.attendance.list.useQuery({ sessionId: sessionQueryParam }, { enabled: validSession });
  const [rawNames, setRawNames] = useState("");
  const [candidateSelections, setCandidateSelections] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("ALL");
  const [attendanceSort, setAttendanceSort] = useState<AttendanceSortMode>("last-name-asc");
  const [editingExcuseId, setEditingExcuseId] = useState<string | number | null>(null);
  const [excuseDrafts, setExcuseDrafts] = useState<Record<string, string>>({});
  const [captureAt, setCaptureAt] = useState(() => localDateTimeValue());
  const suggestions = trpc.attendance.suggestionsForSession.useQuery({ sessionId: sessionQueryParam }, { enabled: validSession });
  const proofSubmissions = trpc.attendanceProof.listForSession.useQuery({ sessionId: sessionQueryParam }, { enabled: validSession });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeScreen, setActiveScreen] = useState<AttendanceScreen>("main");

  const pendingProofCount = useMemo(
    () => proofSubmissions.data?.filter((p: any) => p.reviewState === "needs_review" || p.reviewState === "pending").length ?? 0,
    [proofSubmissions.data]
  );

  const [noClassModalOpen, setNoClassModalOpen] = useState(false);
  const [noClassReasonDraft, setNoClassReasonDraft] = useState("");

  const isNoClass = (session.data as any)?.sessionState === "no_class";
  const noClassReason = (session.data as any)?.noClassReason || "";

  const setNoClass = trpc.subjects.sessions.setNoClass.useMutation({
    onSuccess: () => {
      utils.attendance.session.invalidate({ sessionId: sessionQueryParam });
      if (session.data?.publicId) {
        utils.foundation.publicAttendance.invalidate({ publicId: session.data.publicId });
      }
      toast.success("Class session status updated");
    },
    onError: error => toast.error(error.message),
  });

  const handleDownloadPdf = async () => {
    if (!records.data?.length || !session.data) {
      toast.error("No attendance records to export");
      return;
    }
    setIsExportingPdf(true);
    try {
      await downloadClassAttendancePdf({
        subjectName: subject.data?.name || "Subject",
        subjectCode: subject.data?.code || "SUBJ",
        professorName: subject.data?.professorName || undefined,
        startsAt: session.data.startsAt,
        present: totals.present,
        absent: totals.absent,
        excused: totals.excused,
        conflict: totals.conflict,
        notSet: totals.unset,
        students: records.data.map(r => ({
          canonicalName: r.canonicalName,
          status: r.status,
          excuseReason: r.excuseReason,
          hasScheduleConflict: r.hasScheduleConflict,
        })),
      });
      toast.success("Official Class Attendance Sheet PDF downloaded!");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Quick Add Student State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSuggestion, setQuickAddSuggestion] = useState<{ id: number | string; sourceName: string } | null>(null);
  const [quickAddDraft, setQuickAddDraft] = useState({ firstName: "", middleName: "", lastName: "" });

  const quickAddStudent = trpc.attendance.quickAddAndMatchStudent.useMutation({
    onSuccess: data => {
      utils.attendance.list.invalidate({ sessionId: sessionQueryParam });
      utils.attendance.suggestionsForSession.invalidate({ sessionId: sessionQueryParam });
      setQuickAddOpen(false);
      toast.success(`Added ${data.canonicalName} to masterlist and marked Present`);
    },
    onError: error => toast.error(error.message),
  });

  const handleOpenQuickAdd = (item: { id: number | string; sourceName: string }) => {
    const parsed = parseZoomNameToStudent(item.sourceName);
    setQuickAddDraft(parsed);
    setQuickAddSuggestion(item);
    setQuickAddOpen(true);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddDraft.lastName.trim() || !quickAddDraft.firstName.trim()) {
      toast.error("First Name and Last Name are required");
      return;
    }
    quickAddStudent.mutate({
      sessionId: sessionQueryParam,
      suggestionId: quickAddSuggestion?.id ? (isNumeric ? Number(quickAddSuggestion.id) : (quickAddSuggestion.id as any)) : undefined,
      student: quickAddDraft,
    });
  };

  const deleteSession = trpc.attendance.deleteSession.useMutation({
    onSuccess: () => {
      toast.success("Session deleted");
      window.location.href = attendanceWorkspacePath(session.data?.subjectId ?? "");
    },
    onError: error => toast.error(error.message),
  });

  const importNames = trpc.attendance.importZoomNames.useMutation({
    onSuccess: output => {
      setCandidateSelections({});
      utils.attendance.suggestionsForSession.invalidate({ sessionId: sessionQueryParam });
      toast.success(`${output.count} Zoom names to review`);
    },
    onError: error => toast.error(error.message),
  });
  const setStatus = trpc.attendance.setStatus.useMutation({
    onSuccess: () => utils.attendance.list.invalidate({ sessionId: sessionQueryParam }),
    onError: error => toast.error(error.message),
  });
  const bulkSetDraftStatus = trpc.attendance.bulkSetDraftStatus.useMutation({
    onSuccess: (_output, input) => {
      utils.attendance.list.invalidate({ sessionId: sessionQueryParam });
      toast.success(`All Students marked ${input.status.replace("_", " ")} as drafts`);
    },
    onError: error => toast.error(error.message),
  });
  const confirmSuggestion = trpc.attendance.confirmSuggestion.useMutation({
    onSuccess: () => {
      utils.attendance.suggestionsForSession.invalidate({ sessionId: sessionQueryParam });
      utils.attendance.list.invalidate({ sessionId: sessionQueryParam });
      toast.success("Zoom suggestion confirmed");
    },
    onError: error => toast.error(error.message),
  });
  const deleteSuggestion = trpc.attendance.deleteSuggestion.useMutation({
    onSuccess: () => {
      utils.attendance.suggestionsForSession.invalidate({ sessionId: sessionQueryParam });
      toast.success("Suggestion removed");
    },
    onError: error => toast.error(error.message),
  });
  const clearSuggestions = trpc.attendance.clearSuggestions.useMutation({
    onSuccess: () => {
      utils.attendance.suggestionsForSession.invalidate({ sessionId: sessionQueryParam });
      setCandidateSelections({});
      toast.success("All suggestions cleared");
    },
    onError: error => toast.error(error.message),
  });
  const publish = trpc.attendance.publish.useMutation({
    onSuccess: output => {
      utils.attendance.list.invalidate({ sessionId: sessionQueryParam });
      utils.attendance.session.invalidate({ sessionId: sessionQueryParam });
      utils.subjects.sessions.invalidate();
      if (session.data?.publicId) {
        utils.foundation.publicAttendance.invalidate({ publicId: session.data.publicId });
      }
      toast.success(`Attendance published as version ${output.version}`);
    },
    onError: error => toast.error(error.message),
  });
  const resolveProof = trpc.attendanceProof.resolve.useMutation({
    onSuccess: (output: any) => {
      utils.attendanceProof.listForSession.invalidate({ sessionId: sessionQueryParam });
      utils.attendance.list.invalidate({ sessionId: sessionQueryParam });
      utils.attendance.session.invalidate({ sessionId: sessionQueryParam });
      utils.subjects.sessions.invalidate();
      if (session.data?.publicId) {
        utils.foundation.publicAttendance.invalidate({ publicId: session.data.publicId });
      }
      if (output.outcome === "marked_excused") {
        toast.success("Approved excuse letter and marked student Excused");
      } else if (output.outcome === "updated") {
        toast.success("Accepted and marked student Present");
      } else if (output.outcome === "already_present") {
        toast.success("Student was already marked Present");
      } else {
        toast.success("Submission updated");
      }
    },
    onError: error => toast.error(error.message),
  });
  const totals = useMemo(
    () => ({
      present: records.data?.filter(row => row.status === "PRESENT").length ?? 0,
      absent: records.data?.filter(row => row.status === "ABSENT").length ?? 0,
      excused: records.data?.filter(row => row.status === "EXCUSED").length ?? 0,
      conflict: records.data?.filter(row => row.status === "CONFLICT").length ?? 0,
      unset: records.data?.filter(row => row.status === "NOT_SET").length ?? 0,
    }),
    [records.data],
  );
  const filteredRecords = useMemo(() => sortAttendance(records.data?.filter(record => statusFilter === "ALL" || record.status === statusFilter) ?? [], attendanceSort), [attendanceSort, records.data, statusFilter]);
  
  const searchedRecords = useMemo(
    () => filteredRecords.filter(record =>
      !searchQuery || record.canonicalName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [filteredRecords, searchQuery]
  );

  const toggleRecord = (id: string) => {
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllRecords = () => {
    setSelectedRecordIds(new Set(searchedRecords.map(r => String(r.recordId))));
  };
  const deselectAllRecords = () => setSelectedRecordIds(new Set());

  const unresolvedSuggestionCount = suggestions.data?.filter(item => item.reviewState !== "confirmed").length ?? 0;
  const pastedNameCount = useMemo(() => rawNames.split(/\r?\n/).map(name => name.trim()).filter(Boolean).length, [rawNames]);
  const copyPublicAttendance = async () => {
    if (!session.data?.publicId) return;
    await navigator.clipboard.writeText(`${window.location.origin}/attendance/${session.data.publicId}`);
    toast.success("Public Attendance link copied for Messenger");
  };

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl">
        <WorkspacePageHeader
          eyebrow={activeScreen === "main" ? "Class session" : "Attendance Tools"}
          title={
            activeScreen === "main"
              ? "Attendance"
              : activeScreen === "zoom"
              ? "Match Zoom Names"
              : activeScreen === "proofs"
              ? "Attendance Proofs & Excuse Letters"
              : "Messenger & Social Card Preview"
          }
          back={
            activeScreen === "main" ? (
              <Link
                href={attendanceWorkspacePath(session.data?.subjectId || "")}
                className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Attendance
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setActiveScreen("main")}
                className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Attendance
              </button>
            )
          }
          action={
            activeScreen === "main" ? (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf || !records.data?.length}
                  className="signal-action inline-flex min-h-11 items-center justify-center border border-border bg-card px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary rounded-xl"
                >
                  <FileDown className="mr-2 h-4 w-4 text-primary" />
                  {isExportingPdf ? "Exporting PDF…" : "Attendance Sheet (PDF)"}
                </Button>
                <Link
                  href={`/app/reports?sessionId=${sessionId}`}
                  className="signal-action inline-flex min-h-11 items-center justify-center border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary rounded-xl"
                >
                  <ChartNoAxesCombined className="mr-2 h-4 w-4" />View report
                </Link>
                {session.data?.publishState === "published" ? (
                  <>
                    <a
                      href={`/attendance/${session.data.publicId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="signal-action inline-flex min-h-11 items-center justify-center border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary rounded-xl"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />View shared
                    </a>
                    <button
                      type="button"
                      onClick={copyPublicAttendance}
                      className="signal-action inline-flex min-h-11 items-center justify-center border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-secondary rounded-xl"
                    >
                      <Copy className="mr-2 h-4 w-4" />Copy link
                    </button>
                  </>
                ) : null}
                {!isNoClass && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNoClassReasonDraft("");
                      setNoClassModalOpen(true);
                    }}
                    className="signal-action inline-flex min-h-11 items-center justify-center border border-amber-500/40 bg-card px-3 sm:px-4 text-xs sm:text-sm font-semibold text-amber-400 hover:bg-amber-500/10 rounded-xl"
                  >
                    <CalendarX className="mr-2 size-4 text-amber-400" />
                    Mark No Class
                  </Button>
                )}
                <Button
                  onClick={() => publish.mutate({ sessionId: sessionQueryParam })}
                  disabled={publish.isPending || !records.data?.length || unresolvedSuggestionCount > 0}
                  className="min-h-11 px-5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {unresolvedSuggestionCount
                    ? `Review ${unresolvedSuggestionCount} Zoom ${unresolvedSuggestionCount === 1 ? "name" : "names"}`
                    : session.data?.publishState === "published"
                    ? `Update & Publish (v${(session.data?.version || 1) + 1})`
                    : "Publish Attendance (v1)"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveScreen("main")}
                className="gap-2 font-semibold rounded-xl min-h-11"
              >
                <ArrowLeft className="size-4" />
                Back to Attendance
              </Button>
            )
          }
        >
          {/* Session Status & Meta Bar */}
          {session.data && (
            <div className="flex flex-wrap items-center gap-2.5">
              {isNoClass ? (
                <span className="inline-flex items-center gap-1.5 min-h-6 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-amber-500 dark:bg-amber-400" />
                  <span>No Class</span>
                </span>
              ) : (session.data as any)?.sessionState === "completed" ? (
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-500 dark:bg-emerald-400" />
                  Attendance completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-muted/40 text-muted-foreground border border-border/40">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-muted-foreground" />
                  Ready for Attendance
                </span>
              )}
              {session.data.startsAt && (
                <span className="text-xs text-muted-foreground font-medium">
                  {formatDateTime12Hour(session.data.startsAt)}
                </span>
              )}
            </div>
          )}
        </WorkspacePageHeader>

        {/* Context Navigation Switcher */}
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveScreen("main")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeScreen === "main"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <CheckCheck className="size-4" />
            Attendance Desk
            <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
              {records.data?.length ?? 0}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen("zoom")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeScreen === "zoom"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Sparkles className="size-4 text-primary" />
            Match Zoom Names
            {unresolvedSuggestionCount > 0 ? (
              <Badge variant="outline" className="rounded-full border-amber-500/50 bg-amber-500/20 text-[10px] font-bold text-amber-300 px-1.5 py-0">
                {unresolvedSuggestionCount} to review
              </Badge>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen("proofs")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeScreen === "proofs"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <BadgeCheck className="size-4 text-emerald-400" />
            Attendance Proofs & Excuses
            {pendingProofCount > 0 ? (
              <Badge variant="outline" className="rounded-full border-amber-500/50 bg-amber-500/20 text-[10px] font-bold text-amber-300 px-1.5 py-0">
                {pendingProofCount} pending
              </Badge>
            ) : (
              <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
                {proofSubmissions.data?.length ?? 0}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen("social")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeScreen === "social"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Copy className="size-4 text-sky-400" />
            Messenger & Social Card Preview
          </button>
        </div>

        {/* Prominent No Class Notice Banner */}
        {isNoClass && (
          <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 shadow-lg shadow-amber-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
                  <CalendarX className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 min-h-6 max-w-full px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-amber-400" />
                      <span className="truncate">No Class • {noClassReason || "Suspended"}</span>
                    </span>
                    <span className="text-xs font-bold text-amber-400">Notice Active</span>
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-foreground break-words">
                    {noClassReason || "No class scheduled"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Regular roll call is waived on the public attendance page.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNoClassReasonDraft(noClassReason);
                    setNoClassModalOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Pencil className="size-3.5" />
                  Edit Reason
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={setNoClass.isPending}
                  onClick={() => {
                    setNoClass.mutate({
                      sessionId: sessionQueryParam,
                      noClass: false,
                      publish: true,
                    });
                  }}
                >
                  Restore to Normal Class
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Live Attendance HUD Counters (Visible on main desk) */}
        {activeScreen === "main" && (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Summary
              label="Present"
              count={totals.present}
              tone="text-emerald-600 dark:text-emerald-400"
              percentage={records.data?.length ? Math.round((totals.present / records.data.length) * 100) : 0}
            />
            <Summary
              label="Absent"
              count={totals.absent}
              tone="text-rose-600 dark:text-rose-400"
              percentage={records.data?.length ? Math.round((totals.absent / records.data.length) * 100) : 0}
            />
            <Summary
              label="Excused"
              count={totals.excused}
              tone="text-sky-600 dark:text-sky-400"
              percentage={records.data?.length ? Math.round((totals.excused / records.data.length) * 100) : 0}
            />
            <Summary
              label="With Schedule Conflict"
              count={totals.conflict}
              tone="text-purple-600 dark:text-purple-400"
              percentage={records.data?.length ? Math.round((totals.conflict / records.data.length) * 100) : 0}
            />
            <Summary
              label="Unmarked"
              count={totals.unset}
              tone="text-amber-600 dark:text-amber-400"
              percentage={records.data?.length ? Math.round((totals.unset / records.data.length) * 100) : 0}
              className="col-span-2 sm:col-span-1"
            />
          </div>
        )}

        {activeScreen === "main" && (
          <div className="mt-6 flex flex-col gap-6">
            <section className="signal-panel p-5 sm:p-6 rounded-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="signal-kicker">Attendance Desk</p>
                <h2 className="signal-heading text-xl font-bold mt-0.5">Student Attendance</h2>
                <p className="text-xs text-muted-foreground mt-1">Single-tap status to mark live attendance.</p>
              </div>
              <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-bold text-foreground border border-border">
                {records.data?.length ?? 0} Students Enrolled
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Search and Filter Row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search student by name…"
                    className="pl-10 min-h-11 rounded-xl text-xs sm:text-sm bg-card border-input focus-visible:ring-primary"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="att-sort" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Sort:
                  </label>
                  <select
                    id="att-sort"
                    value={attendanceSort}
                    onChange={event => setAttendanceSort(event.target.value as AttendanceSortMode)}
                    className="min-h-10 rounded-xl border border-input bg-card px-3 text-xs sm:text-sm font-semibold text-foreground"
                    aria-label="Sort Attendance records"
                  >
                    <option value="last-name-asc">Last Name (A–Z)</option>
                    <option value="last-name-desc">Last Name (Z–A)</option>
                    <option value="first-name">First Name (A–Z)</option>
                    <option value="status">Status priority</option>
                    <option value="conflict">Schedule conflicts</option>
                  </select>
                </div>
              </div>

              {/* Status Filter Tabs & Bulk Draft Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="signal-inset flex flex-wrap min-w-0 gap-1.5 p-1 rounded-xl" role="group" aria-label="Filter Students by Attendance status">
                  {statusFilters.map(filter => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={statusFilter === filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`signal-action min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold transition-all ${
                        statusFilter === filter
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {filter === "ALL" ? "All" : filter === "CONFLICT" ? "With Schedule Conflict" : filter.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-bold text-muted-foreground mr-1 text-[11px] uppercase tracking-wider">Batch Mark:</span>
                  {(["PRESENT", "ABSENT", "CONFLICT", "NOT_SET"] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      disabled={bulkSetDraftStatus.isPending || !records.data?.length}
                      onClick={() => bulkSetDraftStatus.mutate({ sessionId: sessionQueryParam, status })}
                      className="signal-action min-h-9 sm:min-h-8 inline-flex items-center rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {bulkSetDraftStatus.isPending ? "…" : status === "NOT_SET" ? "Reset to Unmarked" : status === "CONFLICT" ? "All With Schedule Conflict" : `All ${status[0]}${status.slice(1).toLowerCase()}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 relative pt-2">
              {/* Select All Checkbox */}
              {searchedRecords.length > 0 && (
                <div className="flex items-center gap-3 px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  <Checkbox
                    checked={searchedRecords.length > 0 && selectedRecordIds.size === searchedRecords.length}
                    onCheckedChange={checked => (checked ? selectAllRecords() : deselectAllRecords())}
                    aria-label="Select all"
                  />
                  <span>Select all ({searchedRecords.length})</span>
                </div>
              )}

              {records.isLoading ? (
                <div className="space-y-3 py-2 animate-pulse">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 rounded-2xl border border-border/50 bg-secondary/30" />
                  ))}
                </div>
              ) : null}

              {searchedRecords.map(record => {
                const isSelected = selectedRecordIds.has(String(record.recordId));
                return (
                  <div
                    key={record.recordId}
                    className={`signal-record-card p-4 sm:p-5 rounded-2xl border transition-all ${
                      record.status === "PRESENT"
                        ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                        : record.status === "ABSENT"
                        ? "border-red-500/30 bg-red-500/[0.03]"
                        : record.status === "EXCUSED"
                        ? "border-sky-500/30 bg-sky-500/[0.03]"
                        : record.status === "CONFLICT"
                        ? "border-purple-500/30 bg-purple-500/[0.03]"
                        : "border-border/80 bg-card"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="pt-1 shrink-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRecord(String(record.recordId))}
                            aria-label={`Select ${record.canonicalName}`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-sm sm:text-base text-foreground truncate">
                              {record.canonicalName}
                            </p>
                            {record.hasScheduleConflict ? (
                              record.isConflictToday ? (
                                record.status === "CONFLICT" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm">
                                    <Clock className="size-3 shrink-0" />
                                    <span>
                                      With Schedule Conflict
                                      {record.conflictConfig?.days ? ` (${formatConflictDaysSummary(record.conflictConfig.days, subjectMeetingDays)})` : ""}
                                    </span>
                                  </span>
                                ) : record.status === "PRESENT" ? (
                                  <span className="glow-badge-amber inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    <Clock className="size-3 shrink-0" />
                                    <span>
                                      Conflict · Auto-Present
                                      {record.conflictConfig?.days ? ` (${formatConflictDaysSummary(record.conflictConfig.days, subjectMeetingDays)})` : ""}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-secondary/80 text-muted-foreground border border-border">
                                    <Clock className="size-3 shrink-0" />
                                    <span>
                                      Conflict Day
                                      {record.conflictConfig?.days ? ` (${formatConflictDaysSummary(record.conflictConfig.days, subjectMeetingDays)})` : ""}
                                    </span>
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                  <Clock className="size-3 shrink-0 text-blue-400" />
                                  <span>
                                    Regular Today (Conflict: {formatConflictDaysSummary(record.conflictConfig?.days, subjectMeetingDays)})
                                  </span>
                                </span>
                              )
                            ) : null}
                            {record.conflictConfig?.reason ? (
                              <span className="text-[11px] text-muted-foreground/80 italic truncate max-w-xs" title={`Conflict details: ${record.conflictConfig.reason}`}>
                                · {record.conflictConfig.reason}
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {record.publishState === "published" ? `Published · v${record.version}` : "Draft Status"}
                          </p>

                          {record.status === "EXCUSED" && record.excuseReason ? (
                            <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs leading-relaxed text-sky-800 dark:text-sky-200">
                              <span className="font-bold text-sky-700 dark:text-sky-400">Excuse Reason:</span> {record.excuseReason}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Status Toggle Button Group */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60 justify-end">
                        {statusOptions.map(status => {
                          const isActive = record.status === status;
                          const activeColor =
                            status === "PRESENT"
                              ? "bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30"
                              : status === "ABSENT"
                              ? "bg-red-600 text-white font-bold shadow-sm shadow-red-600/30"
                              : status === "EXCUSED"
                              ? "bg-sky-600 text-white font-bold shadow-sm shadow-sky-600/30"
                              : status === "CONFLICT"
                              ? "bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/30"
                              : "bg-amber-600 text-white font-bold shadow-sm shadow-amber-600/30";

                          const shortLabel =
                            status === "NOT_SET"
                              ? "Unset"
                              : status === "CONFLICT"
                              ? "Conflict"
                              : status[0] + status.slice(1).toLowerCase();

                          const fullLabel =
                            status === "NOT_SET"
                              ? "Unmarked"
                              : status === "CONFLICT"
                              ? "With Schedule Conflict"
                              : status[0] + status.slice(1).toLowerCase();

                          return (
                            <button
                              key={status}
                              onClick={() => {
                                if (status === "EXCUSED") {
                                  setEditingExcuseId(record.recordId);
                                  setExcuseDrafts(current => ({
                                    ...current,
                                    [record.recordId]: current[record.recordId] ?? record.excuseReason ?? "",
                                  }));
                                } else {
                                  setStatus.mutate({ recordId: record.recordId, status });
                                }
                              }}
                              className={`signal-action min-h-11 sm:min-h-9 rounded-xl px-2.5 sm:px-3 text-xs font-bold transition-all ${
                                isActive
                                  ? activeColor
                                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/70"
                              }`}
                            >
                              <span className="sm:hidden">{shortLabel}</span>
                              <span className="hidden sm:inline">{fullLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Excuse Editor Dropdown */}
                    {editingExcuseId === record.recordId ? (
                      <div className="mt-4 rounded-xl border border-sky-400/30 bg-card p-4 space-y-3 shadow-sm">
                        <div>
                          <label htmlFor={`excuse-reason-${record.recordId}`} className="text-xs font-bold text-foreground">
                            Excuse reason <span className="text-sky-400 font-semibold">*</span>
                          </label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Select a preset or enter a custom reason.</p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Documented medical appointment",
                            "Official university event",
                            "Family emergency",
                            "Technical / connectivity outage",
                          ].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                setExcuseDrafts(current => ({ ...current, [record.recordId]: preset }))
                              }
                              className="rounded-lg border border-border/80 bg-secondary/60 hover:bg-secondary hover:border-sky-400/50 px-2.5 py-1 text-[11px] font-medium text-foreground transition-all"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        <Textarea
                          id={`excuse-reason-${record.recordId}`}
                          value={excuseDrafts[record.recordId] ?? ""}
                          onChange={event =>
                            setExcuseDrafts(current => ({ ...current, [record.recordId]: event.target.value }))
                          }
                          placeholder="Enter specific private reason (e.g. Doctor's note submitted via email)"
                          className="min-h-20 text-xs rounded-xl"
                        />

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            className="rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                            disabled={setStatus.isPending || !(excuseDrafts[record.recordId] ?? "").trim()}
                            onClick={() =>
                              setStatus.mutate(
                                {
                                  recordId: record.recordId,
                                  status: "EXCUSED",
                                  excuseReason: excuseDrafts[record.recordId]?.trim() ?? "",
                                },
                                {
                                  onSuccess: () => {
                                    setEditingExcuseId(null);
                                    toast.success("Attendance marked Excused");
                                  },
                                }
                              )
                            }
                          >
                            Save Excused Status
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs"
                            onClick={() => setEditingExcuseId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {!records.isLoading && !records.data?.length ? (
                <p className="py-8 text-center text-sm leading-6 text-muted-foreground">Add Students to the Master List before taking Attendance.</p>
              ) : null}
              {!records.isLoading && Boolean(records.data?.length) && !searchedRecords.length ? (
                <p className="py-8 text-center text-sm leading-6 text-muted-foreground">No students matched your search criteria.</p>
              ) : null}
            </div>

            {/* Bulk Actions Bar */}
            {selectedRecordIds.size > 0 && (
              <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 z-30 -mx-5 border-t border-border bg-card/95 px-5 py-3 backdrop-blur rounded-b-2xl sm:-mx-6 sm:px-6 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-foreground">
                    {selectedRecordIds.size} student{selectedRecordIds.size === 1 ? "" : "s"} selected
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {statusOptions.map(status => {
                      const shortText = status === "NOT_SET" ? "Unset" : status === "CONFLICT" ? "Conflict" : status[0] + status.slice(1).toLowerCase();
                      const fullText = status === "NOT_SET" ? "Unmarked" : status === "CONFLICT" ? "With Schedule Conflict" : status[0] + status.slice(1).toLowerCase();
                      return (
                        <Button
                          key={status}
                          size="sm"
                          variant="outline"
                          className="min-h-10 sm:min-h-9 rounded-xl text-xs font-semibold"
                          disabled={setStatus.isPending}
                          onClick={() => {
                            selectedRecordIds.forEach(id =>
                              setStatus.mutate({ recordId: (isNumeric ? Number(id) : id) as any, status })
                            );
                            deselectAllRecords();
                          }}
                        >
                          <span className="sm:hidden">Mark {shortText}</span>
                          <span className="hidden sm:inline">Mark {fullText}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            </section>

            <section className="signal-panel mt-6 border border-destructive/20 p-5 sm:p-6">
              <p className="signal-kicker text-destructive">Danger zone</p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.04em]">Delete this session</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Permanently delete this attendance session and all its records. This cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mt-4">
                    <Trash2 className="mr-2 h-4 w-4" />Delete session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this attendance session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the session and all {records.data?.length ?? 0} attendance records. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteSession.mutate({ sessionId: sessionQueryParam })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>

            <section className="signal-inset mt-6 border-l-2 border-l-primary p-4 text-sm text-muted-foreground">
              <Check className="mr-2 inline h-4 w-4 text-primary" />
              Shared versions are public. Zoom review stays private.
            </section>
          </div>
        )}

        {/* Dedicated Context Screen: Match Zoom Names */}
        {activeScreen === "zoom" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveScreen("main")}
                className="gap-2 font-semibold"
              >
                <ArrowLeft className="size-4" />
                ← Back to Attendance
              </Button>
            </div>

            <section className="signal-panel border-t-2 border-t-primary p-5 sm:p-6 rounded-2xl">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="signal-kicker">Zoom names</p>
                  <h2 className="mt-1 text-xl font-bold tracking-[-0.04em]">Match Zoom names</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Paste one name per line, then confirm each match.</p>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="zoom-capture-time" className="text-sm font-medium">Participant-list capture time</label>
                <DateTime12HourInput id="zoom-capture-time" value={captureAt} onChange={setCaptureAt} ariaLabel="Participant-list capture" />
              </div>
              <Textarea
                value={rawNames}
                onChange={event => setRawNames(event.target.value)}
                className="mt-4 min-h-44"
                placeholder={"SECTION_LAST NAME, FIRST NAME\nSECTION_LAST NAME, FIRST NAME"}
                aria-describedby="zoom-name-count"
              />
              <div id="zoom-name-count" className="mt-2 flex items-center justify-between gap-3 text-xs leading-5 text-muted-foreground">
                <span>{pastedNameCount ? `${pastedNameCount} pasted ${pastedNameCount === 1 ? "name" : "names"} ready for analysis` : "Paste one participant name per line"}</span>
                {rawNames ? <button type="button" onClick={() => setRawNames("")} className="min-h-11 px-2 text-xs font-semibold text-primary">Clear list</button> : null}
              </div>
              <WorkspaceFormFooter note="Matches stay private until confirmed.">
                <Button onClick={() => importNames.mutate({ sessionId: sessionQueryParam, rawNamesText: rawNames, captureAt: new Date(captureAt) })} disabled={importNames.isPending || !rawNames.trim() || !captureAt} className="min-h-11 w-full">
                  <Sparkles data-icon="inline-start" />{importNames.isPending ? "Analyzing private list…" : `Analyze ${pastedNameCount || "Zoom"} ${pastedNameCount === 1 ? "name" : "names"}`}
                </Button>
              </WorkspaceFormFooter>

              {suggestions.data?.length ? (
                <div className="mt-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Review matches</h3>
                      {unresolvedSuggestionCount ? (
                        <RecordStatusBadge tone="attention">{unresolvedSuggestionCount} to review</RecordStatusBadge>
                      ) : (
                        <RecordStatusBadge tone="confirmed">All confirmed</RecordStatusBadge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-destructive min-h-9"
                        disabled={clearSuggestions.isPending}
                        onClick={() => clearSuggestions.mutate({ sessionId: sessionQueryParam })}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Clear list
                      </Button>
                      {suggestions.data.some(
                        item => item.reviewState !== "confirmed" && (candidateSelections[item.id] || item.suggestedSubjectStudentId)
                      ) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs min-h-9"
                          disabled={confirmSuggestion.isPending}
                          onClick={async () => {
                            const unconfirmed = suggestions.data?.filter(
                              item => item.reviewState !== "confirmed" && (candidateSelections[item.id] || item.suggestedSubjectStudentId)
                            ) ?? [];
                            for (const item of unconfirmed) {
                              const memId = candidateSelections[item.id] ?? item.suggestedSubjectStudentId;
                              if (memId && String(memId) !== "none") {
                                await confirmSuggestion.mutateAsync({ suggestionId: (isNumeric ? Number(item.id) : item.id) as any, membershipId: (isNumeric ? Number(memId) : memId) as any });
                              }
                            }
                            utils.attendance.suggestionsForSession.invalidate({ sessionId: sessionQueryParam });
                            utils.attendance.list.invalidate({ sessionId: sessionQueryParam });
                            toast.success(`Confirmed all auto-matched students`);
                          }}
                        >
                          <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                          Confirm all matches
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {suggestions.data.map(item => {
                    const selected = candidateSelections[item.id] ?? (item.suggestedSubjectStudentId ? String(item.suggestedSubjectStudentId) : "");
                    return (
                      <div key={item.id} className="signal-inset p-4 rounded-xl">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Suggestion</span>
                            <RecordStatusBadge tone="private">Private review</RecordStatusBadge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <RecordStatusBadge tone={item.reviewState === "confirmed" ? "confirmed" : item.reviewState === "clear" ? "confirmed" : "attention"}>
                              {item.reviewState === "confirmed" ? "Confirmed" : item.reviewState === "clear" ? "Matched" : "Needs review"}
                            </RecordStatusBadge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              disabled={deleteSuggestion.isPending}
                              onClick={() => deleteSuggestion.mutate({ suggestionId: item.id })}
                              aria-label={`Remove suggestion for ${item.sourceName}`}
                              title="Remove from list"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <dl className="mt-3 space-y-2 text-sm">
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Zoom source</dt>
                            <dd className="mt-1 break-words font-medium text-foreground">{item.sourceName}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Matched / Normalized Student</dt>
                            <dd className="mt-1 break-words font-medium text-foreground">
                              {item.normalizedCandidate ?? "No confident roster match"}
                            </dd>
                          </div>
                        </dl>
                        {item.reviewNote ? (
                          <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                            {item.reviewNote}
                          </p>
                        ) : null}
                        {item.flags?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.flags.map(flag => (
                              <Badge key={flag} variant="outline" className="rounded-full text-[11px]">
                                {flag.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-3 text-xs text-muted-foreground">Choose a Student or mark no match.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <select
                            aria-label={`Match for ${item.sourceName}`}
                            value={selected}
                            onChange={event => setCandidateSelections(current => ({ ...current, [item.id]: event.target.value }))}
                            className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
                          >
                            <option value="">Choose Student</option>
                            <option value="none">No roster match</option>
                            {records.data?.map(record => (
                              <option key={record.membershipId} value={record.membershipId}>
                                {record.canonicalName}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="min-h-11 rounded-xl"
                            disabled={item.reviewState === "confirmed" || confirmSuggestion.isPending || !selected}
                            onClick={() => confirmSuggestion.mutate({ suggestionId: (isNumeric ? Number(item.id) : item.id) as any, membershipId: selected === "none" ? null : (isNumeric ? Number(selected) : selected) as any })}
                          >
                            {item.reviewState === "confirmed" ? "Confirmed" : "Confirm"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-11 rounded-xl gap-1.5 text-xs font-semibold"
                            disabled={item.reviewState === "confirmed"}
                            onClick={() => handleOpenQuickAdd(item)}
                          >
                            <UserPlus className="size-3.5 text-primary" />
                            Quick add student
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveScreen("main")}
                className="gap-2 font-semibold"
              >
                <ArrowLeft className="size-4" />
                ← Back to Attendance
              </Button>
            </div>
          </div>
        )}

        {/* Dedicated Context Screen: Attendance Proofs & Excuse Letters */}
        {activeScreen === "proofs" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveScreen("main")}
                className="gap-2 font-semibold"
              >
                <ArrowLeft className="size-4" />
                ← Back to Attendance
              </Button>
            </div>

            <section className="signal-panel p-5 sm:p-6 rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <BadgeCheck className="size-5" />
                  </span>
                  <div className="text-left">
                    <p className="signal-kicker">Student Submissions & Excuses</p>
                    <h2 className="mt-1 text-xl font-bold tracking-[-0.04em]">Attendance Proofs & Excuse Letters</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {proofSubmissions.data?.some(p => p.reviewState === "needs_review") ? (
                    <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 text-xs font-bold text-amber-300">
                      {proofSubmissions.data.filter(p => p.reviewState === "needs_review").length} pending review
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="rounded-full">
                    {proofSubmissions.data?.length ?? 0} total
                  </Badge>
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Zoom screenshots with verified roster matches are automatically verified and marked Present by AI. Review student excuse letters and approve them with one click.
              </p>

              <div className="mt-5 space-y-3">
                {proofSubmissions.data?.map((proof: any) => {
                  const isExcuse = proof.isExcuseLetter || Boolean(proof.reviewSummary?.startsWith("[Excuse Letter]") || proof.proofOriginalName === "Excuse Letter" || proof.proofUrl === "text-only");
                  const isPending = proof.reviewState === "needs_review" || proof.reviewState === "pending";
                  const isAccepted = proof.reviewState === "accepted";
                  const isRejected = proof.reviewState === "rejected";
                  return (
                    <div key={proof.id} className="signal-inset p-4 rounded-2xl border border-border/80">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-base text-foreground">{proof.submittedName}</p>
                            {isExcuse ? (
                              <Badge variant="outline" className="rounded-full border-sky-500/30 bg-sky-500/10 text-xs font-semibold text-sky-300">
                                <FileText className="mr-1 size-3" />Excuse Letter
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-300">
                                <Sparkles className="mr-1 size-3" />Zoom Screenshot
                              </Badge>
                            )}
                            <RecordStatusBadge tone={isAccepted ? "confirmed" : isRejected ? "attention" : "private"}>
                              {isAccepted ? "Accepted / Verified" : isRejected ? "Rejected" : "Needs Review"}
                            </RecordStatusBadge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {proof.proofOriginalName} · <AttendanceProofTimestamp createdAt={proof.createdAt} />
                          </p>
                          {proof.matchedName ? (
                            <p className="mt-1.5 text-xs font-semibold text-foreground">
                              Matched Student: <span className="text-primary">{proof.matchedName}</span>
                            </p>
                          ) : null}
                          {proof.reviewSummary ? (
                            <div className="mt-2 rounded-xl bg-card/60 p-3 text-xs leading-relaxed text-foreground border border-border/60">
                              <p className="font-semibold text-muted-foreground mb-0.5">Submission Details / Reason:</p>
                              <p>{proof.reviewSummary}</p>
                            </div>
                          ) : null}
                        </div>
                        {proof.proofUrl && proof.proofUrl !== "attached" && proof.proofUrl !== "zoom-screenshot" ? (
                          <a href={proof.proofUrl} target="_blank" rel="noreferrer" className="signal-action inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-primary hover:bg-secondary">
                            <ExternalLink className="mr-1.5 size-3.5" />View Attachment
                          </a>
                        ) : null}
                      </div>
                      {isPending ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
                          {!proof.matchedSubjectStudentId ? (
                            <select aria-label={`Match student for ${proof.submittedName}`} defaultValue="" id={`sel-${proof.id}`} className="min-h-10 min-w-48 flex-1 rounded-xl border border-input bg-card px-3 text-xs text-foreground">
                              <option value="">Select Enrolled Student…</option>
                              {records.data?.map((record: any) => (
                                <option key={record.membershipId} value={record.membershipId}>{record.canonicalName}</option>
                              ))}
                            </select>
                          ) : null}
                          {isExcuse ? (
                            <Button
                              size="sm"
                              className="min-h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                              disabled={resolveProof.isPending}
                              onClick={() => {
                                const selEl = document.getElementById(`sel-${proof.id}`) as HTMLSelectElement | null;
                                const memId = proof.matchedSubjectStudentId || selEl?.value;
                                if (!memId) {
                                  toast.error("Please select a student from the roster first");
                                  return;
                                }
                                resolveProof.mutate({
                                  proofId: (isNumeric ? Number(proof.id) : proof.id) as any,
                                  decision: "accepted_excused",
                                  membershipId: (isNumeric ? Number(memId) : memId) as any,
                                });
                              }}
                            >
                              <Check className="mr-1 size-3.5" />Approve as Excused
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            className="min-h-10 rounded-xl font-bold text-xs"
                            disabled={resolveProof.isPending}
                            onClick={() => {
                              const selEl = document.getElementById(`sel-${proof.id}`) as HTMLSelectElement | null;
                              const memId = proof.matchedSubjectStudentId || selEl?.value;
                              if (!memId) {
                                toast.error("Please select a student from the roster first");
                                return;
                              }
                              resolveProof.mutate({
                                proofId: (isNumeric ? Number(proof.id) : proof.id) as any,
                                decision: "accepted_present",
                                membershipId: (isNumeric ? Number(memId) : memId) as any,
                              });
                            }}
                          >
                            <Check className="mr-1 size-3.5" />Approve as Present
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-10 rounded-xl text-xs"
                            disabled={resolveProof.isPending}
                            onClick={() => resolveProof.mutate({ proofId: (isNumeric ? Number(proof.id) : proof.id) as any, decision: "rejected" })}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!proofSubmissions.isLoading && !proofSubmissions.data?.length ? (
                  <div className="signal-inset p-6 text-center text-sm text-muted-foreground rounded-2xl">
                    No attendance proof or excuse submissions for this session yet.
                  </div>
                ) : null}
              </div>
            </section>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveScreen("main")}
                className="gap-2 font-semibold"
              >
                <ArrowLeft className="size-4" />
                ← Back to Attendance
              </Button>
            </div>
          </div>
        )}

        {/* Dedicated Context Screen: Messenger & Social Card Preview */}
        {activeScreen === "social" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveScreen("main")}
                className="gap-2 font-semibold"
              >
                <ArrowLeft className="size-4" />
                ← Back to Attendance
              </Button>
            </div>

            <section className="signal-panel p-5 sm:p-6 rounded-2xl">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Copy className="size-5" />
                </span>
                <div>
                  <p className="signal-kicker">Social Share Preview</p>
                  <h2 className="mt-1 text-xl font-bold tracking-[-0.04em]">Messenger & Social Card Preview</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Live dynamic preview of how this attendance session renders when shared across Messenger, Discord, Twitter, and Facebook.
                  </p>
                </div>
              </div>

              {session.data?.publishState === "published" && session.data?.publicId ? (
                <div className="mt-6 space-y-5">
                  {(() => {
                    const currentVersion = Math.max(...(records.data || []).map(r => r.version || 0), (session.data?.version as number) || 0, 1);
                    return (
                      <SocialPreviewCard
                        title={`[${subject.data?.code || "ATTENDANCE"}] Attendance ${formatShorthandDate(session.data.startsAt) || "Session"}`}
                        subjectCode={subject.data?.code}
                        type="attendance"
                        version={currentVersion}
                        present={totals.present}
                        absent={totals.absent}
                        excused={totals.excused}
                        date={new Date(session.data.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        description={`Class Attendance for ${subject.data?.code || "Class"} — ${subject.data?.name || "Operations Management"}. Present: ${totals.present}, Absent: ${totals.absent}, Excused: ${totals.excused}.`}
                        publicUrl={`${window.location.origin}/attendance/${session.data.publicId}`}
                      />
                    );
                  })()}

                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                    <Button type="button" onClick={copyPublicAttendance} className="gap-2">
                      <Copy className="size-4" />
                      Copy Messenger Link
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a href={`/attendance/${session.data.publicId}`} target="_blank" rel="noreferrer" className="gap-2 inline-flex items-center">
                        <ExternalLink className="size-4" />
                        View Public Attendance
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 signal-inset p-8 text-center rounded-2xl text-muted-foreground">
                  <p className="text-sm font-semibold text-foreground">Attendance not yet published</p>
                  <p className="mt-1 text-xs text-muted-foreground">Publish this session from the Attendance Desk to generate the live public link and dynamic preview card.</p>
                </div>
              )}
            </section>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveScreen("main")}
                className="gap-2 font-semibold"
              >
                <ArrowLeft className="size-4" />
                ← Back to Attendance
              </Button>
            </div>
          </div>
        )}
      </section>

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Quick Add to Subject Masterlist
            </DialogTitle>
            <DialogDescription>
              Add this student to the subject masterlist and mark them Present for this session.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickAddSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Zoom Source Name</Label>
              <p className="text-sm font-semibold text-foreground">{quickAddSuggestion?.sourceName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qa-lastName" className="text-xs">Last Name *</Label>
                <Input
                  id="qa-lastName"
                  value={quickAddDraft.lastName}
                  onChange={e => setQuickAddDraft(d => ({ ...d, lastName: e.target.value }))}
                  required
                  placeholder="e.g. Ambrocio"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qa-firstName" className="text-xs">First Name *</Label>
                <Input
                  id="qa-firstName"
                  value={quickAddDraft.firstName}
                  onChange={e => setQuickAddDraft(d => ({ ...d, firstName: e.target.value }))}
                  required
                  placeholder="e.g. Francheska"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="qa-middleName" className="text-xs">Middle Name / Initial</Label>
              <Input
                id="qa-middleName"
                value={quickAddDraft.middleName}
                onChange={e => setQuickAddDraft(d => ({ ...d, middleName: e.target.value }))}
                placeholder="e.g. Abvey or A."
              />
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setQuickAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={quickAddStudent.isPending || !quickAddDraft.lastName.trim() || !quickAddDraft.firstName.trim()}>
                {quickAddStudent.isPending ? "Adding..." : "Add & Mark Present"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Set / Edit No Class Dialog */}
      <Dialog open={noClassModalOpen} onOpenChange={setNoClassModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNoClass ? "Edit No Class Reason" : "Mark as No Class"}</DialogTitle>
            <DialogDescription>
              {isNoClass
                ? "Update the official suspension notice displayed on the public attendance page."
                : "Designate this session as No Class. Regular roll call and absence requirements will be suspended."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="att-no-class-reason">Reason</Label>
              <div className="flex flex-wrap gap-1.5 py-1">
                {NO_CLASS_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setNoClassReasonDraft(preset.reason)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border ${
                      noClassReasonDraft === preset.reason
                        ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold"
                        : "border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Input
                id="att-no-class-reason"
                value={noClassReasonDraft}
                onChange={e => setNoClassReasonDraft(e.target.value)}
                placeholder="Holiday, inclement weather, campus event, etc."
              />
            </div>
            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setNoClassModalOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={setNoClass.isPending || !noClassReasonDraft.trim()}
                onClick={() => {
                  setNoClass.mutate({
                    sessionId: sessionQueryParam,
                    noClass: true,
                    reason: noClassReasonDraft.trim(),
                    publish: true,
                  });
                  setNoClassModalOpen(false);
                }}
              >
                {isNoClass ? "Save Reason" : "Set as No Class"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Summary({ label, count, tone, percentage, className }: { label: string; count: number; tone: string; percentage?: number; className?: string }) {
  return (
    <section className={`signal-inset p-4 rounded-2xl border border-border/80 flex flex-col justify-between shadow-sm ${className || ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        {percentage !== undefined && (
          <span className="font-mono text-[11px] font-bold text-muted-foreground">{percentage}%</span>
        )}
      </div>
      <div className="mt-2">
        <p className={`font-[Manrope] text-2xl sm:text-3xl font-black tracking-tight ${tone}`}>{count}</p>
      </div>
    </section>
  );
}
