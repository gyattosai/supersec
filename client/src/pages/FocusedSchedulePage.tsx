import DashboardLayout from "@/components/DashboardLayout";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { attendanceWorkspacePath } from "@/lib/attendanceWorkspace";
import { ArrowLeft, ArrowRight, CalendarDays, CalendarX, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link, Redirect, useRoute } from "wouter";

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Composer = "session" | "no-class" | null;

export function LegacyScheduleRedirect() {
  const [, params] = useRoute("/app/subjects/:subjectId/schedule");
  const subjectId = Number(params?.subjectId);
  return <Redirect to={attendanceWorkspacePath(subjectId)} />;
}

export function FocusedAttendancePage() {
  const [, params] = useRoute("/app/subjects/:subjectId/attendance");
  const subjectId = Number(params?.subjectId);
  const subject = trpc.subjects.get.useQuery({ subjectId }, { enabled: Number.isFinite(subjectId) && subjectId > 0 });
  const sessions = trpc.subjects.sessions.list.useQuery({ subjectId }, { enabled: Number.isFinite(subjectId) && subjectId > 0 });
  const utils = trpc.useUtils();
  const [composer, setComposer] = useState<Composer>(null);
  const [sessionAt, setSessionAt] = useState("");
  const [noClassAt, setNoClassAt] = useState("");
  const [reason, setReason] = useState("");
  const [sessionForNoClass, setSessionForNoClass] = useState<number | null>(null);
  const refresh = () => utils.subjects.sessions.list.invalidate({ subjectId });
  const createSession = trpc.subjects.sessions.create.useMutation({ onSuccess: () => { refresh(); setSessionAt(""); setComposer(null); toast.success("Class session added"); }, onError: error => toast.error(error.message) });
  const createNoClass = trpc.subjects.sessions.createNoClass.useMutation({ onSuccess: () => { refresh(); setNoClassAt(""); setReason(""); setComposer(null); toast.success("No Class notice added"); }, onError: error => toast.error(error.message) });
  const setNoClass = trpc.subjects.sessions.setNoClass.useMutation({ onSuccess: () => { refresh(); setReason(""); setSessionForNoClass(null); toast.success("Class session updated"); }, onError: error => toast.error(error.message) });
  const fixedSchedule = subject.data?.meetingDays.map(day => `${weekdayNames[day.weekday]}${day.startTime ? ` · ${day.startTime}${day.endTime ? `–${day.endTime}` : ""}` : ""}`).join(" · ") || "No fixed weekday schedule";
  const closeComposer = () => { setComposer(null); setSessionAt(""); setNoClassAt(""); setReason(""); };
  const submitSession = (event: FormEvent) => { event.preventDefault(); if (sessionAt) createSession.mutate({ subjectId, startsAt: new Date(sessionAt) }); };
  const submitNoClass = (event: FormEvent) => { event.preventDefault(); if (noClassAt && reason.trim()) createNoClass.mutate({ subjectId, startsAt: new Date(noClassAt), reason: reason.trim() }); };

  if (subject.isLoading) return <DashboardLayout><section className="mx-auto max-w-4xl"><div className="signal-inset mt-6 grid min-h-72 place-items-center text-sm text-muted-foreground">Loading Subject workspace…</div></section></DashboardLayout>;
  if (!subject.data) return <DashboardLayout><section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center"><div className="signal-panel border-t-2 border-primary p-8 text-center"><CalendarDays className="mx-auto text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Subject unavailable</h1><Link href="/app/subjects" className="signal-action mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Back to Subjects</Link></div></section></DashboardLayout>;
  return <DashboardLayout><section className="mx-auto max-w-4xl"><WorkspacePageHeader eyebrow="Attendance" title="Attendance" description="Add class dates, mark No Class, then take Attendance." back={<Link href={`/app/subjects/${subjectId}`} className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Subject</Link>} action={<div className="flex gap-2"><Button variant="outline" onClick={() => setComposer("no-class")}><CalendarX className="h-4 w-4" />Add No Class</Button><Button onClick={() => setComposer("session")}><Plus className="h-4 w-4" />Add class date</Button></div>} /><div className="mt-6 space-y-5"><section className="signal-panel border-l-2 border-l-primary p-5 sm:p-6"><p className="signal-kicker">Regular class time</p><p className="mt-2 text-xl font-bold tracking-[-0.035em]">{fixedSchedule}</p><Link href={`/app/subjects/${subjectId}/details`} className="signal-action mt-4 inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-primary hover:bg-secondary">Edit class time <ArrowRight className="h-4 w-4" /></Link></section><section className="border-y border-border py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="signal-kicker">Class dates</p><h2 className="signal-heading mt-2">Attendance sessions</h2></div><Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">{sessions.data?.length ?? 0} total</Badge></div><div className="mt-5 divide-y divide-border border-y border-border">{sessions.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading class dates…</p> : null}{sessions.data?.map(session => <article key={session.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{new Date(session.startsAt).toLocaleString()}</p><p className="mt-1 text-sm text-muted-foreground">{session.sessionState === "no_class" ? `No Class · ${session.noClassReason}` : session.sessionState === "completed" ? "Attendance completed" : "Ready for Attendance"}</p></div><div className="flex flex-wrap gap-2">{session.sessionState === "no_class" ? <Button type="button" variant="outline" disabled={setNoClass.isPending} onClick={() => setNoClass.mutate({ sessionId: session.id, noClass: false, publish: true })}>Restore class</Button> : <><Link href={`/app/attendance/${session.id}`} className="signal-action inline-flex min-h-11 items-center gap-2 bg-primary px-3 text-sm font-semibold text-primary-foreground">Take Attendance <ArrowRight className="h-4 w-4" /></Link><Button type="button" variant="outline" onClick={() => { setSessionForNoClass(session.id); setReason(""); }}>Mark No Class</Button></>}</div></article>)}{!sessions.isLoading && !sessions.data?.length ? <div className="py-12 text-center"><CalendarDays className="mx-auto h-5 w-5 text-primary" /><p className="mt-4 font-semibold">No class dates yet</p><Button onClick={() => setComposer("session")} className="mt-5">Add class date</Button></div> : null}</div></section></div>
    <Dialog open={composer !== null} onOpenChange={open => !open && closeComposer()}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{composer === "session" ? "Add class date" : "Add No Class"}</DialogTitle><DialogDescription>{composer === "session" ? "Add a date, then take Attendance from this page." : "Post a No Class notice for a holiday, event, weather day, or another change."}</DialogDescription></DialogHeader>{composer === "session" ? <form onSubmit={submitSession} className="mt-4 flex flex-col gap-3"><Label htmlFor="new-session-date">Class date and time</Label><Input id="new-session-date" type="datetime-local" required value={sessionAt} onChange={event => setSessionAt(event.target.value)} /><DialogFooter className="mt-2"><Button type="button" variant="outline" onClick={closeComposer}>Cancel</Button><Button disabled={createSession.isPending || !sessionAt}>{createSession.isPending ? "Adding…" : "Add class date"}</Button></DialogFooter></form> : <form onSubmit={submitNoClass} className="mt-4 flex flex-col gap-3"><Label htmlFor="no-class-date">No Class date and time</Label><Input id="no-class-date" type="datetime-local" required value={noClassAt} onChange={event => setNoClassAt(event.target.value)} /><Label htmlFor="no-class-reason">Reason</Label><Input id="no-class-reason" required value={reason} onChange={event => setReason(event.target.value)} placeholder="Holiday, school event, weather, or other" /><DialogFooter className="mt-2"><Button type="button" variant="outline" onClick={closeComposer}>Cancel</Button><Button disabled={createNoClass.isPending || !noClassAt || !reason.trim()}>{createNoClass.isPending ? "Adding…" : "Add No Class"}</Button></DialogFooter></form>}</DialogContent></Dialog>
    <Dialog open={sessionForNoClass !== null} onOpenChange={open => !open && setSessionForNoClass(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Set No Class</DialogTitle><DialogDescription>Replace this scheduled session with a direct No Class notice. You can restore the class later.</DialogDescription></DialogHeader><div className="mt-4 flex flex-col gap-3"><Label htmlFor="session-no-class-reason">Reason</Label><Input id="session-no-class-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Holiday, event, weather, or other" /><DialogFooter className="mt-2"><Button type="button" variant="outline" onClick={() => setSessionForNoClass(null)}>Cancel</Button><Button disabled={setNoClass.isPending || !reason.trim()} onClick={() => sessionForNoClass && setNoClass.mutate({ sessionId: sessionForNoClass, noClass: true, reason: reason.trim(), publish: true })}>Set No Class</Button></DialogFooter></div></DialogContent></Dialog>
  </section></DashboardLayout>;

}
