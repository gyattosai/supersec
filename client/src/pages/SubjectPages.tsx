import DashboardLayout from "@/components/DashboardLayout";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { WorkspaceFormFooter } from "@/components/WorkspaceFormFooter";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { SocialPreviewCard } from "@/components/SocialPreviewCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Time12HourInput } from "@/components/TimeInputs";
import { formatTimeRange12Hour } from "@/lib/time";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  Clipboard,
  ClipboardCheck,
  Copy,
  ExternalLink,
  GraduationCap,
  Megaphone,
  Pencil,
  QrCode,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Users,
  Eye,
  Lock,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useRoute } from "wouter";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DayTimes = Record<number, { startTime: string; endTime: string }>;
type SubjectModel = {
  id: string | number;
  publicId: string;
  name: string;
  code: string;
  viewOnlyShortMark: string | null;
  viewOnlyName: string | null;
  professorName: string;
  termName: string | null;
  publishState: "draft" | "published";
  status: "active" | "archived";
  meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }>;
};

function useSubject(subjectId: string | number) {
  const numId = Number(subjectId);
  const isNumeric = !isNaN(numId) && numId > 0;
  const raw = String(subjectId || "").trim();
  const valid = Boolean(raw && raw !== "0" && raw !== "NaN");
  const queryParam = isNumeric ? numId : raw;
  return trpc.subjects.get.useQuery(
    { subjectId: queryParam },
    { enabled: valid }
  );
}

function SubjectBack({ subjectId }: { subjectId: string | number }) {
  const sId = String(subjectId || "");
  return (
    <Link
      href={sId && sId !== "0" ? `/app/subjects/${sId}` : "/app/subjects"}
      className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" />
      {sId && sId !== "0" ? "Back to Subject" : "Back to Subjects"}
    </Link>
  );
}

export function SubjectCreatePage() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [professor, setProfessor] = useState("");
  const [term, setTerm] = useState("");
  const [days, setDays] = useState<number[]>([2, 5]); // Tue, Fri default
  const [dayTimes, setDayTimes] = useState<DayTimes>({});

  const create = trpc.subjects.create.useMutation({
    onSuccess: async ({ id }) => {
      await utils.subjects.list.invalidate();
      toast.success("Subject created! Welcome to your class desk.");
      setLocation(`/app/subjects/${id}`);
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({
      name: name.trim(),
      code: code.trim(),
      professorName: professor.trim(),
      termName: term.trim() || null,
      meetingDays: days
        .sort((a, b) => a - b)
        .map(weekday => ({
          weekday,
          startTime: dayTimes[weekday]?.startTime || null,
          endTime: dayTimes[weekday]?.endTime || null,
        })),
    });
  };

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-3xl pb-12">
        <WorkspacePageHeader
          eyebrow="Subject desk setup"
          title="Create New Subject"
          description="Define the core course identity, professor, and regular repeating weekly schedule."
          back={<SubjectBack subjectId={0} />}
        />

        <form onSubmit={submit} className="signal-panel mt-6 flex flex-col gap-6 p-6 sm:p-8 rounded-2xl shadow-xl">
          {/* Live Code Preview */}
          <div className="signal-hero-banner p-4 sm:p-5 rounded-xl flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-md shadow-primary/20">
              {code.trim() ? code.trim().slice(0, 3).toUpperCase() : "SUB"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Class Desk Preview</p>
              <h3 className="text-base font-bold text-foreground truncate mt-0.5">
                {name.trim() || "Course Name"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {code.trim() || "CODE 101"} {professor.trim() ? `· Prof. ${professor.trim()}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Field label="Subject Name" htmlFor="subject-name">
              <Input
                id="subject-name"
                required
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="e.g. Research Methods in Computing"
                className="signal-action"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Subject Code" htmlFor="subject-code">
                <Input
                  id="subject-code"
                  required
                  value={code}
                  onChange={event => setCode(event.target.value)}
                  placeholder="e.g. CS 301"
                  className="signal-action"
                />
              </Field>

              <Field label="Academic Term (optional)" htmlFor="subject-term">
                <Input
                  id="subject-term"
                  value={term}
                  onChange={event => setTerm(event.target.value)}
                  placeholder="e.g. 1st Semester 2026-2027"
                  className="signal-action"
                />
              </Field>
            </div>

            <Field label="Instructor / Professor Name" htmlFor="subject-professor">
              <Input
                id="subject-professor"
                required
                value={professor}
                onChange={event => setProfessor(event.target.value)}
                placeholder="e.g. Dr. Maria Santos"
                className="signal-action"
              />
            </Field>

            <ScheduleChooser days={days} setDays={setDays} dayTimes={dayTimes} setDayTimes={setDayTimes} />
          </div>

          <WorkspaceFormFooter note="Subjects start as private drafts. You control when to publish the shared student link.">
            <Button
              type="submit"
              disabled={create.isPending || !days.length || !name.trim() || !code.trim() || !professor.trim()}
              className="min-h-11 w-full rounded-xl text-sm font-bold shadow-sm shadow-primary/25"
            >
              {create.isPending ? "Creating Subject Desk…" : "Create Subject Desk"}
            </Button>
          </WorkspaceFormFooter>
        </form>
      </section>
    </DashboardLayout>
  );
}

export function SubjectOverviewPage() {
  const [, params] = useRoute("/app/subjects/:subjectId");
  const subjectId = params?.subjectId ?? "";
  const numId = Number(subjectId);
  const isNumeric = !isNaN(numId) && numId > 0;
  const effectiveId = (isNumeric ? numId : subjectId) as any;
  const subject = useSubject(subjectId);
  const utils = trpc.useUtils();

  const archive = trpc.subjects.archive.useMutation({
    onSuccess: () => {
      utils.subjects.get.invalidate({ subjectId: effectiveId });
      utils.subjects.list.invalidate();
      toast.success("Subject archive status updated");
    },
    onError: error => toast.error(error.message),
  });

  if (subject.isLoading)
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-5xl">
          <LoadingWorkspace />
        </section>
      </DashboardLayout>
    );

  if (!subject.data) return <SubjectUnavailable />;

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl space-y-6 pb-12">
        <SubjectBack subjectId={subjectId} />

        <header className="signal-hero-banner p-6 sm:p-8 rounded-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="signal-kicker">Subject control room</p>
              <h1 className="signal-title mt-2 text-2xl sm:text-3xl font-extrabold">{subject.data.name}</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-medium">
                <span className="font-bold text-foreground">{subject.data.code}</span> · {subject.data.professorName}
                {subject.data.termName ? ` · ${subject.data.termName}` : ""}
              </p>
            </div>
            <RecordStatusBadge tone={subject.data.publishState === "published" ? "published" : "draft"}>
              {subject.data.publishState}
            </RecordStatusBadge>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5 pt-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href={`/app/subjects/${subjectId}/details`}>
                <Pencil className="mr-1.5 size-3.5" />
                Class Details
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/20">
              <Link href={`/app/subjects/${subjectId}/sharing`}>
                Sharing Center <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
            <Button
              onClick={() => archive.mutate({ subjectId: effectiveId, archive: subject.data.status !== "archived" })}
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground hover:text-destructive"
            >
              <Archive className="mr-1.5 size-3.5" />
              {subject.data.status === "archived" ? "Restore" : "Archive"}
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="space-y-4">
            <div>
              <p className="signal-kicker">Class operations</p>
              <h2 className="signal-heading text-lg font-bold mt-1">Class Workflow</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  number: "01",
                  title: "Class details",
                  description: "Check the Subject code, professor, and term.",
                  href: `/app/subjects/${subjectId}/details`,
                  icon: Pencil,
                },
                {
                  number: "02",
                  title: "Students (Master List)",
                  description: "Add students, notes, and schedule conflicts.",
                  href: `/app/subjects/${subjectId}/students`,
                  icon: Users,
                },
                {
                  number: "03",
                  title: "Attendance",
                  description: "Add class dates, mark No Class, and take Attendance.",
                  href: `/app/subjects/${subjectId}/attendance`,
                  icon: ClipboardCheck,
                },
                {
                  number: "04",
                  title: "Announcements",
                  description: "Write, publish, and share class updates.",
                  href: `/app/subjects/${subjectId}/announcements`,
                  icon: Megaphone,
                },
                {
                  number: "05",
                  title: "Resources",
                  description: "Keep class links, files, forms, and meeting links.",
                  href: `/app/subjects/${subjectId}/resources`,
                  icon: BookOpen,
                },
                {
                  number: "06",
                  title: "Q&A",
                  description: "Save answers you can publish and share again.",
                  href: `/app/subjects/${subjectId}/questions`,
                  icon: GraduationCap,
                },
                {
                  number: "07",
                  title: "Sharing",
                  description: "Review public student portal, copy Messenger link, and share QR code.",
                  href: `/app/subjects/${subjectId}/sharing`,
                  icon: Clipboard,
                },
                {
                  number: "08",
                  title: "Notes",
                  description: "Class notes, lecture outlines, formulas, and memos.",
                  href: `/app/subjects/${subjectId}/notes`,
                  icon: StickyNote,
                },
                {
                  number: "09",
                  title: "Snippets",
                  description: "Reusable copy templates, reminders, and group chat notices.",
                  href: `/app/subjects/${subjectId}/snippets`,
                  icon: Sparkles,
                },
              ].map(step => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.number}
                    href={step.href}
                    className="signal-action group flex min-h-[5rem] items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 hover:border-primary/50 hover:bg-secondary/40 shadow-sm transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-primary">
                            {step.number}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mt-0.5 truncate">
                          {step.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 group-hover:scale-105 group-hover:translate-x-0.5 transition-all">
                      <ArrowRight className="size-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <aside className="signal-panel h-fit overflow-hidden rounded-2xl p-5 space-y-4">
            <div className="pb-1">
              <p className="signal-kicker">Class Identity</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{subject.data.code}</p>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Professor</p>
                <p className="mt-0.5 font-bold text-foreground">{subject.data.professorName}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Meeting Rhythm</p>
                <p className="mt-0.5 leading-relaxed text-foreground">{formatDays(subject.data.meetingDays)}</p>
              </div>
              <div className="pt-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Every Subject remains an independent class record, including its students, sessions, attendance, content, and sharing.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </DashboardLayout>
  );
}

export function SubjectSharingPage() {
  const [, params] = useRoute("/app/subjects/:subjectId/sharing");
  const subjectId = params?.subjectId ?? "";
  const numId = Number(subjectId);
  const isNumeric = !isNaN(numId) && numId > 0;
  const effectiveId = (isNumeric ? numId : subjectId) as any;
  const subject = useSubject(subjectId);
  const utils = trpc.useUtils();
  const [copied, setCopied] = useState(false);

  const publish = trpc.subjects.publish.useMutation({
    onSuccess: () => {
      utils.subjects.get.invalidate({ subjectId: effectiveId });
      utils.subjects.list.invalidate();
      toast.success("Subject sharing status updated");
    },
    onError: error => toast.error(error.message),
  });

  const copyLink = async () => {
    if (!subject.data?.publicId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${subject.data.publicId}`);
      setCopied(true);
      toast.success("Public Subject link copied for Messenger");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (subject.isLoading)
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-4xl">
          <LoadingWorkspace />
        </section>
      </DashboardLayout>
    );

  if (!subject.data) return <SubjectUnavailable />;
  const shared = subject.data.publishState === "published";
  const publicUrl = `${typeof window === "undefined" ? "" : window.location.origin}/s/${subject.data.publicId}`;

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl space-y-6 pb-14">
        <WorkspacePageHeader
          eyebrow="Distribution console"
          title="Sharing & Public Portal"
          description="Control what classmates see on their view-only portal, copy 1-click Messenger links, and share QR codes for class slides."
          back={<SubjectBack subjectId={subjectId} />}
          action={<RecordStatusBadge tone={shared ? "published" : "draft"}>{subject.data.publishState}</RecordStatusBadge>}
        />

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {/* Main Controls */}
          <div className="space-y-5">
            {/* Visibility Card */}
            <section className="signal-panel p-6 sm:p-7 rounded-2xl border-l-2 border-l-primary space-y-4">
              <div className="flex items-center justify-between">
                <span className="signal-kicker">Portal Visibility</span>
                <span className={`signal-status-pill ${shared ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                  <span className={`size-1.5 rounded-full ${shared ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  {shared ? "Active & Public" : "Private Draft"}
                </span>
              </div>

              <h2 className="signal-heading text-xl font-bold">
                {shared ? "Class portal is published and active." : "Class portal is currently private."}
              </h2>

              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Classmates can view only allowlisted announcements, shared resources, Q&amp;As, and verified attendance records. Private secretary notes and unverified Zoom review details stay protected.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => publish.mutate({ subjectId: effectiveId, publish: !shared })}
                  disabled={publish.isPending}
                  className={`rounded-xl font-bold ${shared ? "bg-secondary text-foreground hover:bg-destructive hover:text-destructive-foreground" : "bg-primary text-primary-foreground shadow-sm shadow-primary/25"}`}
                >
                  {publish.isPending ? "Updating…" : shared ? "Unpublish Subject" : "Publish Student Portal"}
                </Button>
                {shared ? (
                  <Button onClick={copyLink} variant="outline" className="rounded-xl gap-2 font-semibold">
                    {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4 text-primary" />}
                    {copied ? "Copied to Clipboard!" : "Copy Messenger Link"}
                  </Button>
                ) : null}
              </div>
            </section>

            {/* Public Link Card */}
            <section className="signal-panel p-6 rounded-2xl space-y-3">
              <p className="signal-kicker">Messenger Link</p>
              <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-3.5 border border-border">
                <p className="font-mono text-xs text-foreground truncate flex-1 select-all">
                  {shared ? publicUrl : "Publish subject to generate an active link."}
                </p>
                {shared && (
                  <Button size="sm" variant="ghost" onClick={copyLink} className="h-8 px-2.5 text-xs text-primary hover:bg-primary/10">
                    <Copy className="size-3.5 mr-1" /> Copy
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Send this link directly to your class group chat. Students open it in browser without requiring an account.
              </p>
            </section>
          </div>

          {/* Side QR & Preview */}
          <div className="space-y-5">
            {/* Simulated Phone Card Preview */}
            <section className="signal-panel p-6 rounded-2xl text-center space-y-4">
              <p className="signal-kicker">Slide &amp; In-Class QR Code</p>
              <div className="mx-auto grid place-items-center">
                <div className="signal-qr-container">
                  {/* Clean SVG visual QR graphic */}
                  <svg className="size-36 text-neutral-900" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="5" y="5" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="13" y="13" width="9" height="9" />
                    <rect x="70" y="5" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="78" y="13" width="9" height="9" />
                    <rect x="5" y="70" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                    <rect x="13" y="78" width="9" height="9" />
                    <rect x="38" y="8" width="6" height="6" />
                    <rect x="50" y="8" width="8" height="6" />
                    <rect x="42" y="20" width="6" height="10" />
                    <rect x="54" y="24" width="6" height="6" />
                    <rect x="38" y="38" width="24" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="5" />
                    <circle cx="50" cy="50" r="4" />
                    <rect x="10" y="40" width="6" height="8" />
                    <rect x="22" y="48" width="8" height="6" />
                    <rect x="74" y="40" width="16" height="6" />
                    <rect x="84" y="52" width="6" height="12" />
                    <rect x="70" y="70" width="10" height="6" />
                    <rect x="84" y="74" width="8" height="8" />
                    <rect x="40" y="72" width="8" height="8" />
                    <rect x="54" y="80" width="8" height="8" />
                  </svg>
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground">
                {subject.data.code} Shared Portal
              </p>
              <p className="text-[11px] text-muted-foreground">
                Display this in classroom presentations for rapid roll call access.
              </p>
              {shared && (
                <Button asChild size="sm" variant="outline" className="w-full rounded-xl text-xs font-semibold">
                  <a href={`/s/${subject.data.publicId}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Open Public Portal
                  </a>
                </Button>
              )}
            </section>
          </div>
        </div>

        {/* Live Social Previews & Messenger Card Preview */}
        {shared && subject.data.publicId && (
          <SocialPreviewCard
            title={subject.data.name}
            subjectCode={subject.data.code}
            professorName={subject.data.professorName}
            description={`Official student portal for ${subject.data.code} — ${subject.data.name}. View class schedule, announcements, resources, and attendance updates.`}
            publicUrl={publicUrl}
            type="subject"
          />
        )}
      </section>
    </DashboardLayout>
  );
}

export function SubjectDetailsPage() {
  const [, params] = useRoute("/app/subjects/:subjectId/details");
  const subjectId = params?.subjectId ?? "";
  const numId = Number(subjectId);
  const isNumeric = !isNaN(numId) && numId > 0;
  const effectiveId = (isNumeric ? numId : subjectId) as any;
  const subject = useSubject(subjectId);
  const utils = trpc.useUtils();

  const update = trpc.subjects.update.useMutation({
    onSuccess: () => {
      utils.subjects.get.invalidate({ subjectId: effectiveId });
      utils.subjects.list.invalidate();
      toast.success("Subject details updated successfully");
    },
    onError: error => toast.error(error.message),
  });

  if (subject.isLoading)
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-3xl">
          <LoadingWorkspace />
        </section>
      </DashboardLayout>
    );

  if (!subject.data) return <SubjectUnavailable />;

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-3xl pb-14 space-y-6">
        <WorkspacePageHeader
          eyebrow="Subject details"
          title="Edit Class Details"
          description="Update course metadata, custom view-only branding for shared pages, and repeating weekly schedule."
          back={<SubjectBack subjectId={subjectId} />}
        />

        <div className="signal-panel p-6 sm:p-8 rounded-2xl shadow-xl">
          <SubjectDetailsForm
            subject={subject.data}
            busy={update.isPending}
            onSave={input => update.mutate({ subjectId: effectiveId, ...input })}
          />
        </div>
      </section>
    </DashboardLayout>
  );
}

function SubjectDetailsForm({
  subject,
  busy,
  onSave,
}: {
  subject: SubjectModel;
  busy: boolean;
  onSave: (input: {
    name: string;
    code: string;
    viewOnlyShortMark: string | null;
    viewOnlyName: string | null;
    professorName: string;
    termName: string | null;
    meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }>;
  }) => void;
}) {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code);
  const [viewOnlyShortMark, setViewOnlyShortMark] = useState(subject.viewOnlyShortMark ?? "");
  const [viewOnlyName, setViewOnlyName] = useState(subject.viewOnlyName ?? "");
  const [professor, setProfessor] = useState(subject.professorName);
  const [term, setTerm] = useState(subject.termName ?? "");
  const [days, setDays] = useState<number[]>(subject.meetingDays.map(day => day.weekday));
  const [dayTimes, setDayTimes] = useState<DayTimes>(() =>
    Object.fromEntries(subject.meetingDays.map(day => [day.weekday, { startTime: day.startTime ?? "", endTime: day.endTime ?? "" }]))
  );

  useEffect(() => {
    setName(subject.name);
    setCode(subject.code);
    setViewOnlyShortMark(subject.viewOnlyShortMark ?? "");
    setViewOnlyName(subject.viewOnlyName ?? "");
    setProfessor(subject.professorName);
    setTerm(subject.termName ?? "");
    setDays(subject.meetingDays.map(day => day.weekday));
    setDayTimes(
      Object.fromEntries(
        subject.meetingDays.map(day => [day.weekday, { startTime: day.startTime ?? "", endTime: day.endTime ?? "" }])
      )
    );
  }, [subject]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (days.length)
      onSave({
        name: name.trim(),
        code: code.trim(),
        viewOnlyShortMark: viewOnlyShortMark.trim() || null,
        viewOnlyName: viewOnlyName.trim() || null,
        professorName: professor.trim(),
        termName: term.trim() || null,
        meetingDays: days
          .sort((a, b) => a - b)
          .map(weekday => ({
            weekday,
            startTime: dayTimes[weekday]?.startTime || null,
            endTime: dayTimes[weekday]?.endTime || null,
          })),
      });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subject Name">
          <Input required value={name} onChange={event => setName(event.target.value)} />
        </Field>
        <Field label="Subject Code">
          <Input required value={code} onChange={event => setCode(event.target.value)} />
        </Field>
      </div>

      {/* View-Only Custom Header Branding */}
      <section className="signal-inset p-5 rounded-xl space-y-3">
        <div>
          <p className="text-sm font-semibold">View-only header</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Replace the supersec mark and name on this Subject’s shared pages. Leave either field blank to keep its supersec fallback.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Field label="Short mark">
            <Input
              value={viewOnlyShortMark}
              maxLength={16}
              onChange={event => setViewOnlyShortMark(event.target.value)}
              placeholder="N001"
            />
          </Field>
          <Field label="Full name">
            <Input
              value={viewOnlyName}
              maxLength={80}
              onChange={event => setViewOnlyName(event.target.value)}
              placeholder="OLCA113N001"
            />
          </Field>
        </div>

        {/* Live View-Only Badge Preview */}
        <div className="pt-2 flex items-center gap-3">
          <span className="text-[11px] font-bold text-muted-foreground">Preview:</span>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1">
            <span className="grid size-5 place-items-center rounded bg-primary text-[9px] font-black text-primary-foreground">
              {viewOnlyShortMark.trim() || "SS"}
            </span>
            <span className="text-xs font-bold text-foreground">
              {viewOnlyName.trim() || name || "supersec"}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Professor">
          <Input required value={professor} onChange={event => setProfessor(event.target.value)} />
        </Field>
        <Field label="Academic Term (optional)">
          <Input value={term} onChange={event => setTerm(event.target.value)} placeholder="e.g. 1st Sem 2026" />
        </Field>
      </div>

      <ScheduleChooser days={days} setDays={setDays} dayTimes={dayTimes} setDayTimes={setDayTimes} />

      <WorkspaceFormFooter note="These changes update this Subject only. Sharing remains under your separate publication control.">
        <Button type="submit" disabled={busy || !days.length} className="min-h-11 rounded-xl font-bold">
          {busy ? "Saving changes…" : "Save Details"}
        </Button>
      </WorkspaceFormFooter>
    </form>
  );
}

function ScheduleChooser({
  days,
  setDays,
  dayTimes,
  setDayTimes,
}: {
  days: number[];
  setDays: (value: number[] | ((current: number[]) => number[])) => void;
  dayTimes: DayTimes;
  setDayTimes: (value: DayTimes) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold text-foreground">Fixed Weekday Meeting Schedule</legend>
      <div className="flex flex-wrap gap-2">
        {weekdays.map((day, index) => {
          const selected = days.includes(index);
          return (
            <button
              type="button"
              key={day}
              onClick={() =>
                setDays(current => (current.includes(index) ? current.filter(value => value !== index) : [...current, index]))
              }
              className={`signal-action min-h-10 rounded-xl px-3.5 text-xs font-bold transition-all ${
                selected
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                  : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>
      <ScheduleDayTimes days={days} value={dayTimes} onChange={setDayTimes} />
    </fieldset>
  );
}

function SubjectStage({
  number,
  title,
  description,
  links,
}: {
  number: string;
  title: string;
  description: string;
  links: Array<{ label: string; href: string; icon: typeof BookOpen }>;
}) {
  return (
    <section className="signal-panel p-5 rounded-2xl space-y-3">
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-xs font-black text-primary">{number}</span>
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {links.map(link => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="signal-action inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-bold text-foreground hover:border-primary/50 hover:bg-secondary transition-all"
            >
              <Icon className="size-3.5 text-primary" />
              {link.label}
              <ArrowRight className="size-3 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SubjectUnavailable() {
  return (
    <DashboardLayout>
      <section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center">
        <div className="signal-panel border-t-2 border-primary p-8 text-center rounded-2xl space-y-4">
          <GraduationCap className="mx-auto size-8 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Subject unavailable</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            This private class record may have been removed or is not available in the current workspace.
          </p>
          <Button asChild className="rounded-xl font-bold">
            <Link href="/app/subjects">Back to Subjects</Link>
          </Button>
        </div>
      </section>
    </DashboardLayout>
  );
}

function LoadingWorkspace() {
  return (
    <div className="signal-inset mt-6 grid min-h-72 place-items-center text-xs text-muted-foreground">
      Loading Subject workspace…
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ScheduleDayTimes({
  days,
  value,
  onChange,
}: {
  days: number[];
  value: DayTimes;
  onChange: (value: DayTimes) => void;
}) {
  if (!days.length) return null;
  return (
    <div className="signal-inset p-4 rounded-xl space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">Optional Class Meeting Times</p>
      <div className="grid grid-cols-[minmax(0,1fr)_1fr_1fr] items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Day</span>
        <span>Start Time</span>
        <span>End Time</span>
      </div>
      <div className="flex flex-col gap-2">
        {[...days]
          .sort((a, b) => a - b)
          .map(weekday => (
            <div key={weekday} className="grid grid-cols-[minmax(0,1fr)_1fr_1fr] items-center gap-2">
              <span className="text-xs font-bold text-foreground">{weekdays[weekday]}</span>
              <Time12HourInput
                ariaLabel={`${weekdays[weekday]} start time`}
                value={value[weekday]?.startTime ?? ""}
                onChange={startTime =>
                  onChange({ ...value, [weekday]: { startTime, endTime: value[weekday]?.endTime ?? "" } })
                }
              />
              <Time12HourInput
                ariaLabel={`${weekdays[weekday]} end time`}
                value={value[weekday]?.endTime ?? ""}
                onChange={endTime =>
                  onChange({ ...value, [weekday]: { startTime: value[weekday]?.startTime ?? "", endTime } })
                }
              />
            </div>
          ))}
      </div>
    </div>
  );
}

function formatDays(days: Array<{ weekday: number; startTime: string | null; endTime?: string | null }>) {
  return days.length
    ? days
        .map(day => `${weekdays[day.weekday]}${formatTimeRange12Hour(day.startTime, day.endTime)}`)
        .join(" · ")
    : "No schedule set";
}

