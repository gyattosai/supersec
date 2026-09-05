import { AnnouncementEditor } from "@/components/AnnouncementEditor";
import DashboardLayout from "@/components/DashboardLayout";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { sortStudents, type StudentSortMode } from "@shared/attendanceSorting";
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  formatConflictDaysSummary,
  type StudentConflictConfig,
} from "@shared/scheduleConflict";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Filter,
  Pencil,
  Search,
  Sparkles,
  Upload,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useRoute } from "wouter";
import * as XLSX from "xlsx";
import { BulkActionBar, BulkCheckbox } from "@/components/BulkActionBar";

type StudentDraft = { firstName: string; middleName: string; lastName: string; privateNotes: string };
type IntakeFeedback = { added: number; reactivated: number; skipped: number; processed: number } | null;
const blankStudent: StudentDraft = { firstName: "", middleName: "", lastName: "", privateNotes: "" };

function displayName(student: { firstName?: string | null; middleName?: string | null; lastName?: string | null; canonicalName: string }) {
  return student.firstName && student.lastName
    ? `${student.lastName}, ${student.firstName}${student.middleName ? ` ${student.middleName}` : ""}`
    : student.canonicalName;
}

function getInitials(student: { firstName?: string | null; lastName?: string | null; canonicalName?: string }) {
  if (student.firstName && student.lastName) {
    return `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
  }
  const parts = (student.canonicalName || "").split(/[\s,]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || "ST";
}

export function FocusedStudentsPage(props?: { params?: { subjectId?: string } }) {
  const [, routeParams] = useRoute("/app/subjects/:subjectId/students");
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
  const students = trpc.subjects.students.list.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject });
  const utils = trpc.useUtils();

  const [intakeOpen, setIntakeOpen] = useState(false);
  const [mode, setMode] = useState<"import" | "single">("import");
  const [sourceText, setSourceText] = useState("");
  const [candidates, setCandidates] = useState<StudentDraft[]>([]);
  const [singleStudent, setSingleStudent] = useState<StudentDraft>(blankStudent);
  const [editingMembershipId, setEditingMembershipId] = useState<number | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentDraft>(blankStudent);
  const [feedback, setFeedback] = useState<IntakeFeedback>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "CONFLICT" | "NOTES">("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllStudents = () => {
    const allIds = new Set((students.data ?? []).map(s => String((s as any).membershipId || (s as any).id)));
    setSelectedIds(allIds);
  };
  const deselectAll = () => setSelectedIds(new Set());
  const allSelected = selectedIds.size > 0 && selectedIds.size === (students.data?.length ?? 0);

  const refresh = async () => {
    await utils.subjects.students.list.invalidate({ subjectId: subjectQueryParam as any });
    await utils.subjects.students.list.invalidate();
  };

  const add = trpc.subjects.students.add.useMutation({
    onSuccess: () => {
      refresh();
      setSingleStudent(blankStudent);
      setIntakeOpen(false);
      toast.success("Student added to master list");
    },
    onError: error => toast.error(error.message),
  });

  const reviewImport = trpc.subjects.students.reviewBulkImport.useMutation({
    onSuccess: output => {
      setCandidates(output.candidates.map(candidate => ({ ...candidate, privateNotes: "" })));
      setAiUsed(output.aiUsed);
      setFeedback(null);
    },
    onError: error => toast.error(error.message),
  });

  const addBulk = trpc.subjects.students.addBulk.useMutation({
    onSuccess: output => {
      refresh();
      setCandidates([]);
      setSourceText("");
      setFeedback(output);
      toast.success(`${output.added + output.reactivated} Students enrolled`);
    },
    onError: error => toast.error(error.message),
  });

  const update = trpc.subjects.students.update.useMutation({
    onSuccess: () => {
      refresh();
      setEditingMembershipId(null);
      toast.success("Student record updated");
    },
    onError: error => toast.error(error.message),
  });

  const remove = trpc.subjects.students.remove.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Student removed from this Subject");
    },
    onError: error => toast.error(error.message),
  });

  const setScheduleConflict = trpc.subjects.students.setScheduleConflict.useMutation({
    onSuccess: (_result, input) => {
      refresh();
      toast.success(input.hasScheduleConflict ? "Schedule conflict marked (defaults Present)" : "Schedule conflict cleared");
    },
    onError: error => toast.error(error.message),
  });

  const [studentSort, setStudentSort] = useState<StudentSortMode>("last-name");

  const rawActiveStudents = students.data?.filter(student => student.state === "active") ?? [];
  const sortedStudents = useMemo(() => sortStudents(rawActiveStudents, studentSort), [rawActiveStudents, studentSort]);

  const filteredStudents = useMemo(() => {
    return sortedStudents.filter(student => {
      if (filterTab === "CONFLICT" && !student.hasScheduleConflict) return false;
      if (filterTab === "NOTES" && !student.privateNotes) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = displayName(student).toLowerCase();
      const notes = (student.privateNotes || "").toLowerCase();
      return name.includes(q) || notes.includes(q);
    });
  }, [sortedStudents, filterTab, searchQuery]);

  const conflictCount = rawActiveStudents.filter(s => s.hasScheduleConflict).length;
  const notesCount = rawActiveStudents.filter(s => Boolean(s.privateNotes)).length;

  const openIntake = (nextMode: "import" | "single") => {
    setMode(nextMode);
    setFeedback(null);
    setCandidates([]);
    setIntakeOpen(true);
  };

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        setSourceText(XLSX.utils.sheet_to_csv(sheet, { blankrows: false }));
      } else {
        setSourceText(await file.text());
      }
      setCandidates([]);
      setFeedback(null);
      toast.success(`${file.name} ready for review`);
    } catch {
      toast.error("Could not read spreadsheet. Try CSV, Excel, or pasted rows.");
    }
    event.target.value = "";
  };

  const submitSingle = (event: FormEvent) => {
    event.preventDefault();
    if (singleStudent.firstName.trim() && singleStudent.lastName.trim()) {
      add.mutate({ subjectId: subjectQueryParam as any, student: singleStudent });
    }
  };

  const pendingRemove = (membershipId: number) => remove.isPending && remove.variables?.membershipId === membershipId;
  const pendingConflict = (membershipId: number) => setScheduleConflict.isPending && setScheduleConflict.variables?.membershipId === membershipId;

  const [conflictDialogStudent, setConflictDialogStudent] = useState<any | null>(null);
  const [conflictDays, setConflictDays] = useState<number[]>([]);
  const [conflictAutoPresent, setConflictAutoPresent] = useState<boolean>(true);
  const [conflictReason, setConflictReason] = useState<string>("");

  const subjectMeetingDays: number[] = useMemo(() => {
    return subject.data?.meetingDays?.map((m: any) => Number(m.weekday)) || [];
  }, [subject.data]);

  const openConflictDialog = (student: any) => {
    const currentConfig: StudentConflictConfig | null | undefined = student.conflictConfig;
    setConflictDialogStudent(student);
    if (currentConfig?.days && currentConfig.days.length > 0) {
      setConflictDays([...currentConfig.days]);
      setConflictAutoPresent(currentConfig.autoPresent !== false);
      setConflictReason(currentConfig.reason || "");
    } else {
      setConflictDays(subjectMeetingDays.length > 0 ? [...subjectMeetingDays] : [1, 3]);
      setConflictAutoPresent(true);
      setConflictReason("");
    }
  };

  const toggleConflictDay = (day: number) => {
    setConflictDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSaveConflict = async () => {
    if (!conflictDialogStudent) return;
    const config: StudentConflictConfig = {
      days: conflictDays,
      autoPresent: conflictAutoPresent,
      reason: conflictReason.trim() || null,
    };
    await setScheduleConflict.mutateAsync({
      membershipId: conflictDialogStudent.membershipId,
      hasScheduleConflict: true,
      conflictConfig: config,
    });
    setConflictDialogStudent(null);
  };

  const handleRemoveConflict = async () => {
    if (!conflictDialogStudent) return;
    await setScheduleConflict.mutateAsync({
      membershipId: conflictDialogStudent.membershipId,
      hasScheduleConflict: false,
      conflictConfig: null,
    });
    setConflictDialogStudent(null);
  };

  if (!subject.data && !subject.isLoading) {
    return (
      <DashboardLayout>
        <section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center">
          <div className="signal-panel border-t-2 border-primary p-8 text-center rounded-2xl">
            <Users className="mx-auto size-8 text-primary mb-3" />
            <h1 className="signal-heading text-xl font-bold">Subject unavailable</h1>
            <Button asChild className="mt-6 rounded-xl font-bold">
              <Link href="/app/subjects">Back to Subjects</Link>
            </Button>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl space-y-6 pb-16">
        <WorkspacePageHeader
          eyebrow="Subject Master List"
          title="Students (Master List)"
          description="Maintain enrolled students, assign schedule conflict defaults, and record private secretary notes."
          back={
            <Link
              href={`/app/subjects/${subjectId}`}
              className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Subject
            </Link>
          }
          action={
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
              {rawActiveStudents.length} Enrolled
            </span>
          }
        />

        {/* Live Roster Metrics HUD */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="signal-hud-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Enrolled</span>
              <Users className="size-4 text-sky-400" />
            </div>
            <p className="mt-2 font-[Manrope] text-2xl sm:text-3xl font-black text-foreground">
              {rawActiveStudents.length}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Active roster students</p>
          </div>

          <div className="signal-hud-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Schedule Conflicts</span>
              <AlertTriangle className="size-4 text-amber-400" />
            </div>
            <p className="mt-2 font-[Manrope] text-2xl sm:text-3xl font-black text-amber-400">
              {conflictCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Auto-defaults to Present</p>
          </div>

          <div className="signal-hud-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Private Notes</span>
              <FileText className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-[Manrope] text-2xl sm:text-3xl font-black text-foreground">
              {notesCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Secretary records</p>
          </div>
        </div>

        {/* Roster Intake Action Banner */}
        <section className="signal-hero-banner p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="space-y-1 max-w-lg">
            <div className="flex items-center gap-2">
              <span className="signal-kicker">Roster Intake</span>
              <span className="glow-badge-orange text-[10px] px-2 py-0.5 rounded-full font-bold">
                AI Enabled
              </span>
            </div>
            <h2 className="signal-heading text-lg sm:text-xl font-bold mt-1">Enroll New Classmates</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Import entire classes from Google Sheets, Excel, or CSV files with AI name structuring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
            <Button
              onClick={() => openIntake("import")}
              className="rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 text-xs sm:text-sm"
            >
              <FileSpreadsheet className="mr-1.5 size-4" />
              Import Spreadsheet
            </Button>
            <Button
              variant="outline"
              onClick={() => openIntake("single")}
              className="rounded-xl text-xs sm:text-sm font-semibold"
            >
              <UserPlus className="mr-1.5 size-4" />
              Add One Student
            </Button>
          </div>
        </section>

        {/* Search, Filter & Sort Toolbar */}
        <div className="signal-panel p-4 sm:p-5 rounded-2xl space-y-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by student name or note…"
                className="min-h-10 w-full rounded-xl border border-input bg-card pl-10 pr-8 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
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

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="student-sort" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Sort:
              </label>
              <select
                id="student-sort"
                value={studentSort}
                onChange={event => setStudentSort(event.target.value as StudentSortMode)}
                className="min-h-10 rounded-xl border border-input bg-card px-3 text-xs sm:text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="last-name">Last name (A–Z)</option>
                <option value="first-name">First name (A–Z)</option>
                <option value="conflict">Schedule conflicts first</option>
                <option value="notes">With private notes first</option>
              </select>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTab("ALL")}
                className={`signal-action min-h-10 sm:min-h-8 inline-flex items-center rounded-lg px-3 py-1.5 font-bold transition-all ${
                  filterTab === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground bg-secondary/50"
                }`}
              >
                All ({rawActiveStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("CONFLICT")}
                className={`signal-action min-h-10 sm:min-h-8 inline-flex items-center rounded-lg px-3 py-1.5 font-bold transition-all ${
                  filterTab === "CONFLICT"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground bg-secondary/50"
                }`}
              >
                Schedule Conflicts ({conflictCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("NOTES")}
                className={`signal-action min-h-10 sm:min-h-8 inline-flex items-center rounded-lg px-3 py-1.5 font-bold transition-all ${
                  filterTab === "NOTES"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground bg-secondary/50"
                }`}
              >
                Has Notes ({notesCount})
              </button>
            </div>

            <span className="text-muted-foreground font-mono text-[11px]">
              Showing {filteredStudents.length} of {rawActiveStudents.length}
            </span>
          </div>
        </div>

        {/* Student Cards List */}
        <div className="space-y-3">
          {students.isLoading ? (
            <div className="signal-inset py-16 text-center text-xs text-muted-foreground rounded-2xl animate-pulse">
              Loading enrolled students roster…
            </div>
          ) : (
            filteredStudents.map(student => {
              const sId = String((student as any).membershipId || (student as any).id);
              const changingConflict = pendingConflict(student.membershipId);
              const removing = pendingRemove(student.membershipId);
              const initials = getInitials(student);

              return (
                <article
                  key={student.membershipId}
                  className={`signal-record-card group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${
                    student.hasScheduleConflict
                      ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
                      : "border-border/80 bg-card hover:border-primary/40 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="pt-1.5 shrink-0">
                      <BulkCheckbox
                        checked={selectedIds.has(sId)}
                        onCheckedChange={() => toggleStudent(sId)}
                        label={`Select ${student.firstName} ${student.lastName}`}
                      />
                    </div>

                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-black text-foreground border border-border group-hover:border-primary/40 group-hover:text-primary transition-colors">
                      {initials}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {displayName(student)}
                        </h3>
                        {student.hasScheduleConflict ? (
                          <button
                            type="button"
                            onClick={() => openConflictDialog(student)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25 hover:border-purple-500/50 shadow-sm"
                            title={student.conflictConfig?.reason ? `Reason: ${student.conflictConfig.reason}` : "Click to edit schedule conflict"}
                          >
                            <Clock className="size-3 shrink-0" />
                            <span>
                              Conflict · {formatConflictDaysSummary(student.conflictConfig?.days, subjectMeetingDays)}
                            </span>
                            <span className="opacity-80 font-normal">
                              ({student.conflictConfig?.autoPresent !== false ? "Auto-Present" : "Conflict Status"})
                            </span>
                          </button>
                        ) : null}
                      </div>

                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {student.firstName || "First name missing"}
                        {student.middleName ? ` · ${student.middleName}` : ""} ·{" "}
                        {student.lastName || "Last name missing"}
                      </p>

                      {student.privateNotes ? (
                        <p className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                          <FileText className="size-3.5 shrink-0" />
                          <span className="truncate max-w-md">{student.privateNotes}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60 w-full sm:w-auto justify-start sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingMembershipId(student.membershipId);
                        setEditingStudent({
                          firstName: student.firstName || "",
                          middleName: student.middleName || "",
                          lastName: student.lastName || "",
                          privateNotes: student.privateNotes || "",
                        });
                      }}
                      className="rounded-xl text-xs font-semibold"
                    >
                      <Pencil className="mr-1.5 size-3.5" />
                      Edit Record
                    </Button>

                    <Button
                      type="button"
                      variant={student.hasScheduleConflict ? "secondary" : "outline"}
                      size="sm"
                      aria-busy={changingConflict || undefined}
                      disabled={setScheduleConflict.isPending}
                      onClick={() => openConflictDialog(student)}
                      className={`rounded-xl text-xs font-semibold ${
                        student.hasScheduleConflict
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25"
                          : ""
                      }`}
                    >
                      <Clock className="mr-1.5 size-3.5" />
                      {changingConflict
                        ? "Saving…"
                        : student.hasScheduleConflict
                        ? "Edit Conflict"
                        : "Set Conflict"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-busy={removing || undefined}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ membershipId: student.membershipId })}
                      className="rounded-xl text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Remove from Subject"
                    >
                      <UserMinus className="size-3.5" />
                    </Button>
                  </div>
                </article>
              );
            })
          )}

          {!students.isLoading && !filteredStudents.length ? (
            <div className="signal-panel p-10 text-center rounded-2xl border-t-2 border-primary space-y-3">
              <Users className="mx-auto size-8 text-muted-foreground" />
              <h3 className="font-bold text-sm text-foreground">No students match your criteria</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery || filterTab !== "ALL"
                  ? "Try resetting your search query or switching filter tabs."
                  : "No students are enrolled in this subject master list yet."}
              </p>
              {searchQuery || filterTab !== "ALL" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterTab("ALL");
                  }}
                  className="signal-action inline-flex min-h-9 items-center rounded-xl bg-secondary px-4 text-xs font-bold text-foreground"
                >
                  Reset Filters
                </button>
              ) : (
                <Button onClick={() => openIntake("import")} className="rounded-xl font-bold mt-2">
                  <FileSpreadsheet className="mr-1.5 size-4" />
                  Import First Roster
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {/* Spreadsheet Intake Dialog */}
        <Dialog open={intakeOpen} onOpenChange={setIntakeOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {mode === "import" ? "Import Students from Spreadsheet" : "Add Single Student"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {mode === "import"
                  ? "Upload CSV/Excel or paste roster rows. AI organizes names automatically."
                  : "Create a structured student record. Names are formatted as Last, First Middle."}
              </DialogDescription>
            </DialogHeader>

            <div className="signal-inset flex p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode("import")}
                className={`signal-action min-h-10 flex-1 rounded-lg text-xs font-bold transition-all ${
                  mode === "import" ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"
                }`}
              >
                Spreadsheet Import
              </button>
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`signal-action min-h-10 flex-1 rounded-lg text-xs font-bold transition-all ${
                  mode === "single" ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"
                }`}
              >
                Single Student Form
              </button>
            </div>

            {mode === "import" ? (
              <div className="mt-4 space-y-4">
                <label className="signal-inset flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/40 p-4 text-center transition-all">
                  <Upload className="size-5 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Upload CSV, TSV, XLS, or XLSX
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Drag and drop or browse files
                  </span>
                  <input type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="sr-only" onChange={readFile} />
                </label>

                <div>
                  <Label htmlFor="student-import-text" className="text-xs font-bold text-foreground">
                    Or Paste Spreadsheet Rows
                  </Label>
                  <Textarea
                    id="student-import-text"
                    value={sourceText}
                    onChange={event => {
                      setSourceText(event.target.value);
                      setCandidates([]);
                    }}
                    className="mt-2 min-h-36 rounded-xl font-mono text-xs"
                    placeholder={"Dela Cruz, Juan M.\nSantos, Maria A.\n\nOr copy/paste columns from Google Sheets / Excel"}
                  />
                </div>

                {candidates.length ? (
                  <div className="signal-inset border-primary/35 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                      <Sparkles className="size-3.5" />
                      <span>Review {candidates.length} AI-Structured Candidates</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border/60">
                      {candidates.map((candidate, index) => (
                        <div key={`${candidate.lastName}-${candidate.firstName}-${index}`} className="px-3 py-2 text-xs flex items-center justify-between">
                          <span className="font-bold text-foreground">
                            {candidate.lastName}, {candidate.firstName}
                            {candidate.middleName ? ` ${candidate.middleName}` : ""}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">Row {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {feedback ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" />
                      {feedback.added + feedback.reactivated} Students enrolled or restored.
                    </p>
                    {feedback.skipped ? (
                      <p className="text-muted-foreground text-[11px]">
                        {feedback.skipped} duplicate or already-enrolled students skipped.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIntakeOpen(false)}>
                    Done
                  </Button>
                  {candidates.length ? (
                    <Button
                      disabled={addBulk.isPending}
                      className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      onClick={() => addBulk.mutate({ subjectId: subjectQueryParam as any, students: candidates })}
                    >
                      {addBulk.isPending ? "Enrolling Candidates…" : `Enroll ${candidates.length} Students`}
                    </Button>
                  ) : (
                    <Button
                      disabled={reviewImport.isPending || !sourceText.trim()}
                      className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      onClick={() => reviewImport.mutate({ sourceText })}
                    >
                      {reviewImport.isPending ? "AI Structuring Names…" : "Review with AI"}
                    </Button>
                  )}
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={submitSingle} className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First name" id="student-first-name">
                    <Input
                      id="student-first-name"
                      required
                      value={singleStudent.firstName}
                      onChange={event => setSingleStudent(current => ({ ...current, firstName: event.target.value }))}
                      placeholder="e.g. Juan"
                      className="rounded-xl h-11"
                    />
                  </Field>
                  <Field label="Middle name (optional)" id="student-middle-name">
                    <Input
                      id="student-middle-name"
                      value={singleStudent.middleName}
                      onChange={event => setSingleStudent(current => ({ ...current, middleName: event.target.value }))}
                      placeholder="e.g. Mercado"
                      className="rounded-xl h-11"
                    />
                  </Field>
                </div>

                <Field label="Last name" id="student-last-name">
                  <Input
                    id="student-last-name"
                    required
                    value={singleStudent.lastName}
                    onChange={event => setSingleStudent(current => ({ ...current, lastName: event.target.value }))}
                    placeholder="e.g. Dela Cruz"
                    className="rounded-xl h-11"
                  />
                </Field>

                <div>
                  <Label className="text-xs font-bold text-foreground">Private Secretary Note (optional)</Label>
                  <AnnouncementEditor
                    id="student-private-note"
                    label="Private Student note"
                    value={singleStudent.privateNotes}
                    onChange={value => setSingleStudent(current => ({ ...current, privateNotes: value }))}
                    placeholder="Add an internal reference note for this student."
                    helperText="This note stays private to the secretary workspace and is never published."
                    minHeightClassName="min-h-32"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIntakeOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    disabled={add.isPending || !singleStudent.firstName.trim() || !singleStudent.lastName.trim()}
                  >
                    {add.isPending ? "Adding Student…" : "Add Student"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Student Record Modal */}
        <Dialog
          open={editingMembershipId !== null}
          onOpenChange={open => {
            if (!open) setEditingMembershipId(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Edit Student Record</DialogTitle>
              <DialogDescription className="text-xs">
                Update structured names or private secretary notes.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={event => {
                event.preventDefault();
                if (editingMembershipId && editingStudent.firstName.trim() && editingStudent.lastName.trim())
                  update.mutate({ membershipId: editingMembershipId, student: editingStudent });
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name" id="edit-first-name">
                  <Input
                    id="edit-first-name"
                    required
                    value={editingStudent.firstName}
                    onChange={event => setEditingStudent(current => ({ ...current, firstName: event.target.value }))}
                    className="rounded-xl h-11"
                  />
                </Field>
                <Field label="Middle name (optional)" id="edit-middle-name">
                  <Input
                    id="edit-middle-name"
                    value={editingStudent.middleName}
                    onChange={event => setEditingStudent(current => ({ ...current, middleName: event.target.value }))}
                    className="rounded-xl h-11"
                  />
                </Field>
              </div>

              <Field label="Last name" id="edit-last-name">
                <Input
                  id="edit-last-name"
                  required
                  value={editingStudent.lastName}
                  onChange={event => setEditingStudent(current => ({ ...current, lastName: event.target.value }))}
                  className="rounded-xl h-11"
                />
              </Field>

              <div>
                <Label className="text-xs font-bold text-foreground">Private Secretary Note</Label>
                <AnnouncementEditor
                  id="edit-student-private-note"
                  label="Private Student note"
                  value={editingStudent.privateNotes}
                  onChange={value => setEditingStudent(current => ({ ...current, privateNotes: value }))}
                  placeholder="Add a private reference note for the secretary."
                  helperText="This note stays private to the secretary workspace and is never shown on shared pages."
                  minHeightClassName="min-h-32"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditingMembershipId(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  disabled={update.isPending || !editingStudent.firstName.trim() || !editingStudent.lastName.trim()}
                >
                  {update.isPending ? "Saving changes…" : "Save Record"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Schedule Conflict Configuration Modal */}
        <Dialog open={Boolean(conflictDialogStudent)} onOpenChange={open => !open && setConflictDialogStudent(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Clock className="size-4" />
                </span>
                <DialogTitle className="text-base font-bold text-foreground">
                  Schedule Conflict Settings
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure conflict days and automated attendance for{" "}
                <span className="font-semibold text-foreground">
                  {conflictDialogStudent ? displayName(conflictDialogStudent) : "Student"}
                </span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Subject Schedule Context */}
              <div className="rounded-xl border border-border/80 bg-secondary/40 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <Calendar className="size-3.5 text-primary" />
                    Subject Schedule
                  </span>
                  <span className="text-[11px] text-foreground font-bold">
                    {subjectMeetingDays.length > 0
                      ? subjectMeetingDays.map(d => WEEKDAY_SHORT[d]).join(", ")
                      : "No scheduled days set"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  On non-conflict days, this student attends normally for regular roll call.
                </p>
              </div>

              {/* Day Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Conflict Days ({conflictDays.length})
                  </Label>
                  <div className="flex items-center gap-1.5">
                    {subjectMeetingDays.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setConflictDays([...subjectMeetingDays])}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        All Class Days
                      </button>
                    ) : null}
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={() => setConflictDays([0, 1, 2, 3, 4, 5, 6])}
                      className="text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Every Day
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const isSelected = conflictDays.includes(day);
                    const isSubjectDay = subjectMeetingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleConflictDay(day)}
                        className={`relative flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? "border-purple-500/60 bg-purple-500/20 text-purple-200 shadow-sm shadow-purple-500/20"
                            : "border-border/70 bg-card text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                        }`}
                      >
                        <span>{WEEKDAY_SHORT[day]}</span>
                        {isSubjectDay ? (
                          <span
                            className={`mt-1 size-1 rounded-full ${
                              isSelected ? "bg-purple-300" : "bg-primary"
                            }`}
                            title="Subject meets on this day"
                          />
                        ) : (
                          <span className="mt-1 size-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {conflictDays.length === 0 ? (
                  <p className="text-[11px] text-destructive font-medium">
                    Please select at least one day for the conflict schedule.
                  </p>
                ) : null}
              </div>

              {/* Attendance Behavior */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Attendance on Conflict Days
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConflictAutoPresent(true)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      conflictAutoPresent
                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-100 shadow-sm shadow-emerald-500/20"
                        : "border-border/70 bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2
                      className={`size-4 shrink-0 mt-0.5 ${
                        conflictAutoPresent ? "text-emerald-400" : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold">Auto-Present</div>
                      <div className="text-[11px] opacity-80 leading-tight mt-0.5">
                        Defaults to Present on conflict days
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConflictAutoPresent(false)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      !conflictAutoPresent
                        ? "border-purple-500/60 bg-purple-500/15 text-purple-100 shadow-sm shadow-purple-500/20"
                        : "border-border/70 bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <AlertTriangle
                      className={`size-4 shrink-0 mt-0.5 ${
                        !conflictAutoPresent ? "text-purple-400" : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold">With Conflict</div>
                      <div className="text-[11px] opacity-80 leading-tight mt-0.5">
                        Status defaults to Conflict
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Optional Reason */}
              <div className="space-y-1.5">
                <Label htmlFor="conflict-reason-input" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Reason / Overlap Details (Optional)
                </Label>
                <Input
                  id="conflict-reason-input"
                  value={conflictReason}
                  onChange={e => setConflictReason(e.target.value)}
                  placeholder="e.g. Working student / Overlaps with CS 101 lab"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-border/60">
              {conflictDialogStudent?.hasScheduleConflict ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={setScheduleConflict.isPending}
                  onClick={handleRemoveConflict}
                  className="rounded-xl text-xs sm:mr-auto"
                >
                  Clear Conflict
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setConflictDialogStudent(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={setScheduleConflict.isPending || conflictDays.length === 0}
                onClick={handleSaveConflict}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              >
                {setScheduleConflict.isPending ? "Saving…" : "Save Conflict Settings"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={students.data?.length ?? 0}
          onSelectAll={selectAllStudents}
          onDeselectAll={deselectAll}
          allSelected={allSelected}
          noun="Student"
        >
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold"
            onClick={async () => {
              const ids = Array.from(selectedIds);
              for (const id of ids) {
                const num = Number(id);
                const isNum = !isNaN(num) && num > 0;
                await setScheduleConflict.mutateAsync({ membershipId: (isNum ? num : id) as any, hasScheduleConflict: true });
              }
              deselectAll();
            }}
          >
            Mark Schedule Conflict
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="rounded-xl text-xs font-semibold"
            onClick={async () => {
              const ids = Array.from(selectedIds);
              for (const id of ids) {
                const num = Number(id);
                const isNum = !isNaN(num) && num > 0;
                await remove.mutateAsync({ membershipId: (isNum ? num : id) as any });
              }
              deselectAll();
            }}
          >
            <UserMinus className="mr-1.5 size-3.5" />
            Remove Selected ({selectedIds.size})
          </Button>
        </BulkActionBar>
      </section>
    </DashboardLayout>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}
