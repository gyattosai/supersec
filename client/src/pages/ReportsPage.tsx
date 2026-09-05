import DashboardLayout from "@/components/DashboardLayout";
import { formatDateTime12Hour } from "@/lib/time";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { downloadClassAttendancePdf, downloadCompiledAttendancePdf, downloadSubjectAttendancePdf } from "@/lib/reportPdf";
import { buildClassAttendanceCsv, buildClassAttendanceSummary, classAttendanceCsvFilename } from "@shared/attendanceCsv";
import { normalizedSubjectSelection } from "@shared/reportPdf";
import { AlertCircle, Archive, ArchiveRestore, ChartNoAxesCombined, CheckCircle2, CircleDashed, Copy, Download, FileDown, FilePlus2, Send, SquareCheckBig, XCircle, FileText, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSearch } from "wouter";

export default function ReportsPage() {
  const search = useSearch();
  const rawSessionId = new URLSearchParams(search).get("sessionId") || "";
  const hasSession = Boolean(rawSessionId && rawSessionId !== "0" && rawSessionId !== "NaN");
  const utils = trpc.useUtils();
  const report = trpc.reports.allSubjectAttendance.useQuery();
  const classReport = trpc.reports.classAttendance.useQuery({ sessionId: rawSessionId as any }, { enabled: hasSession });
  const reportList = trpc.reports.list.useQuery();
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Array<string | number>>([]);
  const [exporting, setExporting] = useState<string | null>(null);

  const refresh = () => utils.reports.list.invalidate();
  const create = trpc.reports.create.useMutation({
    onSuccess: () => { refresh(); toast.success("Report saved as draft"); },
    onError: error => toast.error(error.message),
  });
  const publish = trpc.reports.publish.useMutation({
    onSuccess: () => { refresh(); toast.success("Report published"); },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.reports.archive.useMutation({
    onSuccess: () => { refresh(); toast.success("Moved to Archive"); },
    onError: error => toast.error(error.message),
  });
  const restore = trpc.reports.restore.useMutation({
    onSuccess: () => { refresh(); toast.success("Restored as draft"); },
    onError: error => toast.error(error.message),
  });

  const totals = (report.data ?? []).reduce(
    (sum, item) => ({
      present: sum.present + item.present,
      absent: sum.absent + item.absent,
      excused: sum.excused + item.excused,
      conflict: sum.conflict + (item.conflict || 0),
      notSet: sum.notSet + item.notSet,
    }),
    { present: 0, absent: 0, excused: 0, conflict: 0, notSet: 0 }
  );

  const selectedSubjects = useMemo(
    () => normalizedSubjectSelection(report.data ?? [], selectedSubjectIds),
    [report.data, selectedSubjectIds]
  );
  const busy = create.isPending || publish.isPending || archive.isPending || restore.isPending;

  useEffect(() => {
    const available = new Set((report.data ?? []).map(item => String(item.subjectId)));
    setSelectedSubjectIds(current => current.filter(subjectId => available.has(String(subjectId))));
  }, [report.data]);

  const exportClassAttendance = () => {
    if (!classReport.data) return;
    const file = new Blob([buildClassAttendanceCsv(classReport.data.students)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const download = document.createElement("a");
    download.href = url;
    download.download = classAttendanceCsvFilename(classReport.data.subjectCode, new Date(classReport.data.startsAt));
    document.body.appendChild(download);
    download.click();
    download.remove();
    URL.revokeObjectURL(url);
    toast.success("Private attendance CSV downloaded");
  };

  const copyClassSummary = async () => {
    if (!classReport.data) return;
    try {
      await navigator.clipboard.writeText(
        buildClassAttendanceSummary({
          subjectCode: classReport.data.subjectCode,
          subjectName: classReport.data.subjectName,
          startsAt: new Date(classReport.data.startsAt),
          present: classReport.data.present,
          absent: classReport.data.absent,
          excused: classReport.data.excused,
          notSet: classReport.data.notSet,
        })
      );
      toast.success("Aggregate attendance summary copied");
    } catch {
      toast.error("Could not copy the attendance summary");
    }
  };

  const withPdfExport = async (key: string, action: () => Promise<void>) => {
    setExporting(key);
    try {
      await action();
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not create the PDF");
    } finally {
      setExporting(null);
    }
  };

  const toggleSubject = (subjectId: string | number) =>
    setSelectedSubjectIds(current =>
      current.includes(subjectId) ? current.filter(id => id !== subjectId) : [...current, subjectId]
    );

  const selectAllSubjects = () =>
    setSelectedSubjectIds(
      selectedSubjects.length === (report.data ?? []).length ? [] : (report.data ?? []).map(subject => subject.subjectId)
    );

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl">
        <WorkspacePageHeader
          eyebrow="Export & Analytics"
          title="Attendance Reports"
          description="Download verified records for a single session, a subject desk, or across all subjects for finals."
        />

        {/* Focused Session Hero if sessionId query param is passed */}
        {classReport.data ? (
          <section className="signal-panel mt-6 border-t-2 border-t-primary p-6 sm:p-7 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="signal-kicker">Session Report Focus</span>
                <h2 className="signal-heading mt-2 text-xl sm:text-2xl">
                  {classReport.data.subjectName} · <span className="text-primary">{classReport.data.subjectCode}</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime12Hour(classReport.data.startsAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyClassSummary}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Summary
                </Button>
                <Button variant="outline" size="sm" onClick={exportClassAttendance}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  CSV Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting === "session"}
                  onClick={() => withPdfExport("session", () => downloadClassAttendancePdf(classReport.data!))}
                >
                  <FileDown className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  {exporting === "session" ? "Preparing PDF…" : "Download PDF"}
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => create.mutate({ reportType: "class_attendance", subjectId: null, classSessionId: rawSessionId as any })}
                >
                  <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                  Save Report
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="glow-badge-emerald inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {classReport.data.present} Present
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                <span className="size-1.5 rounded-full bg-red-400" />
                {classReport.data.absent} Absent
              </span>
              <span className="glow-badge-sky inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                <span className="size-1.5 rounded-full bg-sky-400" />
                {classReport.data.excused} Excused
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
                <span className="size-1.5 rounded-full bg-purple-400" />
                {classReport.data.conflict} With Schedule Conflict
              </span>
              <span className="glow-badge-amber inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                <span className="size-1.5 rounded-full bg-amber-400" />
                {classReport.data.notSet} Not Set
              </span>
            </div>

            <section className="signal-inset mt-5 p-4 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">Official Student Roster Statuses</h3>
                <span className="signal-feature-chip">Private Secretary View</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Exported CSV and official PDF include Student names and statuses only. Private notes and excuse details remain confidential.
              </p>
              <div className="mt-3 max-h-64 divide-y divide-border/60 overflow-auto pr-1">
                {classReport.data.students.map(student => (
                  <div key={student.canonicalName} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-xs sm:text-sm font-semibold">{student.canonicalName}</span>
                    <StatusBadge status={student.status} />
                  </div>
                ))}
                {!classReport.data.students.length ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No active Students enrolled in this Subject.</p>
                ) : null}
              </div>
            </section>
          </section>
        ) : null}

        {/* Global KPI Stats Grid */}
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric icon={CheckCircle2} label="Total Present" value={totals.present} tone="text-emerald-400" />
          <Metric icon={XCircle} label="Total Absent" value={totals.absent} tone="text-red-400" />
          <Metric icon={FilePlus2} label="Total Excused" value={totals.excused} tone="text-sky-400" />
          <Metric icon={AlertCircle} label="Total Conflict" value={totals.conflict} tone="text-purple-400" />
          <Metric icon={CircleDashed} label="Pending Review" value={totals.notSet} tone="text-amber-400" />
        </div>

        {/* Subject-wide Attendance Summary Grid */}
        <section className="mt-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="signal-kicker">Multi-Subject Rollup</p>
              <div className="mt-1 flex items-center gap-2">
                <ChartNoAxesCombined className="h-5 w-5 text-primary" />
                <h2 className="signal-heading text-lg sm:text-xl font-bold">Subject Desks &amp; Compiled Export</h2>
              </div>
              <p className="mt-1.5 max-w-xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Select specific subjects to compile into a single term PDF report, or download individual subject PDFs directly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={selectAllSubjects} disabled={!report.data?.length}>
                <SquareCheckBig className="mr-1.5 h-3.5 w-3.5" />
                {selectedSubjects.length === (report.data ?? []).length && report.data?.length ? "Clear Selection" : "Select All"}
              </Button>
              <Button
                size="sm"
                disabled={!selectedSubjects.length || exporting === "compiled"}
                onClick={() => withPdfExport("compiled", () => downloadCompiledAttendancePdf(selectedSubjects))}
                className="shadow-sm shadow-primary/20"
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
                {exporting === "compiled" ? "Preparing PDF…" : `Download (${selectedSubjects.length || 0}) Selected`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => create.mutate({ reportType: "all_subject_attendance", subjectId: null, classSessionId: null })}
              >
                <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                Save All-Subject Draft
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {report.isLoading ? (
              <p className="py-8 text-center text-xs sm:text-sm text-muted-foreground">Loading subject metrics…</p>
            ) : null}
            {report.data?.map(item => {
              const selected = selectedSubjectIds.includes(item.subjectId);
              return (
                <div key={item.subjectId} className={`signal-card-shell ${selected ? "!bg-primary/30" : ""}`}>
                  <article className={`signal-record-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 transition-colors ${selected ? "!bg-primary/5" : ""}`}>
                    <label className="flex min-w-0 cursor-pointer items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSubject(item.subjectId)}
                        className="mt-1 size-4 rounded accent-primary"
                        aria-label={`Include ${item.subjectName} in compiled PDF`}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-sm sm:text-base tracking-[-0.02em]">{item.subjectName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground font-medium">{item.subjectCode}</p>
                      </div>
                    </label>
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                          {item.present} present
                        </span>
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-400">
                          {item.absent} absent
                        </span>
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-400">
                          {item.excused} excused
                        </span>
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                          {item.notSet} not set
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={exporting === `subject-${item.subjectId}`}
                        onClick={() => withPdfExport(`subject-${item.subjectId}`, () => downloadSubjectAttendancePdf(item))}
                      >
                        <FileDown className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        {exporting === `subject-${item.subjectId}` ? "Preparing…" : "PDF"}
                      </Button>
                    </div>
                  </article>
                </div>
              );
            })}
            {!report.isLoading && !report.data?.length ? (
              <div className="signal-inset py-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
                <p className="mt-3 text-sm font-semibold text-foreground">No subjects or attendance data yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Add active subjects and attendance records to see your aggregate report summaries.</p>
              </div>
            ) : null}
          </div>
        </section>

        {/* Retained Reports Section */}
        <section className="mt-8 pt-4 border-t border-border/80">
          <p className="signal-kicker">Retained Artifacts</p>
          <h2 className="signal-heading mt-1 text-lg sm:text-xl font-bold">Saved &amp; Published Reports</h2>
          <div className="mt-4 grid gap-3">
            {reportList.data?.map(item => (
              <ReportRow
                key={item.id}
                item={item}
                busy={busy}
                onPublish={() => publish.mutate({ id: item.id })}
                onArchive={() => archive.mutate({ id: item.id })}
                onRestore={() => restore.mutate({ id: item.id })}
              />
            ))}
            {!reportList.data?.length ? (
              <div className="signal-inset py-8 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">No saved report records yet. Click &quot;Save Report&quot; above to create a versioned snapshot.</p>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </DashboardLayout>
  );
}

function ReportRow({
  item,
  busy,
  onPublish,
  onArchive,
  onRestore,
}: {
  item: {
    id: number | string;
    publicId: string;
    reportType: "class_attendance" | "all_subject_attendance";
    publishState: "draft" | "published" | "archived";
    version: number;
    subjectName: string | null;
    subjectCode: string | null;
    sessionStartsAt: Date | null;
    generatedAt: Date;
  };
  busy: boolean;
  onPublish: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/reports/${item.publicId}`);
    toast.success("Public report link copied for Messenger");
  };
  const title = item.reportType === "class_attendance" ? "Class Attendance Report" : "All-Subject Aggregate Report";
  const detail =
    item.reportType === "class_attendance"
      ? `${item.subjectCode ?? "Subject"}${item.subjectName ? ` · ${item.subjectName}` : ""}${
          item.sessionStartsAt ? ` · ${formatDateTime12Hour(item.sessionStartsAt)}` : ""
        }`
      : `All active Subjects · Snapshot created ${new Date(item.generatedAt).toLocaleDateString()}`;

  return (
    <div className="signal-card-shell">
      <article className="signal-record-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground font-medium">Version {item.version}</p>
          </div>
          <RecordStatusBadge tone={item.publishState === "published" ? "published" : item.publishState === "archived" ? "archived" : "draft"}>
            {item.publishState}
          </RecordStatusBadge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {item.publishState === "draft" ? (
            <Button size="sm" disabled={busy} onClick={onPublish}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Publish Shared View
            </Button>
          ) : null}
          {item.publishState === "published" ? (
            <>
              <a
                href={`/reports/${item.publicId}`}
                target="_blank"
                rel="noreferrer"
                className="signal-action inline-flex min-h-9 items-center rounded-lg border border-border bg-secondary/40 px-3 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                View Shared Page
              </a>
              <Button type="button" variant="ghost" size="sm" onClick={copy} className="text-primary hover:bg-primary/10">
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onArchive}
                disabled={busy}
                className="text-muted-foreground hover:text-foreground"
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Archive
              </Button>
            </>
          ) : null}
          {item.publishState === "archived" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRestore}
              disabled={busy}
            >
              <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
              Restore as Draft
            </Button>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function StatusBadge({ status }: { status: "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET" }) {
  const tone =
    status === "PRESENT"
      ? "text-emerald-400 bg-emerald-500/10"
      : status === "ABSENT"
      ? "text-red-400 bg-red-500/10"
      : status === "EXCUSED"
      ? "text-sky-400 bg-sky-500/10"
      : status === "CONFLICT"
      ? "text-purple-400 bg-purple-500/10"
      : "text-amber-400 bg-amber-500/10";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone}`}>
      {status === "NOT_SET" ? "Not set" : status === "CONFLICT" ? "With Schedule Conflict" : status[0] + status.slice(1).toLowerCase()}
    </span>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof CheckCircle2; label: string; value: number; tone: string }) {
  return (
    <div className="signal-stat-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className={`mt-2 font-[Manrope] text-2xl font-black tracking-[-0.06em] ${tone} sm:text-3xl`}>
        {value}
      </p>
    </div>
  );
}

