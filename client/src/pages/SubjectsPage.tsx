import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Archive, BookOpen, CalendarDays, Check, CircleHelp, Clipboard, GraduationCap, Megaphone, Plus, UserPlus, Users } from "lucide-react";
import { Link } from "wouter";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SubjectsPage() {
  const utils = trpc.useUtils();
  const subjects = trpc.subjects.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(() => subjects.data?.find(subject => subject.id === selectedId) ?? subjects.data?.[0] ?? null, [subjects.data, selectedId]);

  useEffect(() => {
    if (subjects.data?.length && selectedId === null) setSelectedId(subjects.data[0].id);
  }, [subjects.data, selectedId]);

  const create = trpc.subjects.create.useMutation({
    onSuccess: async ({ id }) => { await utils.subjects.list.invalidate(); setSelectedId(id); toast.success("Subject created"); },
    onError: error => toast.error(error.message),
  });

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-primary">Private workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Subjects</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep every class separate: its Students, Schedule, Attendance, and shared information stay in one Subject.</p></div>
          <Badge variant="secondary" className="rounded-full px-3 py-1">{subjects.data?.length ?? 0} total</Badge>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.65fr)]">
          <div className="space-y-4">
            <CreateSubjectForm busy={create.isPending} onCreate={input => create.mutate(input)} />
            <div className="space-y-2">
              {subjects.isLoading ? <p className="px-1 text-sm text-muted-foreground">Loading Subjects…</p> : null}
              {subjects.data?.map(subject => <button key={subject.id} onClick={() => setSelectedId(subject.id)} className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.id === subject.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{subject.name}</p><p className="mt-1 text-sm text-muted-foreground">{subject.code} · {subject.professorName}</p></div><Badge variant={subject.publishState === "published" ? "default" : "secondary"} className="rounded-full">{subject.publishState}</Badge></div><p className="mt-3 text-xs text-muted-foreground">{formatDays(subject.meetingDays)}</p></button>)}
              {!subjects.isLoading && !subjects.data?.length ? <EmptySubjects /> : null}
            </div>
          </div>
          {selected ? <SubjectWorkspace subject={selected} /> : <div className="grid min-h-96 place-items-center rounded-[28px] border border-dashed border-border bg-card p-8 text-center"><GraduationCap className="h-8 w-8 text-muted-foreground" /><h2 className="mt-4 font-semibold">Create your first Subject</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Add the class name, code, professor, and fixed weekday Schedule. You can add Students and No Class notices next.</p></div>}
        </div>
      </section>
    </DashboardLayout>
  );
}

function CreateSubjectForm({ busy, onCreate }: { busy: boolean; onCreate: (input: { name: string; code: string; professorName: string; termName: string | null; meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }> }) => void }) {
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [professor, setProfessor] = useState(""); const [term, setTerm] = useState(""); const [days, setDays] = useState<number[]>([2, 5]);
  const submit = (event: FormEvent) => { event.preventDefault(); onCreate({ name, code, professorName: professor, termName: term || null, meetingDays: days.map(weekday => ({ weekday, startTime: null, endTime: null })) }); setName(""); setCode(""); setProfessor(""); setTerm(""); };
  return <form onSubmit={submit} className="rounded-[28px] border border-border bg-card p-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></span><h2 className="font-semibold">New Subject</h2></div><div className="mt-5 space-y-3"><Field label="Subject name"><Input required value={name} onChange={e => setName(e.target.value)} placeholder="Example: Research Methods" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Subject code"><Input required value={code} onChange={e => setCode(e.target.value)} placeholder="RM 101" /></Field><Field label="Term (optional)"><Input value={term} onChange={e => setTerm(e.target.value)} placeholder="2026 Term 1" /></Field></div><Field label="Professor"><Input required value={professor} onChange={e => setProfessor(e.target.value)} placeholder="Professor name" /></Field><fieldset><legend className="text-sm font-medium">Fixed weekday Schedule</legend><div className="mt-2 flex flex-wrap gap-2">{weekdays.map((day, index) => <button type="button" key={day} onClick={() => setDays(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index])} className={`min-h-11 rounded-xl px-3 text-sm font-medium ${days.includes(index) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{day.slice(0, 3)}</button>)}</div></fieldset><Button disabled={busy || !days.length} className="min-h-11 w-full rounded-2xl">Create Subject</Button></div></form>;
}

function SubjectWorkspace({ subject }: { subject: { id: number; publicId: string; name: string; code: string; professorName: string; publishState: "draft" | "published"; status: "active" | "archived"; meetingDays: Array<{ weekday: number; startTime: string | null; endTime: string | null }> } }) {
  const utils = trpc.useUtils();
  const students = trpc.subjects.students.list.useQuery({ subjectId: subject.id });
  const sessions = trpc.subjects.sessions.list.useQuery({ subjectId: subject.id });
  const publish = trpc.subjects.publish.useMutation({ onSuccess: () => { utils.subjects.list.invalidate(); toast.success("Subject visibility updated"); }, onError: error => toast.error(error.message) });
  const archive = trpc.subjects.archive.useMutation({ onSuccess: () => { utils.subjects.list.invalidate(); toast.success("Subject archive updated"); }, onError: error => toast.error(error.message) });
  const addStudent = trpc.subjects.students.add.useMutation({ onSuccess: () => { utils.subjects.students.list.invalidate({ subjectId: subject.id }); toast.success("Student added"); }, onError: error => toast.error(error.message) });
  const createSession = trpc.subjects.sessions.create.useMutation({ onSuccess: () => { utils.subjects.sessions.list.invalidate({ subjectId: subject.id }); toast.success("Class session added"); }, onError: error => toast.error(error.message) });
  const setNoClass = trpc.subjects.sessions.setNoClass.useMutation({ onSuccess: () => { utils.subjects.sessions.list.invalidate({ subjectId: subject.id }); toast.success("Class session updated"); }, onError: error => toast.error(error.message) });
  const [studentName, setStudentName] = useState(""); const [sessionAt, setSessionAt] = useState(""); const [noClassDialog, setNoClassDialog] = useState<{ id: number; startsAt: Date; reason: string } | null>(null);
  const publicUrl = `${window.location.origin}/s/${subject.publicId}`;
  return <div className="space-y-5"><section className="rounded-[28px] border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">{subject.code}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{subject.name}</h2><p className="mt-2 text-sm text-muted-foreground">{subject.professorName} · {formatDays(subject.meetingDays)}</p></div><Badge variant={subject.publishState === "published" ? "default" : "secondary"} className="rounded-full px-3 py-1">{subject.publishState}</Badge></div><div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => publish.mutate({ subjectId: subject.id, publish: subject.publishState !== "published" })} variant={subject.publishState === "published" ? "secondary" : "default"} className="min-h-11 rounded-2xl">{subject.publishState === "published" ? "Unpublish" : "Publish Subject"}</Button>{subject.publishState === "published" ? <Button onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success("Public link copied"))} variant="outline" className="min-h-11 rounded-2xl"><Clipboard className="mr-2 h-4 w-4" />Copy link</Button> : null}<Button onClick={() => archive.mutate({ subjectId: subject.id, archive: subject.status !== "archived" })} variant="ghost" className="min-h-11 rounded-2xl text-muted-foreground"><Archive className="mr-2 h-4 w-4" />{subject.status === "archived" ? "Restore" : "Archive"}</Button></div></section>
    <section className="grid gap-2 rounded-[28px] border border-border bg-card p-4 sm:grid-cols-3"><Link href={`/app/content/${subject.id}/announcements`} className="flex min-h-16 items-center gap-3 rounded-2xl bg-secondary p-3 text-sm font-semibold hover:bg-accent"><Megaphone className="h-5 w-5 text-primary" />Announcements</Link><Link href={`/app/content/${subject.id}/resources`} className="flex min-h-16 items-center gap-3 rounded-2xl bg-secondary p-3 text-sm font-semibold hover:bg-accent"><BookOpen className="h-5 w-5 text-primary" />Resources</Link><Link href={`/app/content/${subject.id}/questions`} className="flex min-h-16 items-center gap-3 rounded-2xl bg-secondary p-3 text-sm font-semibold hover:bg-accent"><CircleHelp className="h-5 w-5 text-primary" />Questions & Answers</Link></section>
    <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-[28px] border border-border bg-card p-5"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h3 className="font-semibold">Students</h3><Badge variant="secondary" className="ml-auto rounded-full">{students.data?.filter(row => row.state === "active").length ?? 0}</Badge></div><form onSubmit={event => { event.preventDefault(); if (studentName.trim()) { addStudent.mutate({ subjectId: subject.id, canonicalName: studentName.trim() }); setStudentName(""); } }} className="mt-4 flex gap-2"><Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="SECTION_LAST NAME, FIRST NAME" /><Button aria-label="Add Student" size="icon" className="min-h-11 min-w-11 rounded-xl"><UserPlus className="h-4 w-4" /></Button></form><div className="mt-4 max-h-56 space-y-2 overflow-auto pr-1">{students.data?.filter(row => row.state === "active").map(row => <div key={row.membershipId} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm"><span>{row.canonicalName}</span><Check className="h-4 w-4 text-primary" /></div>)}{!students.data?.length ? <p className="py-4 text-center text-sm text-muted-foreground">Add the Students enrolled in this Subject.</p> : null}</div></section>
      <section className="rounded-[28px] border border-border bg-card p-5"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h3 className="font-semibold">Schedule & No Class</h3></div><form onSubmit={event => { event.preventDefault(); if (sessionAt) { createSession.mutate({ subjectId: subject.id, startsAt: new Date(sessionAt) }); setSessionAt(""); } }} className="mt-4 flex gap-2"><Input type="datetime-local" value={sessionAt} onChange={e => setSessionAt(e.target.value)} /><Button aria-label="Add class session" size="icon" className="min-h-11 min-w-11 rounded-xl"><Plus className="h-4 w-4" /></Button></form><div className="mt-4 max-h-56 space-y-2 overflow-auto pr-1">{sessions.data?.map(session => <div key={session.id} className="rounded-xl bg-secondary p-3"><div className="flex items-center justify-between gap-3"><Link href={`/app/attendance/${session.id}`} className="text-sm font-medium hover:text-primary">{new Date(session.startsAt).toLocaleString()}</Link>{session.sessionState === "no_class" ? <button onClick={() => setNoClass.mutate({ sessionId: session.id, noClass: false, publish: true })} className="min-h-11 text-xs font-semibold text-primary">Restore class</button> : <button onClick={() => setNoClassDialog({ id: session.id, startsAt: new Date(session.startsAt), reason: session.noClassReason ?? "" })} className="min-h-11 text-xs font-semibold text-primary">Set No Class</button>}</div>{session.sessionState === "no_class" ? <p className="mt-1 text-xs text-amber-300">No Class: {session.noClassReason}</p> : <p className="mt-1 text-xs text-muted-foreground">Open Attendance</p>}</div>)}{!sessions.data?.length ? <p className="py-4 text-center text-sm text-muted-foreground">Add a class session or a No Class date.</p> : null}</div></section></div>
    <NoClassDialog
      value={noClassDialog}
      busy={setNoClass.isPending}
      onClose={() => setNoClassDialog(null)}
      onSave={reason => noClassDialog && setNoClass.mutate({ sessionId: noClassDialog.id, noClass: true, reason, publish: true }, { onSuccess: () => setNoClassDialog(null) })}
    />
  </div>;
}

function NoClassDialog({ value, busy, onClose, onSave }: { value: { id: number; startsAt: Date; reason: string } | null; busy: boolean; onClose: () => void; onSave: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  useEffect(() => setReason(value?.reason ?? ""), [value]);
  return <Dialog open={Boolean(value)} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="rounded-[28px] p-5 sm:max-w-md"><DialogHeader><DialogTitle>Set No Class</DialogTitle><DialogDescription>{value ? `${value.startsAt.toLocaleString()} will appear as a published No Class notice on the public Subject page.` : ""}</DialogDescription></DialogHeader><div><Label htmlFor="no-class-reason">Reason</Label><Input id="no-class-reason" autoFocus value={reason} onChange={event => setReason(event.target.value)} className="mt-2" placeholder="Holiday, school event, weather, or other" /></div><DialogFooter><Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="min-h-11 rounded-2xl">Cancel</Button><Button type="button" onClick={() => onSave(reason.trim() || "No Class")} disabled={busy} className="min-h-11 rounded-2xl">{busy ? "Saving…" : "Publish No Class"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function EmptySubjects() { return <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm leading-6 text-muted-foreground">Your Subjects will appear here. Start with the class name, code, professor, and fixed weekday Schedule.</div>; }
function formatDays(days: Array<{ weekday: number; startTime: string | null }>) { return days.length ? days.map(day => `${weekdays[day.weekday]}${day.startTime ? ` · ${day.startTime}` : ""}`).join(" · ") : "No Schedule set"; }
