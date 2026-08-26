import DashboardLayout from "@/components/DashboardLayout";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, UserMinus, UserPlus, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

type IntakeFeedback = { added: number; reactivated: number; skipped: number; processed: number } | null;

export function FocusedStudentsPage() {
  const [, params] = useRoute("/app/subjects/:subjectId/students");
  const subjectId = Number(params?.subjectId);
  const subject = trpc.subjects.get.useQuery({ subjectId }, { enabled: Number.isFinite(subjectId) && subjectId > 0 });
  const students = trpc.subjects.students.list.useQuery({ subjectId }, { enabled: Number.isFinite(subjectId) && subjectId > 0 });
  const utils = trpc.useUtils();
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeMode, setIntakeMode] = useState<"bulk" | "single">("bulk");
  const [studentName, setStudentName] = useState("");
  const [namesText, setNamesText] = useState("");
  const [feedback, setFeedback] = useState<IntakeFeedback>(null);
  const refresh = () => utils.subjects.students.list.invalidate({ subjectId });
  const add = trpc.subjects.students.add.useMutation({
    onSuccess: () => { refresh(); setStudentName(""); setFeedback(null); toast.success("Student added"); },
    onError: error => toast.error(error.message),
  });
  const addBulk = trpc.subjects.students.addBulk.useMutation({
    onSuccess: output => {
      refresh();
      setFeedback(output);
      setNamesText("");
      toast.success(`${output.added + output.reactivated} Student${output.added + output.reactivated === 1 ? "" : "s"} added to this Subject`);
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.subjects.students.remove.useMutation({
    onSuccess: () => { refresh(); toast.success("Student removed from this Subject"); },
    onError: error => toast.error(error.message),
  });
  const setScheduleConflict = trpc.subjects.students.setScheduleConflict.useMutation({
    onSuccess: (_output, input) => {
      refresh();
      toast.success(input.hasScheduleConflict ? "Schedule conflict marked for future Attendance defaults" : "Schedule conflict designation cleared");
    },
    onError: error => toast.error(error.message),
  });

  const activeStudents = students.data?.filter(student => student.state === "active") ?? [];
  const openIntake = (mode: "bulk" | "single") => { setIntakeMode(mode); setFeedback(null); setIntakeOpen(true); };
  const submitSingle = (event: FormEvent) => { event.preventDefault(); if (studentName.trim()) add.mutate({ subjectId, canonicalName: studentName.trim() }); };
  const submitBulk = (event: FormEvent) => { event.preventDefault(); if (namesText.trim()) addBulk.mutate({ subjectId, namesText }); };

  if (!subject.data && !subject.isLoading) {
    return <DashboardLayout><section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center"><div className="rounded-[30px] bg-secondary/35 p-1 ring-1 ring-border/75"><div className="rounded-[26px] bg-card p-8 text-center"><Users className="mx-auto text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Subject unavailable</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">This private class record may have been removed or is not available in the current workspace.</p><Link href="/app/subjects" className="mt-6 inline-flex min-h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Back to Subjects</Link></div></div></section></DashboardLayout>;
  }

  return <DashboardLayout><section className="mx-auto max-w-4xl"><WorkspacePageHeader eyebrow="Subject roster" title="Students" description="Keep this Subject roster focused. Add names in a separate intake view, then manage only the enrollment and private schedule-conflict designation here." back={<Link href={`/app/subjects/${subjectId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft />Back to Subject</Link>} action={<Badge variant="secondary" className="rounded-full px-3 py-1">{activeStudents.length} enrolled</Badge>} />
    {subject.data ? <div className="mt-7 flex flex-col gap-6"><section className="rounded-[30px] bg-secondary/35 p-1 ring-1 ring-border/75"><div className="flex flex-col gap-5 rounded-[26px] bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-7"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Roster intake</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Add Students outside the roster.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Bulk paste one class name per line. Duplicate, blank, and already-enrolled names are reported instead of added twice.</p></div><div className="flex flex-col gap-2 sm:min-w-48"><Button onClick={() => openIntake("bulk")} className="min-h-11 rounded-2xl"><UserPlus data-icon="inline-start" />Bulk add Students</Button><Button variant="outline" onClick={() => openIntake("single")} className="min-h-11 rounded-2xl">Add one Student</Button></div></div></section>
      <section className="rounded-[30px] bg-secondary/35 p-1 ring-1 ring-border/75"><div className="rounded-[26px] bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Enrolled Students</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Manage this Subject’s roster.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A schedule conflict is a private designation, not an Attendance status. It sets newly created Attendance records to PRESENT by default; you can still change each record.</p></div><Badge variant="secondary" className="rounded-full px-3 py-1">{activeStudents.length}</Badge></div>
        <div className="mt-6 flex flex-col gap-3">{students.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading Students…</p> : null}{activeStudents.map(student => <article key={student.membershipId} className="flex flex-col gap-4 rounded-2xl bg-secondary/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-semibold">{student.canonicalName}</p>{student.hasScheduleConflict ? <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-amber-300"><AlertTriangle className="size-3.5" />Schedule conflict · future records default PRESENT</p> : <p className="mt-1 text-xs leading-5 text-muted-foreground">No schedule-conflict designation</p>}</div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant={student.hasScheduleConflict ? "secondary" : "outline"} aria-pressed={student.hasScheduleConflict} disabled={setScheduleConflict.isPending} onClick={() => setScheduleConflict.mutate({ membershipId: student.membershipId, hasScheduleConflict: !student.hasScheduleConflict })} className="min-h-11 rounded-xl text-xs">{student.hasScheduleConflict ? "Conflict marked" : "Mark schedule conflict"}</Button><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${student.canonicalName} from this Subject`} disabled={remove.isPending} onClick={() => remove.mutate({ membershipId: student.membershipId })} className="min-h-11 min-w-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><UserMinus /></Button></div></article>)}{!students.isLoading && !activeStudents.length ? <div className="py-12 text-center"><Users className="mx-auto text-muted-foreground" /><p className="mt-4 font-semibold">No Students enrolled yet</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Start with a short paste list or add one Student from the dedicated intake view.</p><Button onClick={() => openIntake("bulk")} className="mt-5 min-h-11 rounded-2xl">Add Students</Button></div> : null}</div></div></section></div> : <div className="mt-7 grid min-h-72 place-items-center rounded-[30px] border border-border bg-card text-sm text-muted-foreground">Loading Subject workspace…</div>}
    <Dialog open={intakeOpen} onOpenChange={setIntakeOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{intakeMode === "bulk" ? "Bulk add Students" : "Add one Student"}</DialogTitle><DialogDescription>{intakeMode === "bulk" ? "Paste one Student per line. Empty lines are ignored; duplicate and already-enrolled names are safely skipped." : "Add one Student to this Subject using the class naming format."}</DialogDescription></DialogHeader><div className="mt-2 flex rounded-xl bg-secondary p-1" role="group" aria-label="Student intake mode"><button type="button" onClick={() => { setIntakeMode("bulk"); setFeedback(null); }} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${intakeMode === "bulk" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Bulk list</button><button type="button" onClick={() => { setIntakeMode("single"); setFeedback(null); }} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${intakeMode === "single" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>One Student</button></div>{intakeMode === "bulk" ? <form onSubmit={submitBulk} className="mt-4 flex flex-col gap-3"><Label htmlFor="bulk-student-names">Student names</Label><Textarea id="bulk-student-names" value={namesText} onChange={event => setNamesText(event.target.value)} placeholder={"SECTION_LAST NAME, FIRST NAME\nSECTION_LAST NAME, FIRST NAME"} className="min-h-56" /><p className="text-xs leading-5 text-muted-foreground">Up to 250 non-empty names at a time. Names stay private to this secretary workspace.</p>{feedback ? <div className="rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm leading-6"><strong>{feedback.added + feedback.reactivated} added or restored.</strong> {feedback.skipped ? `${feedback.skipped} duplicate, invalid, or already-enrolled name${feedback.skipped === 1 ? " was" : "s were"} skipped.` : "Every submitted name was ready to enroll."}</div> : null}<DialogFooter className="mt-2"><Button type="button" variant="outline" onClick={() => setIntakeOpen(false)} className="min-h-11 rounded-2xl">Done</Button><Button disabled={addBulk.isPending || !namesText.trim()} className="min-h-11 rounded-2xl">{addBulk.isPending ? "Adding…" : "Add Students"}</Button></DialogFooter></form> : <form onSubmit={submitSingle} className="mt-4 flex flex-col gap-3"><Label htmlFor="student-name">Student name</Label><Input id="student-name" required value={studentName} onChange={event => setStudentName(event.target.value)} placeholder="SECTION_LAST NAME, FIRST NAME" /><p className="text-xs leading-5 text-muted-foreground">Use the same class naming format used during private Zoom review.</p><DialogFooter className="mt-2"><Button type="button" variant="outline" onClick={() => setIntakeOpen(false)} className="min-h-11 rounded-2xl">Cancel</Button><Button disabled={add.isPending || !studentName.trim()} className="min-h-11 rounded-2xl">{add.isPending ? "Adding…" : "Add Student"}</Button></DialogFooter></form>}</DialogContent></Dialog>
  </section></DashboardLayout>;
}
