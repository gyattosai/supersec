import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowRight, BookOpen, CalendarDays, ChartNoAxesCombined, CircleAlert, Settings } from "lucide-react";
import { Link } from "wouter";

const pageInfo = {
  subjects: { icon: BookOpen, title: "Subjects", body: "Add and publish Subjects in Milestone 3. Each Subject will have its own Students, Schedule, Attendance, and class information." },
  reports: { icon: ChartNoAxesCombined, title: "Reports", body: "Per-session Class Attendance and end-of-exams All Subject Attendance reports will be added in Milestone 6." },
  settings: { icon: Settings, title: "Settings", body: "Workspace settings and archive controls will be added as the management tools are built." },
} as const;

export function SecretaryDashboard() {
  const owner = trpc.foundation.owner.getContext.useQuery();
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-primary">Secretary workspace</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-3xl font-semibold tracking-[-0.035em]">Welcome{owner.data?.name ? `, ${owner.data.name}` : ""}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Manage each Subject separately, review Attendance, and prepare official information before sharing public links.</p></div>
          <Badge variant="secondary" className="rounded-full px-3 py-1">In progress</Badge>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FoundationCard icon={BookOpen} title="Subjects" body="Create separate class spaces with independent Students and fixed weekday Schedules." route="/app/subjects" />
          <FoundationCard icon={CalendarDays} title="Attendance" body="Add a class session inside a Subject, then review PRESENT, ABSENT, and NOT SET." route="/app/subjects" />
          <FoundationCard icon={ChartNoAxesCombined} title="Reports" body="Published class and all-subject reports will be ready to share later." route="/app/reports" />
        </div>
        <section className="mt-6 rounded-[28px] border border-border bg-card p-6">
          <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Workspace status</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Subject setup, Attendance review, and draft/publish tools for Announcements, Resources, and Questions & Answers are underway. Shared links expose only published information.</p></div></div>
        </section>
      </section>
    </DashboardLayout>
  );
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
