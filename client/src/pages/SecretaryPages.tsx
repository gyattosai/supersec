import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
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
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-primary">Secretary workspace</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-3xl font-semibold tracking-[-0.035em]">Welcome{owner.data?.name ? `, ${owner.data.name}` : ""}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Manage each Subject separately, review Attendance, and prepare official information before sharing public links.</p></div>
          <Badge variant="secondary" className="rounded-full px-3 py-1">{activeSubjects} active {activeSubjects === 1 ? "Subject" : "Subjects"}</Badge>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><OverviewMetric label="Active Subjects" value={activeSubjects} /><OverviewMetric label="Shared Subjects" value={sharedSubjects} tone="text-emerald-300" /><OverviewMetric label="Published reports" value={publishedReports} tone="text-primary" /><OverviewMetric label="Archived Subjects" value={archivedSubjects} tone="text-muted-foreground" /></div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FoundationCard icon={BookOpen} title="Subjects" body="Create separate class spaces with independent Students and fixed weekday Schedules." route="/app/subjects" />
          <FoundationCard icon={CalendarDays} title="Attendance" body="Add a class session inside a Subject, then review PRESENT, ABSENT, and NOT SET." route="/app/subjects" />
          <FoundationCard icon={ChartNoAxesCombined} title="Reports" body="Create private class and all-subject summaries, then publish aggregate-only report links." route="/app/reports" />
        </div>
        <section className="mt-6 rounded-[28px] border border-border bg-card p-6">
          <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Workspace status</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{activeSubjects ? "Review Attendance, publish Announcements, Resources, and Questions & Answers, then share public links. Shared pages expose only public information." : "Start with a Subject, its Schedule, and its independent Student list. Then add class sessions and publish only the information ready to share."}</p></div></div>
        </section>
        <Link href="/app/archive" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-accent"><Archive className="h-4 w-4 text-primary" />Open Archive</Link>
      </section>
    </DashboardLayout>
  );
}

export function SecretarySettingsPage() {
  const subjects = trpc.subjects.list.useQuery();
  const activeSubjects = subjects.data?.filter(subject => subject.status === "active") ?? [];
  return <DashboardLayout><section className="mx-auto max-w-4xl"><p className="text-sm font-semibold text-primary">Private workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Each Subject keeps its details, Students, fixed Schedule, sharing, and No Class controls together. Choose a Subject to manage its settings directly.</p><section className="mt-7 rounded-[28px] border border-border bg-card p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Settings className="h-5 w-5" /></span><div><h2 className="font-semibold">Subject settings</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Updates here remain secretary-only until you choose to publish a Subject or content item.</p></div></div><div className="mt-5 space-y-3">{activeSubjects.map(subject => <Link key={subject.id} href={`/app/subjects?subject=${subject.id}`} className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-border bg-secondary p-4 transition-colors hover:border-primary/60 hover:bg-accent"><div><p className="font-semibold">{subject.name}</p><p className="mt-1 text-sm text-muted-foreground">{subject.code} · {subject.professorName}</p><p className="mt-2 text-xs text-muted-foreground">Details, Students, Schedule, No Class, and sharing</p></div><ArrowRight className="h-5 w-5 shrink-0 text-primary" /></Link>)}{subjects.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading Subject settings…</p> : null}{!subjects.isLoading && !activeSubjects.length ? <div className="rounded-2xl border border-dashed border-border p-6 text-center"><h2 className="font-semibold">No active Subjects yet</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Create a Subject first, then return here to manage its settings.</p><Link href="/app/subjects" className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Open Subjects</Link></div> : null}</div></section></section></DashboardLayout>;
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

function FoundationCard({ icon: Icon, title, body, route, disabled }: { icon: typeof BookOpen; title: string; body: string; route?: string; disabled?: boolean }) {
  const card = <div className="rounded-[24px] border border-border bg-card p-5 transition-colors hover:bg-card/80"><Icon className="h-5 w-5 text-primary" /><h2 className="mt-5 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>{disabled ? <p className="mt-5 text-sm font-medium text-muted-foreground">Coming in Milestone 4</p> : <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open <ArrowRight className="h-4 w-4" /></span>}</div>;
  return route ? <Link href={route} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{card}</Link> : card;
}

function OverviewMetric({ label, value, tone = "text-foreground" }: { label: string; value: number; tone?: string }) { return <section className="rounded-2xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p></section>; }
