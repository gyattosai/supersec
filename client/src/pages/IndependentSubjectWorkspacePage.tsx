import DashboardLayout from "@/components/DashboardLayout";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { SubjectQuickActions } from "@/components/SubjectQuickActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  resolveLegacyContentWorkspacePath,
  subjectContentWorkspacePath,
  subjectContentWorkspaces,
  type SubjectContentWorkspaceKey,
} from "@/lib/contentWorkspaces";
import { attendanceWorkspacePath } from "@/lib/attendanceWorkspace";
import { formatTimeRange12Hour } from "@/lib/time";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  ChevronRight,
  Clipboard,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileDown,
  GraduationCap,
  Megaphone,
  Pencil,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, Redirect, useLocation, useRoute } from "wouter";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function LegacyContentRedirect() {
  const [, params] = useRoute("/app/content/:subjectId/:kind");
  const subjectId = params?.subjectId ?? "";
  return <Redirect to={resolveLegacyContentWorkspacePath(subjectId as any, params?.kind)} />;
}

export default function IndependentSubjectWorkspacePage(props?: { params?: { subjectId?: string } }) {
  const [, routeParams] = useRoute("/app/subjects/:subjectId");
  const [location] = useLocation();

  const pathSubjectId = location.startsWith("/app/subjects/")
    ? location.slice("/app/subjects/".length).split("/")[0]?.split("?")[0]
    : "";
  const rawSubjectId = props?.params?.subjectId || routeParams?.subjectId || pathSubjectId || "";
  const subjectId = rawSubjectId;
  const numSubjectId = Number(rawSubjectId);
  const isNumeric = !isNaN(numSubjectId) && numSubjectId > 0;
  const validSubject = Boolean(rawSubjectId && rawSubjectId !== "0" && rawSubjectId !== "NaN");
  const subjectQueryParam = isNumeric ? numSubjectId : rawSubjectId;

  const subject = trpc.subjects.get.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject, staleTime: 0, refetchOnMount: "always" });
  const students = trpc.subjects.students.list.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject, staleTime: 0, refetchOnMount: "always" });
  const sessions = trpc.subjects.sessions.list.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject, staleTime: 0, refetchOnMount: "always" });
  const announcements = trpc.content.announcements.list.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject, staleTime: 0, refetchOnMount: "always" });
  const resources = trpc.content.resources.list.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject, staleTime: 0, refetchOnMount: "always" });
  const questions = trpc.content.questions.list.useQuery({ subjectId: subjectQueryParam }, { enabled: validSubject, staleTime: 0, refetchOnMount: "always" });

  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"workflow" | "suites">("workflow");
  const utils = trpc.useUtils();

  const archive = trpc.subjects.archive.useMutation({
    onSuccess: () => {
      utils.subjects.get.invalidate({ subjectId: subjectQueryParam });
      utils.subjects.list.invalidate();
      toast.success("Subject archive status updated");
    },
    onError: error => toast.error(error.message),
  });

  const copyPublicLink = async () => {
    if (!subject.data?.publicId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${subject.data.publicId}`);
      setCopied(true);
      toast.success("Public student portal link copied for Messenger");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (!validSubject) {
    return <Redirect to="/app/subjects" />;
  }

  if (subject.isLoading) {
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-5xl">
          <div className="signal-inset mt-6 grid min-h-72 place-items-center text-xs text-muted-foreground">
            Loading Subject workspace…
          </div>
        </section>
      </DashboardLayout>
    );
  }

  if (subject.isError || !subject.data) {
    return (
      <DashboardLayout>
        <section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center">
          <div className="signal-panel w-full border-t-2 border-t-primary p-8 text-center rounded-2xl">
            <GraduationCap className="mx-auto size-8 text-muted-foreground mb-3" />
            <h1 className="text-xl font-bold text-foreground">Subject unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              This private class record may have been archived or is not available in the current workspace.
            </p>
            <Button asChild className="mt-6 rounded-xl bg-primary text-primary-foreground font-bold">
              <Link href="/app/subjects">Back to Subjects</Link>
            </Button>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  const isPublished = subject.data.publishState === "published";
  const studentCount = students.data?.length ?? 0;
  const sessionCount = sessions.data?.length ?? 0;
  const annoCount = announcements.data?.length ?? 0;
  const resCount = resources.data?.length ?? 0;
  const qaCount = questions.data?.length ?? 0;
  const totalContentCount = annoCount + resCount + qaCount;

  const scheduleText = subject.data.meetingDays.length
    ? subject.data.meetingDays
        .map(day => `${dayNames[day.weekday]}${formatTimeRange12Hour(day.startTime, day.endTime)}`)
        .join(" · ")
    : "No schedule configured";

  const workflowSteps = [
    {
      stepNumber: "01",
      tag: "SET UP",
      tagColor: "text-primary",
      title: "Class details",
      description: "Check the Subject code, professor, and term.",
      href: `/app/subjects/${subjectId}/details`,
      icon: Pencil,
      liveCount: subject.data.code,
    },
    {
      stepNumber: "02",
      tag: "SET UP",
      tagColor: "text-primary",
      title: "Students (Master List)",
      description: "Add students, notes, and schedule conflicts.",
      href: `/app/subjects/${subjectId}/students`,
      icon: Users,
      liveCount: `${studentCount} enrolled`,
    },
    {
      stepNumber: "03",
      tag: "RUN CLASS",
      tagColor: "text-amber-400",
      title: "Attendance",
      description: "Add class dates, mark No Class, and take Attendance.",
      href: `/app/subjects/${subjectId}/attendance`,
      icon: ClipboardCheck,
      liveCount: `${sessionCount} sessions`,
    },
    {
      stepNumber: "04",
      tag: "POST",
      tagColor: "text-sky-400",
      title: "Announcements",
      description: "Write, publish, and share class updates.",
      href: `/app/subjects/${subjectId}/announcements`,
      icon: Megaphone,
      liveCount: `${annoCount} updates`,
    },
    {
      stepNumber: "05",
      tag: "POST",
      tagColor: "text-sky-400",
      title: "Resources",
      description: "Keep class links, files, forms, and meeting links.",
      href: `/app/subjects/${subjectId}/resources`,
      icon: BookOpen,
      liveCount: `${resCount} resources`,
    },
    {
      stepNumber: "06",
      tag: "POST",
      tagColor: "text-sky-400",
      title: "Questions & Answers",
      description: "Save answers you can publish and share again.",
      href: `/app/subjects/${subjectId}/questions`,
      icon: GraduationCap,
      liveCount: `${qaCount} FAQs`,
    },
    {
      stepNumber: "07",
      tag: "SHARE",
      tagColor: "text-emerald-400",
      title: "Sharing",
      description: "Review public student portal, copy Messenger link, and share QR code.",
      href: `/app/subjects/${subjectId}/sharing`,
      icon: Clipboard,
      liveCount: isPublished ? "Published" : "Draft",
    },
  ];

  const suites = [
    {
      kicker: "Class Setup",
      title: "Roster & Schedule Foundation",
      description: "Manage enrolled students master list and repeating weekly class schedule.",
      items: [
        {
          label: "Master Student Roster",
          desc: `${studentCount} enrolled ${studentCount === 1 ? "student" : "students"}`,
          href: `/app/subjects/${subjectId}/students`,
          icon: Users,
          badge: `${studentCount} students`,
        },
        {
          label: "Class Sessions & Schedule",
          desc: `${sessionCount} scheduled ${sessionCount === 1 ? "date" : "dates"}`,
          href: `/app/subjects/${subjectId}/schedule`,
          icon: CalendarDays,
          badge: `${sessionCount} sessions`,
        },
        {
          label: "Class Details & Rhythm",
          desc: `${subject.data.professorName} · ${subject.data.code}`,
          href: `/app/subjects/${subjectId}/details`,
          icon: Pencil,
          badge: "Settings",
        },
      ],
    },
    {
      kicker: "Attendance Desk",
      title: "Live Attendance & Verifications",
      description: "Record attendance, reconcile Zoom AI screenshots, and resolve excuse letters.",
      items: [
        {
          label: "Live Attendance Workspace",
          desc: "Take attendance, launch Zoom AI matcher & log records",
          href: attendanceWorkspacePath(subjectId as any),
          icon: Zap,
          badge: "Action",
          highlight: true,
        },
        {
          label: "Reports & PDF Export",
          desc: "One-click compiled PDF & CSV attendance sheets",
          href: `/app/reports`,
          icon: FileDown,
          badge: "Export",
        },
      ],
    },
    {
      kicker: "Class Resources",
      title: "Updates, Links & Knowledgebase",
      description: "Publish announcements, drive links, syllabus resources, and answer Messenger FAQs.",
      items: [
        {
          label: "Announcements",
          desc: `${annoCount} class ${annoCount === 1 ? "update" : "updates"}`,
          href: `/app/subjects/${subjectId}/announcements`,
          icon: Megaphone,
          badge: `${annoCount}`,
        },
        {
          label: "Resources & Course Links",
          desc: `${resCount} shared ${resCount === 1 ? "resource" : "resources"}`,
          href: `/app/subjects/${subjectId}/resources`,
          icon: BookOpen,
          badge: `${resCount}`,
        },
        {
          label: "Questions & Answers",
          desc: `${qaCount} published ${qaCount === 1 ? "FAQ" : "FAQs"}`,
          href: `/app/subjects/${subjectId}/questions`,
          icon: GraduationCap,
          badge: `${qaCount}`,
        },
      ],
    },
    {
      kicker: "Student Distribution",
      title: "Public View-Only Portal",
      description: "Share the read-only student portal link and configure custom class branding.",
      items: [
        {
          label: "Sharing & Public Settings",
          desc: isPublished ? "Public portal is live & ready to share" : "Subject is currently private",
          href: `/app/subjects/${subjectId}/sharing`,
          icon: Clipboard,
          badge: isPublished ? "Live" : "Draft",
        },
      ],
    },
  ];

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl space-y-7 pb-14">
        {/* Navigation Breadcrumb */}
        <Link
          href="/app/subjects"
          className="signal-action inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        >
          <ArrowLeft className="size-3.5" /> Back to Subject desks
        </Link>

        {/* Hero Subject Header Banner */}
        <header className="signal-hero-banner p-6 sm:p-8 rounded-2xl space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="signal-kicker">Subject Mission Control</span>
                <span className="text-xs text-muted-foreground font-mono font-bold">{subject.data.code}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-[-0.04em] mt-1.5 truncate">
                {subject.data.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                <span className="font-bold text-foreground">{subject.data.code}</span> · Professor {subject.data.professorName}
                {subject.data.termName ? ` · ${subject.data.termName}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <RecordStatusBadge tone={isPublished ? "published" : "draft"}>
                {subject.data.publishState}
              </RecordStatusBadge>
            </div>
          </div>

          {/* Schedule Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/70">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3.5 text-primary" />
              <span className="font-semibold text-foreground">Schedule:</span>
              <span>{scheduleText}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() =>
                  archive.mutate({ subjectId: subjectQueryParam as any, archive: subject.data.status !== "archived" })
                }
                disabled={archive.isPending}
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Archive className="mr-1 size-3.5" />
                {subject.data.status === "archived" ? "Restore" : "Archive"}
              </Button>
            </div>
          </div>

          {/* Categorized Quick Actions Suite */}
          <SubjectQuickActions
            subjectId={subjectId}
            publicId={subject.data.publicId}
            publishState={subject.data.publishState}
          />
        </header>

        {/* Live Subject Metrics HUD */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href={`/app/subjects/${subjectId}/students`} className="signal-hud-card signal-action block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Master Roster</span>
              <Users className="size-4 text-sky-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="mt-2 font-[Manrope] text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {studentCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Enrolled students</p>
          </Link>

          <Link href={`/app/subjects/${subjectId}/schedule`} className="signal-hud-card signal-action block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Class Sessions</span>
              <CalendarDays className="size-4 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <p className="mt-2 font-[Manrope] text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {sessionCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Recorded dates</p>
          </Link>

          <Link href={`/app/subjects/${subjectId}/announcements`} className="signal-hud-card signal-action block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Class Content</span>
              <Megaphone className="size-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="mt-2 font-[Manrope] text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {totalContentCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Updates &amp; resources</p>
          </Link>

          <Link href={`/app/subjects/${subjectId}/sharing`} className="signal-hud-card signal-action block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Student Portal</span>
              <ShieldCheck className={`size-4 ${isPublished ? "text-emerald-400" : "text-amber-400"} group-hover:scale-110 transition-transform`} />
            </div>
            <p className="mt-2 font-[Manrope] text-xl sm:text-2xl font-black tracking-tight flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${isPublished ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className={isPublished ? "text-emerald-400" : "text-amber-400"}>
                {isPublished ? "Published" : "Draft"}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">View-only sharing</p>
          </Link>
        </div>

        {/* Quick Commands Bar */}
        <div className="signal-panel p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-primary" />
            <span className="text-xs sm:text-sm font-bold text-foreground">Quick Launch:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="rounded-xl bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/25">
              <Link href={attendanceWorkspacePath(subjectId as any)}>
                <Zap className="mr-1.5 size-3.5 text-amber-300" /> Take Live Attendance
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
              <Link href={`/app/subjects/${subjectId}/students`}>
                <Users className="mr-1.5 size-3.5 text-sky-400" /> Manage Roster
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
              <Link href={`/app/subjects/${subjectId}/announcements/new`}>
                <Megaphone className="mr-1.5 size-3.5 text-amber-400" /> New Announcement
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
              <Link href={`/app/subjects/${subjectId}/sharing`}>
                <QrCode className="mr-1.5 size-3.5 text-emerald-400" /> Sharing &amp; QR
              </Link>
            </Button>
          </div>
        </div>

        {/* Workflow & Suites Section */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="signal-kicker">Operations Suite</p>
              <h2 className="signal-heading text-xl font-bold mt-0.5">Subject Workflow &amp; Desks</h2>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1 border border-border">
              <button
                type="button"
                onClick={() => setViewMode("workflow")}
                className={`signal-action rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === "workflow"
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                7-Step Workflow
              </button>
              <button
                type="button"
                onClick={() => setViewMode("suites")}
                className={`signal-action rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === "suites"
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Category Suites
              </button>
            </div>
          </div>

          {viewMode === "workflow" ? (
            /* 7-Step Workflow Stack matching User Design */
            <div className="space-y-3 pt-1">
              {workflowSteps.map(step => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.stepNumber}
                    href={step.href}
                    className="signal-action group relative flex min-h-[5.5rem] items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5 hover:border-primary/50 hover:bg-card/90 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                      <span className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-xl bg-secondary/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-primary tracking-wider">
                            {step.stepNumber}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${step.tagColor}`}>
                            {step.tag}
                          </span>
                          {step.liveCount ? (
                            <span className="hidden sm:inline-flex rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {step.liveCount}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors mt-0.5 truncate">
                          {step.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate max-w-xl">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="grid size-9 sm:size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 group-hover:scale-105 group-hover:translate-x-0.5 transition-all">
                        <ArrowRight className="size-4 sm:size-4.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Category Suites Grid */
            <div className="grid gap-5 sm:grid-cols-2 pt-1">
              {suites.map(suite => (
                <section
                  key={suite.kicker}
                  className="signal-panel flex flex-col justify-between overflow-hidden rounded-2xl p-5 sm:p-6 space-y-4"
                >
                  <div className="space-y-1.5">
                    <span className="signal-kicker">{suite.kicker}</span>
                    <h3 className="text-base font-bold text-foreground">{suite.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{suite.description}</p>
                  </div>

                  <div className="space-y-2 border-t border-border/70 pt-3">
                    {suite.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className={`signal-action group flex min-h-12 items-center justify-between gap-3 rounded-xl border p-3 text-xs font-semibold transition-all ${
                            (item as any).highlight
                              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                              : "border-border/70 bg-secondary/30 text-foreground hover:border-primary/40 hover:bg-secondary/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="size-4 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{item.label}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </section>
    </DashboardLayout>
  );
}

