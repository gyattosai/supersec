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
      <section className="mx-auto max-w-[1280px] pb-8">
        <header className="linear-row flex flex-wrap items-end justify-between gap-5 pb-6">
          <div className="max-w-3xl">
            <p className="linear-label text-primary">Secretary workspace</p>
            <h1 className="linear-title mt-3">Class records, ready for the next task{owner.data?.name ? `, ${owner.data.name.split(" ")[0]}` : ""}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Keep each Subject separate, finalize official Attendance, and publish only the information your class is ready to receive.</p>
          </div>
          <div className="border-l border-border pl-4"><p className="linear-label text-muted-foreground">Active records</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{activeSubjects} <span className="text-sm font-medium text-muted-foreground">{activeSubjects === 1 ? "Subject" : "Subjects"}</span></p></div>
        </header>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="linear-panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><span className="linear-label text-primary">Class control</span><h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.04em]">Manage the records that keep your class moving.</h2></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-primary/50 bg-primary/15 text-primary"><BookOpen className="h-4 w-4" /></span></div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Open a Subject to update Students and Schedule, add a class session, prepare Attendance, or publish current class information.</p>
            <div className="mt-6 flex flex-wrap gap-2"><Button asChild><Link href="/app/subjects"><BookOpen className="h-4 w-4" />Manage Subjects</Link></Button><Button asChild variant="outline"><Link href="/app/settings">Open Settings</Link></Button></div>
          </section>

          <section className="linear-panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">Record summary</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Current records under your care.</p></div><Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">Current</Badge></div><div className="mt-5 grid grid-cols-2 gap-2"><RecordMetric label="Shared" value={sharedSubjects} tone="text-emerald-300" /><RecordMetric label="Reports" value={publishedReports} tone="text-primary" /><RecordMetric label="Archived" value={archivedSubjects} tone="text-muted-foreground" /><RecordMetric label="Subjects" value={activeSubjects} /></div></section>
        </div>

        <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="linear-label text-muted-foreground">Next actions</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">Choose the operational task in front of you.</h2></div><p className="max-w-md text-sm leading-6 text-muted-foreground">Each action keeps private records and public sharing in the correct order.</p></div><div className="mt-4 grid gap-3 lg:grid-cols-3"><WorkflowCard icon={BookOpen} eyebrow="Class setup" title="Manage Subjects" body="Keep independent Students, Schedule, No Class dates, and current class information in one place." action="Open Subjects" route="/app/subjects" /><WorkflowCard icon={CalendarDays} eyebrow="Official record" title="Review Attendance" body="Start from a class session, resolve Zoom suggestions, and set each official status before publication." action="Open class sessions" route="/app/subjects" /><WorkflowCard icon={ChartNoAxesCombined} eyebrow="Professor-ready" title="Prepare Reports" body="Create private class or all-subject summaries, then share aggregate-only report links when ready." action="Open Reports" route="/app/reports" /></div></section>

        <section className="linear-panel mt-6 grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-secondary text-primary"><CircleAlert className="h-4 w-4" /></span><div><p className="font-medium">Private workspace, deliberate sharing</p><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{activeSubjects ? "Review Attendance, publish Announcements, Resources, and Questions & Answers, then share public links. Public pages exclude private Zoom input and secretary-only work." : "Start with a Subject, its Schedule, and its independent Student list. Then add class sessions and publish only the information ready to share."}</p></div></div><Button asChild variant="outline"><Link href="/app/archive"><Archive className="h-4 w-4" />Open Archive</Link></Button></section>
      </section>
    </DashboardLayout>
  );
}

export function SecretarySettingsPage() {
  const subjects = trpc.subjects.list.useQuery();
  const activeSubjects = subjects.data?.filter(subject => subject.status === "active") ?? [];
  return <DashboardLayout><section className="mx-auto max-w-4xl"><WorkspacePageHeader eyebrow="Private workspace" title="Settings" description="Each Subject keeps its details, Students, fixed Schedule, sharing, and No Class controls together. Choose a Subject to manage its settings directly." /><section className="linear-panel mt-6 p-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md border border-border bg-secondary text-primary"><Settings className="h-4 w-4" /></span><div><h2 className="font-medium">Subject settings</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Updates here remain secretary-only until you choose to publish a Subject or content item.</p></div></div><div className="mt-5 divide-y divide-border">{activeSubjects.map(subject => <Link key={subject.id} href={`/app/subjects?subject=${subject.id}`} className="group flex min-h-22 items-start gap-3 py-4 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-secondary text-primary transition-colors group-hover:border-primary/50 group-hover:text-primary"><BookOpen className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{subject.name}</p><RecordStatusBadge tone={subject.publishState === "published" ? "published" : "draft"}>{subject.publishState}</RecordStatusBadge></div><p className="mt-1 text-sm text-muted-foreground">{subject.code} · {subject.professorName}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Manage details, Students, Schedule, No Class, and sharing.</p></div><ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /></Link>)}{subjects.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading Subject settings…</p> : null}{!subjects.isLoading && !activeSubjects.length ? <div className="linear-panel-raised mt-4 p-6 text-center"><h2 className="font-medium">No active Subjects yet</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Create a Subject first, then return here to manage its settings.</p><Button asChild className="mt-4"><Link href="/app/subjects">Open Subjects</Link></Button></div> : null}</div></section></section></DashboardLayout>;
}

export function SecretaryPlaceholder({ page }: { page: keyof typeof pageInfo }) {
  const content = pageInfo[page];
  const Icon = content.icon;
  return <DashboardLayout><section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center"><div className="linear-panel w-full p-6 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-border bg-secondary text-primary"><Icon className="h-4 w-4" /></span><h1 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">{content.title}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{content.body}</p><Button asChild className="mt-6"><Link href="/app">Back to Dashboard</Link></Button></div></section></DashboardLayout>;
}

function WorkflowCard({ icon: Icon, eyebrow, title, body, action, route }: { icon: typeof BookOpen; eyebrow: string; title: string; body: string; action: string; route: string }) { return <Link href={route} className="linear-panel group block p-5 transition-[border-color,background-color] hover:border-primary/55 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-9 w-9 place-items-center rounded-md border border-border bg-secondary text-primary"><Icon className="h-4 w-4" /></span><p className="linear-label mt-5 text-muted-foreground">{eyebrow}</p><h3 className="mt-2 text-lg font-semibold tracking-[-0.03em]">{title}</h3><p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">{body}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">{action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span></Link>; }
function RecordMetric({ label, value, tone = "text-foreground" }: { label: string; value: number; tone?: string }) { return <div className="linear-subnav rounded-md px-3 py-2.5"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-semibold tracking-[-0.04em] ${tone}`}>{value}</p></div>; }
