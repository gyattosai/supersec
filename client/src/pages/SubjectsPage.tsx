import DashboardLayout from "@/components/DashboardLayout";
import { Time12HourInput } from "@/components/TimeInputs";
import { formatTimeRange12Hour } from "@/lib/time";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { SubjectQuickActions } from "@/components/SubjectQuickActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  ExternalLink,
  GraduationCap,
  Plus,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DayTimes = Record<number, { startTime: string; endTime: string }>;
type SubjectInput = {
  name: string;
  code: string;
  professorName: string;
  termName: string | null;
  meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }>;
};

export default function SubjectsPage() {
  const [location, setLocation] = useLocation();
  const subjects = trpc.subjects.list.useQuery(undefined, { staleTime: 0, refetchOnMount: "always" });
  const activeSubjects = subjects.data?.filter(subject => subject.status === "active") ?? [];
  const requestedId = new URLSearchParams(location.split("?")[1] ?? "").get("subject");
  useEffect(() => {
    if (requestedId && requestedId !== "0" && requestedId !== "NaN") setLocation(`/app/subjects/${requestedId}`);
  }, [requestedId, setLocation]);

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl space-y-7 pb-12">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-5">
          <div>
            <p className="signal-kicker">Subject Directory</p>
            <h1 className="signal-title mt-1.5 text-3xl font-extrabold text-foreground">Class Desks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Independent workspaces with isolated rosters, session schedules, Zoom matchers, and sharing portals.
            </p>
          </div>
          <Button asChild className="rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25">
            <Link href="/app/subjects/new">
              <Plus className="mr-1.5 size-4" /> New Subject Desk
            </Link>
          </Button>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="signal-kicker">All Active Desks</p>
            <span className="text-xs font-bold text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full border border-border/80">
              {activeSubjects.length} {activeSubjects.length === 1 ? "Class" : "Classes"} Active
            </span>
          </div>

          {subjects.isLoading && (
            <div className="py-20 text-center text-xs text-muted-foreground">Loading Class Desks…</div>
          )}

          {!subjects.isLoading && !subjects.data?.length && <EmptyLibrary />}

          <div className="grid grid-cols-1 gap-4 w-full">
            {activeSubjects.map((subject, index) => (
              <SubjectDeskCard key={subject.id} subject={subject} position={index + 1} />
            ))}
          </div>
        </section>
      </section>
    </DashboardLayout>
  );
}

function SubjectDeskCard({
  subject,
  position,
}: {
  subject: {
    id: string | number;
    name: string;
    code: string;
    professorName: string;
    termName: string | null;
    publishState: "draft" | "published";
    publicId?: string;
    meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }>;
  };
  position: number;
}) {
  return (
    <div className="signal-record-card group flex flex-col justify-between rounded-2xl border border-border/80 p-5 bg-card/95 hover:border-primary/50 hover:shadow-xl transition-all">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] font-extrabold text-muted-foreground/60 tracking-wider">
              DESK {String(position).padStart(2, "0")}
            </span>
            <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {subject.name}
            </h3>
          </div>
          <RecordStatusBadge tone={subject.publishState === "published" ? "published" : "draft"}>
            {subject.publishState}
          </RecordStatusBadge>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{subject.code}</span> · {subject.professorName}
          {subject.termName ? ` · ${subject.termName}` : ""}
        </p>

        <div className="mt-3.5 flex items-start gap-2 rounded-xl bg-secondary/40 border border-border/60 p-2.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0 text-primary mt-0.5" />
          <span className="leading-snug">{formatDays(subject.meetingDays)}</span>
        </div>
      </div>

      <SubjectQuickActions
        subjectId={subject.id}
        publicId={subject.publicId}
        publishState={subject.publishState}
      />
    </div>
  );
}

export function SubjectCreatePage() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const create = trpc.subjects.create.useMutation({
    onSuccess: async result => {
      await utils.subjects.list.invalidate();
      toast.success("Subject desk created successfully!");
      if (result?.id) {
        setLocation(`/app/subjects/${result.id}`);
      }
    },
    onError: error => toast.error(error.message),
  });

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-3xl space-y-6 pb-12">
        <Link
          href="/app/subjects"
          className="signal-action inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        >
          <ArrowLeft className="size-3.5" /> Back to Subject desks
        </Link>

        <header className="border-b border-border pb-5">
          <p className="signal-kicker">New Workspace</p>
          <h1 className="signal-title mt-1.5 text-2xl sm:text-3xl font-black text-foreground">
            Open a new class desk
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Establish the class identity and weekly schedule rhythm. Students, session attendance, and sharing stay completely isolated.
          </p>
        </header>

        <section className="signal-panel p-6 sm:p-8 rounded-2xl">
          <SubjectCreateForm busy={create.isPending} onCreate={input => create.mutate(input)} />
        </section>
      </section>
    </DashboardLayout>
  );
}

function SubjectCreateForm({ busy, onCreate }: { busy: boolean; onCreate: (input: SubjectInput) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [professor, setProfessor] = useState("");
  const [term, setTerm] = useState("");
  const [days, setDays] = useState<number[]>([2, 5]);
  const [dayTimes, setDayTimes] = useState<DayTimes>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate({
      name,
      code,
      professorName: professor,
      termName: term || null,
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
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4">
        <Field label="Subject Name">
          <Input
            required
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="e.g. Research Methods & Technical Writing"
            className="rounded-xl h-11"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject Code">
            <Input
              required
              value={code}
              onChange={event => setCode(event.target.value)}
              placeholder="e.g. RM 101"
              className="rounded-xl h-11"
            />
          </Field>
          <Field label="Term / Semester (Optional)">
            <Input
              value={term}
              onChange={event => setTerm(event.target.value)}
              placeholder="e.g. 1st Semester 2026-2027"
              className="rounded-xl h-11"
            />
          </Field>
        </div>

        <Field label="Professor / Instructor Name">
          <Input
            required
            value={professor}
            onChange={event => setProfessor(event.target.value)}
            placeholder="e.g. Dr. Arthur Pendelton"
            className="rounded-xl h-11"
          />
        </Field>
      </div>

      <fieldset className="border-t border-border pt-6 space-y-3">
        <legend className="signal-kicker">Weekly Meeting Rhythm</legend>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Select the days this class normally meets. Specific session dates and No Class announcements are scheduled in the Attendance workspace.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {weekdays.map((day, index) => {
            const active = days.includes(index);
            return (
              <button
                type="button"
                key={day}
                onClick={() =>
                  setDays(current =>
                    current.includes(index) ? current.filter(v => v !== index) : [...current, index]
                  )
                }
                className={`signal-action min-h-10 rounded-xl border px-3.5 text-xs font-bold transition-all ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <ScheduleDayTimes days={days} value={dayTimes} onChange={setDayTimes} />

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground max-w-sm">
          Opens a private subject desk. Records remain private until you explicitly publish.
        </p>
        <Button
          type="submit"
          disabled={busy || !days.length}
          className="rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 px-6 h-11"
        >
          {busy ? "Creating Desk…" : "Create Subject Desk"}
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</Label>
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
    <section className="signal-inset p-4 sm:p-5 rounded-xl space-y-3">
      <p className="signal-kicker">Optional Meeting Times</p>
      <div className="grid grid-cols-[minmax(0,1fr)_1fr_1fr] items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
        <span>Day</span>
        <span>Start Time</span>
        <span>End Time</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {[...days]
          .sort((a, b) => a - b)
          .map(weekday => (
            <div key={weekday} className="grid grid-cols-[minmax(0,1fr)_1fr_1fr] items-center gap-2">
              <span className="text-xs font-bold text-foreground">{weekdays[weekday]}</span>
              <Time12HourInput
                ariaLabel={`${weekdays[weekday]} start time`}
                value={value[weekday]?.startTime ?? ""}
                onChange={startTime =>
                  onChange({
                    ...value,
                    [weekday]: { startTime, endTime: value[weekday]?.endTime ?? "" },
                  })
                }
              />
              <Time12HourInput
                ariaLabel={`${weekdays[weekday]} end time`}
                value={value[weekday]?.endTime ?? ""}
                onChange={endTime =>
                  onChange({
                    ...value,
                    [weekday]: { startTime: value[weekday]?.startTime ?? "", endTime },
                  })
                }
              />
            </div>
          ))}
      </div>
    </section>
  );
}

function EmptyLibrary() {
  return (
    <div className="signal-panel p-10 text-center rounded-2xl border-t-2 border-primary">
      <GraduationCap className="mx-auto size-10 text-primary opacity-80" />
      <h2 className="signal-heading text-xl font-bold mt-4">Open your first class desk</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        Each Subject keeps its own Students, Schedule, class sessions, Attendance, and sharing space.
      </p>
      <Button asChild className="mt-6 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25">
        <Link href="/app/subjects/new">
          <Plus className="mr-1.5 size-4" /> Open New Subject
        </Link>
      </Button>
    </div>
  );
}

function formatDays(days: Array<{ weekday: number; startTime: string | null; endTime?: string | null }>) {
  return days.length
    ? days.map(day => `${weekdays[day.weekday]}${formatTimeRange12Hour(day.startTime, day.endTime)}`).join(" · ")
    : "No fixed meeting rhythm";
}
