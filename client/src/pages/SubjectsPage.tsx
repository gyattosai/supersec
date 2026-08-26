import DashboardLayout from "@/components/DashboardLayout";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { WorkspaceFormFooter } from "@/components/WorkspaceFormFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, GraduationCap, Plus, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DayTimes = Record<number, { startTime: string; endTime: string }>;
type SubjectInput = { name: string; code: string; professorName: string; termName: string | null; meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }> };

export default function SubjectsPage() {
  const [location, setLocation] = useLocation();
  const subjects = trpc.subjects.list.useQuery();
  const activeCount = subjects.data?.filter(subject => subject.status === "active").length ?? 0;
  const requestedId = Number(new URLSearchParams(location.split("?")[1] ?? "").get("subject"));
  useEffect(() => { if (Number.isFinite(requestedId) && requestedId > 0) setLocation(`/app/subjects/${requestedId}`); }, [requestedId, setLocation]);

  return <DashboardLayout><section className="mx-auto max-w-7xl">
    <WorkspacePageHeader eyebrow="Private workspace" title="Subjects" description="Open a separate class space for every roster, Schedule, Attendance record, and shared update." action={<Button asChild><Link href="/app/subjects/new"><Plus data-icon="inline-start" />New Subject</Link></Button>} />
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="linear-label text-muted-foreground">Class index</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">Choose the class you need to run.</h2></div><Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">{activeCount} active</Badge></div>
      {subjects.isLoading ? <p className="py-16 text-center text-sm text-muted-foreground">Loading Subjects…</p> : null}
      {!subjects.isLoading && !subjects.data?.length ? <EmptyGallery /> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{subjects.data?.filter(subject => subject.status === "active").map(subject => <SubjectGalleryCard key={subject.id} subject={subject} />)}</div>
    </section>
  </section></DashboardLayout>;
}

export function SubjectCreatePage() {
  const utils = trpc.useUtils();
  const create = trpc.subjects.create.useMutation({ onSuccess: async () => { await utils.subjects.list.invalidate(); toast.success("Subject created"); }, onError: error => toast.error(error.message) });
  return <DashboardLayout><section className="mx-auto max-w-3xl"><WorkspacePageHeader eyebrow="Private setup" title="New Subject" description="Create a dedicated class space first. Students, sessions, Attendance, and sharing remain separate from every other Subject." back={<Link href="/app/subjects" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft />Back to Subjects</Link>} /><div className="mt-7 rounded-[30px] bg-secondary/35 p-1 ring-1 ring-border/75"><div className="rounded-[26px] bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7"><SubjectCreateForm busy={create.isPending} onCreate={input => create.mutate(input)} /></div></div></section></DashboardLayout>;
}

function SubjectGalleryCard({ subject }: { subject: { id: number; name: string; code: string; professorName: string; termName: string | null; publishState: "draft" | "published"; meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }> } }) {
  return <Link href={`/app/subjects/${subject.id}`} className="linear-panel group block p-5 transition-[border-color,background-color] duration-150 hover:border-primary/60 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><article className="min-h-56"><div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-md border border-primary/50 bg-primary/15 text-primary"><BookOpen className="h-4 w-4" /></span><RecordStatusBadge tone={subject.publishState === "published" ? "published" : "draft"}>{subject.publishState}</RecordStatusBadge></div><p className="linear-label mt-5 text-primary">{subject.code}</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.035em]">{subject.name}</h3><p className="mt-2 text-sm text-muted-foreground">{subject.professorName}{subject.termName ? ` · ${subject.termName}` : ""}</p><div className="mt-5 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{formatDays(subject.meetingDays)}</span></div><span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">Open class space<ArrowRight data-icon="inline-end" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span></article></Link>;
}

function SubjectCreateForm({ busy, onCreate }: { busy: boolean; onCreate: (input: SubjectInput) => void }) {
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [professor, setProfessor] = useState(""); const [term, setTerm] = useState(""); const [days, setDays] = useState<number[]>([2, 5]); const [dayTimes, setDayTimes] = useState<DayTimes>({});
  const submit = (event: FormEvent) => { event.preventDefault(); onCreate({ name, code, professorName: professor, termName: term || null, meetingDays: days.sort((a, b) => a - b).map(weekday => ({ weekday, startTime: dayTimes[weekday]?.startTime || null, endTime: dayTimes[weekday]?.endTime || null })) }); };
  return <form onSubmit={submit} className="flex flex-col gap-5"><div className="rounded-2xl bg-secondary/45 p-4"><p className="text-sm font-semibold text-primary">Private setup</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Start with the class details and fixed Schedule. Add Students and share information after the Subject is ready.</p></div><div className="flex flex-col gap-4"><Field label="Subject name"><Input required value={name} onChange={event => setName(event.target.value)} placeholder="Example: Research Methods" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Subject code"><Input required value={code} onChange={event => setCode(event.target.value)} placeholder="RM 101" /></Field><Field label="Term (optional)"><Input value={term} onChange={event => setTerm(event.target.value)} placeholder="2026 Term 1" /></Field></div><Field label="Professor"><Input required value={professor} onChange={event => setProfessor(event.target.value)} placeholder="Professor name" /></Field><fieldset><legend className="text-sm font-medium">Fixed weekday Schedule</legend><div className="mt-2 flex flex-wrap gap-2">{weekdays.map((day, index) => <button type="button" key={day} onClick={() => setDays(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index])} className={`min-h-11 rounded-xl px-3 text-sm font-medium ${days.includes(index) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{day.slice(0, 3)}</button>)}</div></fieldset><ScheduleDayTimes days={days} value={dayTimes} onChange={setDayTimes} /></div><WorkspaceFormFooter note="This creates a private Subject. You choose when its class information is shared."><Button disabled={busy || !days.length} className="min-h-11 w-full rounded-2xl">{busy ? "Creating…" : "Create Subject"}</Button></WorkspaceFormFooter></form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="flex flex-col gap-1.5"><Label>{label}</Label>{children}</div>; }
function ScheduleDayTimes({ days, value, onChange }: { days: number[]; value: DayTimes; onChange: (value: DayTimes) => void }) { return days.length ? <div className="rounded-2xl bg-secondary/50 p-3"><p className="text-xs font-semibold text-muted-foreground">Optional class times</p><div className="mt-3 flex flex-col gap-2">{[...days].sort((a, b) => a - b).map(weekday => <div key={weekday} className="grid grid-cols-[minmax(0,1fr)_1fr_1fr] items-center gap-2"><span className="text-sm font-medium">{weekdays[weekday]}</span><Input aria-label={`${weekdays[weekday]} start time`} type="time" value={value[weekday]?.startTime ?? ""} onChange={event => onChange({ ...value, [weekday]: { startTime: event.target.value, endTime: value[weekday]?.endTime ?? "" } })} /><Input aria-label={`${weekdays[weekday]} end time`} type="time" value={value[weekday]?.endTime ?? ""} onChange={event => onChange({ ...value, [weekday]: { startTime: value[weekday]?.startTime ?? "", endTime: event.target.value } })} /></div>)}</div></div> : null; }
function EmptyGallery() { return <div className="linear-panel mt-4 grid min-h-72 place-items-center p-8 text-center"><div><span className="mx-auto grid size-10 place-items-center rounded-md border border-border bg-secondary text-primary"><GraduationCap className="h-4 w-4" /></span><h2 className="mt-5 text-xl font-semibold">Create your first Subject</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Each Subject gets its own Students, Schedule, class sessions, Attendance, and sharing space.</p><Button asChild className="mt-6"><Link href="/app/subjects/new"><Plus data-icon="inline-start" />New Subject</Link></Button></div></div>; }
function formatDays(days: Array<{ weekday: number; startTime: string | null; endTime?: string | null }>) { return days.length ? days.map(day => `${weekdays[day.weekday]}${day.startTime ? ` · ${day.startTime}${day.endTime ? `–${day.endTime}` : ""}` : ""}`).join(" · ") : "No Schedule set"; }
