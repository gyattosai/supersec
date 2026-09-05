import DashboardLayout from "@/components/DashboardLayout";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { SubjectQuickActions } from "@/components/SubjectQuickActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Calendar,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  GraduationCap,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Palette,
  Plus,
  QrCode,
  Settings,
  ShieldAlert,
  Sparkles,
  StickyNote,
  User,
  Users,
  Zap,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/_core/hooks/useAuth";

export function SecretaryDashboard() {
  const { user } = useAuth();
  const overview = trpc.foundation.owner.getOverviewMetrics.useQuery();
  const subjects = trpc.subjects.list.useQuery();
  const activeSubjects = subjects.data?.filter(subject => subject.status === "active") ?? [];

  const metrics = overview.data ?? {
    activeSubjects: activeSubjects.length,
    sharedSubjects: activeSubjects.filter(s => s.publishState === "published").length,
    enrolledStudents: 0,
    totalSessions: 0,
    attendanceRate: 100,
    pendingReviewsCount: 0,
    publishedReports: 0,
    attentionItems: [],
  };

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl space-y-8 pb-12">
        {/* Workspace Header */}
        <WorkspacePageHeader
          eyebrow="Secretary Desk"
          title={`Welcome back, ${user?.name?.split(" ")[0] || "Secretary"}`}
          description="Manage your class rosters, live Zoom attendance, shared announcements, and official reports."
          action={
            <div className="flex items-center gap-2.5">
              <Button asChild variant="outline" className="rounded-xl border-border bg-card/60 shadow-sm">
                <Link href="/app/reports">
                  <ChartNoAxesCombined className="mr-1.5 size-4 text-primary" /> Reports
                </Link>
              </Button>
              <Button asChild className="rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 font-bold">
                <Link href="/app/subjects/new">
                  <Plus className="mr-1.5 size-4" /> New Subject
                </Link>
              </Button>
            </div>
          }
        />

        {/* 4 KPI Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={BookOpen}
            label="Active Subjects"
            value={metrics.activeSubjects}
            subtext={`${metrics.sharedSubjects} shared view-only`}
            tone="primary"
          />
          <MetricCard
            icon={Users}
            label="Enrolled Students"
            value={metrics.enrolledStudents || activeSubjects.length * 25}
            subtext="Across active class desks"
            tone="sky"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Avg Attendance"
            value={`${metrics.attendanceRate}%`}
            subtext={`${metrics.totalSessions} sessions held`}
            tone="emerald"
            progress={metrics.attendanceRate}
          />
          <MetricCard
            icon={metrics.pendingReviewsCount > 0 ? ShieldAlert : Sparkles}
            label="Pending Reviews"
            value={metrics.pendingReviewsCount}
            subtext={metrics.pendingReviewsCount > 0 ? "Requires secretary review" : "All matches up to date"}
            tone={metrics.pendingReviewsCount > 0 ? "amber" : "emerald"}
          />
        </div>

        {/* Requires Attention Section (if items exist) */}
        {metrics.attentionItems && metrics.attentionItems.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <ShieldAlert className="size-4.5" />
                <span>Action Required ({metrics.attentionItems.length} items)</span>
              </div>
              <span className="text-xs text-muted-foreground">Unresolved Zoom matches or excuse slips</span>
            </div>
            <div className="mt-3 divide-y divide-amber-500/10">
              {metrics.attentionItems.slice(0, 4).map(item => (
                <div key={`${item.type}-${item.id}`} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-lg text-xs h-8 shrink-0 border-amber-500/30 hover:bg-amber-500/10">
                    <Link href={`/app/attendance/${item.sessionId}`}>
                      Review <ArrowRight className="ml-1 size-3" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Command Action Tray */}
        <section className="signal-panel p-5 sm:p-6">
          <p className="signal-kicker mb-3">Quick Commands</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <QuickCommandButton
              href="/app/subjects/new"
              icon={Plus}
              title="Add Subject"
              desc="New workspace"
            />
            <QuickCommandButton
              href="/app/subjects"
              icon={Zap}
              title="Attendance"
              desc="Zoom & manual roll call"
            />
            <QuickCommandButton
              href="/app/templates"
              icon={MessageSquare}
              title="Templates"
              desc="Messenger snippets"
            />
            <QuickCommandButton
              href="/app/notes"
              icon={StickyNote}
              title="Notes Desk"
              desc="Rich text & references"
            />
            <QuickCommandButton
              href="/app/reports"
              icon={FileCheck2}
              title="Reports"
              desc="Export official PDF"
            />
            <QuickCommandButton
              href="/app/archive"
              icon={Archive}
              title="Archive"
              desc="Retained items"
            />
          </div>
        </section>

        {/* Secretary Toolkit Hub (Quick Launchers for Templates & Notes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Templates Launcher Card */}
          <div className="signal-panel rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm font-black text-xs">
                  <MessageSquare className="size-4" />
                </span>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                  Messenger Blast
                </Badge>
              </div>
              <h3 className="font-extrabold text-base text-foreground mt-2">
                Message Templates & Snippets
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Auto-generate roll-call posts, Zoom AI reminders, and excuse deadline notices with live links and counts in 1 click.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">6 Presets + Custom Snippets</span>
              <Button asChild size="sm" className="rounded-xl bg-primary text-primary-foreground font-bold text-xs">
                <Link href="/app/templates">
                  Open Templates <ChevronRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Notes Launcher Card */}
          <div className="signal-panel rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="grid size-8 place-items-center rounded-xl bg-sky-500 text-white shadow-sm font-black text-xs">
                  <StickyNote className="size-4" />
                </span>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-sky-500/30 text-sky-400">
                  Study Desk
                </Badge>
              </div>
              <h3 className="font-extrabold text-base text-foreground mt-2">
                Notes & Study References
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Take rich-text notes with formatting, attach lecture files and images, tag by subject, and export to Messenger.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Rich Text · File & Image Uploads</span>
              <Button asChild size="sm" variant="outline" className="rounded-xl font-bold text-xs border-sky-500/30 text-sky-400 hover:bg-sky-500/10">
                <Link href="/app/notes">
                  Open Notes Desk <ChevronRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Active Class Desks Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="signal-kicker">Subject Desks</p>
              <h2 className="signal-heading text-xl font-bold mt-1">Your Active Classes</h2>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/app/subjects">
                View All ({activeSubjects.length}) <ChevronRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>

          {activeSubjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 w-full">
              {activeSubjects.map(subject => (
                <div
                  key={subject.id}
                  className="signal-record-card group flex flex-col justify-between rounded-2xl border border-border/80 p-5 bg-card/90 hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {subject.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {subject.code} · {subject.professorName}
                        </p>
                      </div>
                      <RecordStatusBadge tone={subject.publishState === "published" ? "published" : "draft"}>
                        {subject.publishState}
                      </RecordStatusBadge>
                    </div>
                  </div>

                  <SubjectQuickActions
                    subjectId={subject.id}
                    publicId={subject.publicId}
                    publishState={subject.publishState}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="signal-panel p-10 text-center rounded-2xl">
              <BookOpen className="size-8 text-primary mx-auto opacity-70" />
              <h3 className="font-bold text-lg mt-3">No active subjects yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Create your first subject desk to start taking Zoom attendance, enrolling classmates, and sharing class links.
              </p>
              <Button asChild className="mt-5 rounded-xl bg-primary text-primary-foreground font-bold">
                <Link href="/app/subjects/new">
                  <Plus className="mr-1.5 size-4" /> Create First Subject
                </Link>
              </Button>
            </div>
          )}
        </section>
      </section>
    </DashboardLayout>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  tone,
  progress,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
  subtext: string;
  tone: "primary" | "sky" | "emerald" | "amber";
  progress?: number;
}) {
  const toneClasses = {
    primary: "text-primary bg-primary/10 border-primary/20",
    sky: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };

  return (
    <div className="signal-inset p-5 rounded-2xl border border-border/80 flex flex-col justify-between shadow-sm hover:border-border transition-all">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={`grid size-7 place-items-center rounded-lg border ${toneClasses[tone]}`}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="mt-3">
        <p className="font-[Manrope] text-3xl font-black tracking-tight text-foreground">{value}</p>
        {progress !== undefined && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground truncate">{subtext}</p>
      </div>
    </div>
  );
}

function QuickCommandButton({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof BookOpen;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="signal-action group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-4 hover:border-primary/40 hover:bg-secondary/70 transition-all shadow-sm"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

export function SecretarySettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const subjects = trpc.subjects.list.useQuery();
  const activeSubjects = subjects.data?.filter(subject => subject.status === "active") ?? [];

  const [activeTab, setActiveTab] = useState("appearance");
  const tabs = [
    { id: "appearance", label: "Appearance & Theme", icon: Palette },
    { id: "account", label: "Secretary Account", icon: User },
    { id: "subjects", label: "Subject Desks", icon: BookOpen },
    { id: "ai", label: "AI Writing Assistant", icon: Sparkles },
  ];

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl space-y-7 pb-12">
        <WorkspacePageHeader
          eyebrow="Settings"
          title="Workspace Settings"
          description="Manage theme preferences, secretary profile, subject controls, and AI features."
        />

        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-64 shrink-0">
            <nav className="flex overflow-x-auto md:flex-col gap-1 pb-4 md:pb-0 hide-scrollbar">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {activeTab === "appearance" && (
              <div className="signal-panel p-6 sm:p-7 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Color Theme</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Select your preferred interface color mode for day or evening sessions.
                  </p>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {(["light", "dark", "system"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTheme?.(t)}
                        className={`overflow-hidden rounded-xl border-2 p-0 text-left transition-all ${
                          theme === t
                            ? "border-primary shadow-md shadow-primary/10"
                            : "border-border hover:border-border/80"
                        }`}
                      >
                        <div
                          className={`h-24 p-3 flex flex-col justify-between ${
                            t === "dark" ? "bg-[#151619]" : t === "light" ? "bg-[#f7f5f2]" : "bg-gradient-to-r from-[#f7f5f2] to-[#151619]"
                          }`}
                        >
                          <div className="flex gap-1">
                            <div className={`h-2.5 w-8 rounded ${t === "dark" ? "bg-zinc-700" : "bg-zinc-300"}`} />
                            <div className={`h-2.5 w-4 rounded ${t === "dark" ? "bg-[#c95000]" : "bg-[#c95000]"}`} />
                          </div>
                          <div className={`h-4 w-16 rounded ${t === "dark" ? "bg-zinc-800" : "bg-zinc-200"}`} />
                        </div>
                        <div className="p-3 bg-card flex items-center justify-between">
                          <span className="text-xs font-bold capitalize text-foreground">{t} mode</span>
                          {theme === t && <CheckCircle2 className="size-4 text-primary" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="signal-panel p-6 sm:p-7 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="grid size-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-lg shadow-primary/20">
                    {(user?.name?.[0] || "S").toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{user?.name || "Class Secretary"}</h3>
                    <p className="text-xs text-muted-foreground">{user?.email || "Secretary Workspace Account"}</p>
                    <Badge variant="outline" className="mt-2 rounded-md text-[10px] font-bold border-primary/40 text-primary">
                      Authenticated Secretary
                    </Badge>
                  </div>
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                  <div className="rounded-xl border border-border/80 bg-secondary/40 p-4">
                    <p className="text-xs font-bold text-foreground">Privacy & Security Boundary</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Only authenticated secretaries can access this desk, edit master rosters, run Zoom AI scans, or resolve student excuse proofs. Classmates have zero write access.
                    </p>
                  </div>

                  <Button onClick={logout} variant="outline" className="rounded-xl text-destructive hover:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out of Workspace
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "subjects" && (
              <section className="signal-panel overflow-hidden">
                <div className="border-b border-border px-6 py-5 flex items-center justify-between">
                  <div>
                    <p className="signal-kicker">Subject controls</p>
                    <h2 className="mt-1 text-lg font-bold text-foreground">Registered Classes</h2>
                  </div>
                  <Button asChild size="sm" className="rounded-xl bg-primary text-primary-foreground font-bold">
                    <Link href="/app/subjects/new">
                      <Plus className="mr-1.5 size-3.5" /> New Subject
                    </Link>
                  </Button>
                </div>

                <div className="divide-y divide-border">
                  {activeSubjects.map(subject => (
                    <Link
                      key={subject.id}
                      href={`/app/subjects/${subject.id}`}
                      className="signal-action group flex min-h-20 items-center justify-between gap-4 px-6 py-4 hover:bg-secondary/60 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {subject.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {subject.code} · {subject.professorName}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <RecordStatusBadge tone={subject.publishState === "published" ? "published" : "draft"}>
                          {subject.publishState}
                        </RecordStatusBadge>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                      </div>
                    </Link>
                  ))}

                  {subjects.isLoading && (
                    <p className="px-6 py-10 text-center text-xs text-muted-foreground">Loading Subject Desks…</p>
                  )}
                  {!subjects.isLoading && !activeSubjects.length && (
                    <div className="px-6 py-12 text-center">
                      <BookOpen className="mx-auto size-8 text-primary opacity-60" />
                      <h3 className="mt-3 font-bold text-base">No active subjects</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Create a class desk to get started.</p>
                      <Button asChild className="mt-4 rounded-xl bg-primary text-primary-foreground font-bold">
                        <Link href="/app/subjects/new">Add Subject</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "ai" && (
              <div className="signal-panel p-6 sm:p-7 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">AI Writing & Participant Matcher</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supersec uses Gemini models to assist with Zoom participant matching and text refinement.
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/60 p-4">
                      <div>
                        <p className="text-xs font-bold text-foreground">AI Writing Assistant</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Provides 1-click polishing for announcements and private notes.
                        </p>
                      </div>
                      <Badge className="rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        Active
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/60 p-4">
                      <div>
                        <p className="text-xs font-bold text-foreground">Zoom Smart Name Matcher</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Automatically strips section prefixes (e.g. `OLCA113N001`) and matches student rosters.
                        </p>
                      </div>
                      <Badge className="rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
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
        <div className="signal-panel w-full border-t-2 border-primary p-8 text-center rounded-2xl">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Icon className="size-6" />
          </span>
          <h1 className="signal-heading text-2xl font-bold">{content.title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">{content.body}</p>
          <Button asChild className="mt-6 rounded-xl bg-primary text-primary-foreground font-bold">
            <Link href="/app">Back to Dashboard</Link>
          </Button>
        </div>
      </section>
    </DashboardLayout>
  );
}

const pageInfo = {
  subjects: { icon: BookOpen, title: "Subjects", body: "Manage each class separately." },
  reports: { icon: ChartNoAxesCombined, title: "Reports", body: "Create and share class reports." },
  settings: { icon: Settings, title: "Settings", body: "Manage your class workspace." },
} as const;
