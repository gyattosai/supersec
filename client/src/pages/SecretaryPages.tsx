import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowRight, BookOpen, CalendarDays, ChartNoAxesCombined, CircleAlert, Settings } from "lucide-react";
import { Link } from "wouter";

const pageInfo = {
  subjects: { icon: BookOpen, title: "Subjects", body: "Each Subject keeps its own Students, Schedule, Attendance, class information, and shared public links." },
  reports: { icon: ChartNoAxesCombined, title: "Reports", body: "Create per-session Class Attendance and end-of-exams All Subject Attendance reports, then share aggregate-only views." },
  settings: { icon: Settings, title: "Settings", body: "Use the workspace controls to manage Subjects, Archive retained records, and keep public information ready to share." },
} as const;

export function SecretaryDashboard() {
  const owner = trpc.foundation.owner.getContext.useQuery();
  const subjects = trpc.subjects.list.useQuery();
  const reports = trpc.reports.list.useQuery();
  const activeSubjects = subjects.data?.filter(subject => subject.status === "active").length ?? 0;
  const sharedSubjects = subjects.data?.filter(subject => subject.status === "active" && subject.publishState === "published").length ?? 0;
  const publishedReports = reports.data?.filter(report => report.publishState === "published").length ?? 0;
  const archivedSubjects = subjects.data?.filter(subject => subject.status === "archived").length ?? 0;
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-7xl pb-8">
        <header className="border-b border-border/80 pb-7 sm:pb-8">
          <p className="text-sm font-semibold text-primary">Secretary workspace</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl"><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Class records, ready for the next task{owner.data?.name ? `, ${owner.data.name.split(" ")[0]}` : ""}.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Keep each Subject separate, finalize official Attendance, and publish only the information your class is ready to receive.</p></div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm shadow-black/10"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active records</p><p className="mt-1 text-2xl font-semibold tracking-tight">{activeSubjects} <span className="text-sm font-medium text-muted-foreground">{activeSubjects === 1 ? "Subject" : "Subjects"}</span></p></div>
          </div>
        </header>

        <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]">
          <section className="relative overflow-hidden rounded-[32px] border border-primary/25 bg-card p-6 shadow-[0_18px_48px_-28px_rgba(199,82,0,0.48)] sm:p-8">
            <div className="absolute right-[-2rem] top-[-2rem] h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="relative"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><BookOpen className="h-5 w-5" /></span><p className="mt-6 text-sm font-semibold text-primary">Class control</p><h2 className="mt-2 max-w-lg text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Manage the records that keep your class moving.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Open a Subject to update Students and Schedule, add a class session, prepare Attendance, or publish current class information.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/app/subjects" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-transform active:scale-[0.97]"><BookOpen className="h-4 w-4" />Manage Subjects<ArrowRight className="h-4 w-4" /></Link><Link href="/app/settings" className="inline-flex min-h-11 items-center rounded-2xl border border-border bg-background/40 px-4 text-sm font-semibold text-foreground hover:bg-accent">Open Settings</Link></div></div>
          </section>

          <section className="rounded-[32px] border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Record summary</p><p className="mt-1 text-sm leading-6 text-muted-foreground">A quiet count of the records under your care.</p></div><Badge variant="secondary" className="rounded-full px-3 py-1">Current</Badge></div><div className="mt-5 grid grid-cols-2 gap-3"><RecordMetric label="Shared" value={sharedSubjects} tone="text-emerald-300" /><RecordMetric label="Reports" value={publishedReports} tone="text-primary" /><RecordMetric label="Archived" value={archivedSubjects} tone="text-muted-foreground" /><RecordMetric label="Subjects" value={activeSubjects} /></div></section>
        </div>

        <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Next actions</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Choose the operational task in front of you.</h2></div><p className="max-w-md text-sm leading-6 text-muted-foreground">Each action keeps private records and public sharing in the correct order.</p></div><div className="mt-5 grid gap-4 lg:grid-cols-3"><WorkflowCard icon={BookOpen} eyebrow="Class setup" title="Manage Subjects" body="Keep independent Students, Schedule, No Class dates, and current class information in one place." action="Open Subjects" route="/app/subjects" /><WorkflowCard icon={CalendarDays} eyebrow="Official record" title="Review Attendance" body="Start from a class session, resolve Zoom suggestions, and set each official status before publication." action="Open class sessions" route="/app/subjects" /><WorkflowCard icon={ChartNoAxesCombined} eyebrow="Professor-ready" title="Prepare Reports" body="Create private class or all-subject summaries, then share aggregate-only report links when ready." action="Open Reports" route="/app/reports" /></div></section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center rounded-[28px] border border-border bg-card p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><CircleAlert className="h-5 w-5" /></span><div><p className="font-semibold">Private workspace, deliberate sharing</p><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{activeSubjects ? "Review Attendance, publish Announcements, Resources, and Questions & Answers, then share public links. Public pages exclude private Zoom input and secretary-only work." : "Start with a Subject, its Schedule, and its independent Student list. Then add class sessions and publish only the information ready to share."}</p></div></div><Link href="/app/archive" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"><Archive className="h-4 w-4 text-primary" />Open Archive</Link></section>
      </section>
    </DashboardLayout>
  );
}

export function SecretarySettingsPage() {
  const subjects = trpc.subjects.list.useQuery();
  const activeSubjects = subjects.data?.filter(subject => subject.status === "active") ?? [];
  return <DashboardLayout><section className="mx-auto max-w-4xl"><WorkspacePageHeader eyebrow="Private workspace" title="Settings" description="Each Subject keeps its details, Students, fixed Schedule, sharing, and No Class controls together. Choose a Subject to manage its settings directly." /><section className="mt-7 rounded-[28px] border border-border bg-card p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Settings className="h-5 w-5" /></span><div><h2 className="font-semibold">Subject settings</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Updates here remain secretary-only until you choose to publish a Subject or content item.</p></div></div><div className="mt-5 space-y-3">{activeSubjects.map(subject => <Link key={subject.id} href={`/app/subjects?subject=${subject.id}`} className="group flex min-h-24 items-start gap-3 rounded-2xl border border-border bg-secondary p-4 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><BookOpen className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{subject.name}</p><RecordStatusBadge tone={subject.publishState === "published" ? "published" : "draft"}>{subject.publishState}</RecordStatusBadge></div><p className="mt-1 text-sm text-muted-foreground">{subject.code} · {subject.professorName}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Manage details, Students, Schedule, No Class, and sharing.</p></div><ArrowRight className="mt-2 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" /></Link>)}{subjects.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading Subject settings…</p> : null}{!subjects.isLoading && !activeSubjects.length ? <div className="rounded-2xl border border-dashed border-border p-6 text-center"><h2 className="font-semibold">No active Subjects yet</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Create a Subject first, then return here to manage its settings.</p><Link href="/app/subjects" className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Open Subjects</Link></div> : null}</div></section></section></DashboardLayout>;
}

export function SecretaryPlaceholder({ page }: { page: keyof typeof pageInfo }) {
  const content = pageInfo[page];
  const Icon = content.icon;
  return (
    <DashboardLayout>
      <section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center">
        <div className="w-full rounded-[28px] border border-border bg-card p-7 text-center shadow-xl shadow-black/10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Icon className="h-5 w-5" /></span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{content.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{content.body}</p>
          <Link href="/app" className="mt-7 inline-flex min-h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Back to Dashboard</Link>
        </div>
      </section>
    </DashboardLayout>
  );
}

function WorkflowCard({ icon: Icon, eyebrow, title, body, action, route }: { icon: typeof BookOpen; eyebrow: string; title: string; body: string; action: string; route: string }) { return <Link href={route} className="group block rounded-[28px] border border-border bg-card p-6 transition-[border-color,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-5 w-5" /></span><p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{title}</h3><p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">{body}</p><span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">{action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span></Link>; }

function RecordMetric({ label, value, tone = "text-foreground" }: { label: string; value: number; tone?: string }) { return <div className="rounded-2xl border border-border bg-secondary/45 px-4 py-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold tracking-tight ${tone}`}>{value}</p></div>; }
