import DashboardLayout from "@/components/DashboardLayout";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { WorkspaceFormFooter } from "@/components/WorkspaceFormFooter";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChartNoAxesCombined, Check, ClipboardPaste, Copy, ExternalLink, Sparkles, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const statusOptions = ["PRESENT", "ABSENT", "NOT_SET"] as const;
const statusFilters = ["ALL", ...statusOptions] as const;
const localDateTimeValue = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export default function AttendancePage() {
  const [, params] = useRoute("/app/attendance/:sessionId");
  const sessionId = Number(params?.sessionId);
  const utils = trpc.useUtils();
  const session = trpc.attendance.session.useQuery({ sessionId }, { enabled: Number.isFinite(sessionId) && sessionId > 0 });
  const records = trpc.attendance.list.useQuery({ sessionId }, { enabled: Number.isFinite(sessionId) && sessionId > 0 });
  const [rawNames, setRawNames] = useState("");
  const [candidateSelections, setCandidateSelections] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("ALL");
  const [captureAt, setCaptureAt] = useState(() => localDateTimeValue());
  const suggestions = trpc.attendance.suggestionsForSession.useQuery({ sessionId }, { enabled: Number.isFinite(sessionId) && sessionId > 0 });

  const importNames = trpc.attendance.importZoomNames.useMutation({
    onSuccess: output => {
      setCandidateSelections({});
      utils.attendance.suggestionsForSession.invalidate({ sessionId });
      toast.success(`${output.count} Zoom names ready for review`);
    },
    onError: error => toast.error(error.message),
  });
  const setStatus = trpc.attendance.setStatus.useMutation({
    onSuccess: () => utils.attendance.list.invalidate({ sessionId }),
    onError: error => toast.error(error.message),
  });
  const confirmSuggestion = trpc.attendance.confirmSuggestion.useMutation({
    onSuccess: () => {
      utils.attendance.suggestionsForSession.invalidate({ sessionId });
      utils.attendance.list.invalidate({ sessionId });
      toast.success("Zoom suggestion confirmed");
    },
    onError: error => toast.error(error.message),
  });
  const publish = trpc.attendance.publish.useMutation({
    onSuccess: output => {
      utils.attendance.list.invalidate({ sessionId });
      utils.attendance.session.invalidate({ sessionId });
      toast.success(`Attendance published as version ${output.version}`);
    },
    onError: error => toast.error(error.message),
  });
  const totals = useMemo(
    () => ({
      present: records.data?.filter(row => row.status === "PRESENT").length ?? 0,
      absent: records.data?.filter(row => row.status === "ABSENT").length ?? 0,
      unset: records.data?.filter(row => row.status === "NOT_SET").length ?? 0,
    }),
    [records.data],
  );
  const filteredRecords = useMemo(() => records.data?.filter(record => statusFilter === "ALL" || record.status === statusFilter) ?? [], [records.data, statusFilter]);
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
          eyebrow="Class session"
          title="Attendance"
          description="Paste Zoom names for private suggestions, then confirm every final status yourself before publishing."
          back={<Link href="/app/subjects" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" />Back to Subjects</Link>}
          action={<>
            <Link
              href={`/app/reports?sessionId=${sessionId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <ChartNoAxesCombined className="mr-2 h-4 w-4" />View report
            </Link>
            {session.data?.publishState === "published" ? <><a href={`/attendance/${session.data.publicId}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"><ExternalLink className="mr-2 h-4 w-4" />View shared</a><button type="button" onClick={copyPublicAttendance} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"><Copy className="mr-2 h-4 w-4" />Copy link</button></> : null}
            <Button onClick={() => publish.mutate({ sessionId })} disabled={publish.isPending || !records.data?.length || unresolvedSuggestionCount > 0} className="min-h-11 rounded-2xl">
              <Upload className="mr-2 h-4 w-4" />{unresolvedSuggestionCount ? `Review ${unresolvedSuggestionCount} Zoom ${unresolvedSuggestionCount === 1 ? "name" : "names"}` : "Publish Attendance"}
            </Button>
          </>}
        />

        <div className="mt-7 grid grid-cols-3 gap-3">
          <Summary label="Present" count={totals.present} tone="text-emerald-300" />
          <Summary label="Absent" count={totals.absent} tone="text-red-300" />
          <Summary label="Not set" count={totals.unset} tone="text-amber-300" />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-[28px] bg-secondary/35 p-1 ring-1 ring-border/75"><div className="rounded-[24px] bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Sparkles /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Private AI assistant</p><h2 className="mt-1 font-semibold">Analyze pasted Zoom names</h2></div></div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Paste a Zoom participant list from a chosen capture time. The assistant cleans up names and compares them with this Subject’s roster, but it never changes Attendance on its own.</p>
            <div className="mt-4"><label htmlFor="zoom-capture-time" className="text-sm font-medium">Participant-list capture time</label><Input id="zoom-capture-time" type="datetime-local" value={captureAt} onChange={event => setCaptureAt(event.target.value)} className="mt-2" /></div>
            <Textarea value={rawNames} onChange={event => setRawNames(event.target.value)} className="mt-4 min-h-44" placeholder={"SECTION_LAST NAME, FIRST NAME\nSECTION_LAST NAME, FIRST NAME"} aria-describedby="zoom-name-count" />
            <div id="zoom-name-count" className="mt-2 flex items-center justify-between gap-3 text-xs leading-5 text-muted-foreground"><span>{pastedNameCount ? `${pastedNameCount} pasted ${pastedNameCount === 1 ? "name" : "names"} ready for analysis` : "Paste one participant name per line"}</span>{rawNames ? <button type="button" onClick={() => setRawNames("")} className="min-h-11 px-2 text-xs font-semibold text-primary">Clear list</button> : null}</div>
            <WorkspaceFormFooter note="The AI output stays private and advisory. You must confirm every roster match or explicitly choose No roster match before Attendance can be published.">
              <Button onClick={() => importNames.mutate({ sessionId, rawNamesText: rawNames, captureAt: new Date(captureAt) })} disabled={importNames.isPending || !rawNames.trim() || !captureAt} className="min-h-11 w-full rounded-2xl">
                <Sparkles data-icon="inline-start" />{importNames.isPending ? "Analyzing private list…" : `Analyze ${pastedNameCount || "Zoom"} ${pastedNameCount === 1 ? "name" : "names"}`}
              </Button>
            </WorkspaceFormFooter>
            {suggestions.data?.length ? (
              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Review suggestions</h3>{unresolvedSuggestionCount ? <RecordStatusBadge tone="attention">{unresolvedSuggestionCount} need review</RecordStatusBadge> : <RecordStatusBadge tone="confirmed">All confirmed</RecordStatusBadge>}</div>
                {suggestions.data.map(item => {
                  const selected = candidateSelections[item.id] ?? (item.suggestedSubjectStudentId ? String(item.suggestedSubjectStudentId) : "");
                  return (
                    <div key={item.id} className="rounded-2xl bg-secondary p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="text-sm font-semibold">Suggestion</span><RecordStatusBadge tone="private">Private review</RecordStatusBadge></div><RecordStatusBadge tone={item.reviewState === "confirmed" ? "confirmed" : "attention"}>{item.reviewState === "confirmed" ? "Confirmed" : "Needs review"}</RecordStatusBadge></div>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Zoom source</dt><dd className="mt-1 break-words font-medium text-foreground">{item.sourceName}</dd></div>
                        <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Normalized candidate</dt><dd className="mt-1 break-words font-medium text-foreground">{item.normalizedCandidate ?? "No confident required-format candidate"}</dd></div>
                      </dl>
                      {item.reviewNote ? <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">{item.reviewNote}</p> : null}
                      {item.flags.length ? <div className="mt-2 flex flex-wrap gap-1">{item.flags.map(flag => <Badge key={flag} variant="outline" className="rounded-full text-[11px]">{flag.replace("_", " ")}</Badge>)}</div> : null}
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">Choose the matching Student or explicitly confirm that no roster match applies. The suggestion remains advisory.</p>
                      <div className="mt-3 flex gap-2">
                        <select aria-label={`Match for ${item.sourceName}`} value={selected} onChange={event => setCandidateSelections(current => ({ ...current, [item.id]: event.target.value }))} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm">
                          <option value="">Choose Student</option><option value="none">No roster match</option>
                          {records.data?.map(record => <option key={record.membershipId} value={record.membershipId}>{record.canonicalName}</option>)}
                        </select>
                        <Button size="sm" className="min-h-11 rounded-xl" disabled={item.reviewState === "confirmed" || confirmSuggestion.isPending || !selected} onClick={() => confirmSuggestion.mutate({ suggestionId: item.id, membershipId: selected === "none" ? null : Number(selected) })}>{item.reviewState === "confirmed" ? "Confirmed" : "Confirm"}</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div></section>

          <section className="rounded-[28px] border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Student status</h2><Badge variant="secondary" className="rounded-full">{records.data?.length ?? 0} Students</Badge></div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter Students by Attendance status">{statusFilters.map(filter => <button key={filter} type="button" aria-pressed={statusFilter === filter} onClick={() => setStatusFilter(filter)} className={`min-h-11 shrink-0 rounded-xl px-3 text-xs font-semibold ${statusFilter === filter ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>{filter === "ALL" ? "All" : filter.replace("_", " ")}</button>)}</div>
            <div className="mt-4 space-y-2">
              {records.isLoading ? <p className="text-sm text-muted-foreground">Loading Attendance…</p> : null}
              {filteredRecords.map(record => (
                <div key={record.recordId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{record.canonicalName}</p><p className="mt-1 text-xs text-muted-foreground">{record.publishState === "published" ? `Published · version ${record.version}` : "Draft"}</p></div>
                  <div className="flex gap-1">{statusOptions.map(status => <button key={status} onClick={() => setStatus.mutate({ recordId: record.recordId, status })} className={`min-h-10 rounded-lg px-2 text-xs font-semibold ${record.status === status ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-border"}`}>{status.replace("_", " ")}</button>)}</div>
                </div>
              ))}
              {!records.isLoading && !records.data?.length ? <p className="py-8 text-center text-sm leading-6 text-muted-foreground">Add Students to the Subject before managing Attendance.</p> : null}
              {!records.isLoading && Boolean(records.data?.length) && !filteredRecords.length ? <p className="py-8 text-center text-sm leading-6 text-muted-foreground">No Students have this Attendance status yet.</p> : null}
            </div>
          </section>
        </div>
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground"><Check className="mr-2 inline h-4 w-4 text-primary" />Published Attendance keeps a public version History. Raw Zoom input, normalized review data, and suggestions remain private to the secretary.</section>
      </section>
    </DashboardLayout>
  );
}

function Summary({ label, count, tone }: { label: string; count: number; tone: string }) {
  return <section className="rounded-2xl border border-border bg-card p-3 sm:p-4"><p className="text-xs text-muted-foreground sm:text-sm">{label}</p><p className={`mt-1 text-2xl font-semibold ${tone} sm:mt-2 sm:text-3xl`}>{count}</p></section>;
}
