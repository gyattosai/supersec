import { Badge } from "@/components/ui/badge";
import { ViewOnlyHeader } from "@/components/ViewOnlyHeader";
import { formatTimeRange12Hour } from "@/lib/time";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/meta";
import { formatSocialTitle, formatSocialDescription } from "@shared/socialTitle";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarX,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  X,
  BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  isPushNotificationSupported,
  isSubjectSubscribedLocally,
  setSubjectSubscribedLocally,
  unsubscribeFromBrowserPush,
} from "@/lib/pushNotifications";
import { PushNotificationSubscribeButton } from "@/components/PushNotificationSubscribeButton";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRoute } from "wouter";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type ViewOnlySubject = { publicId: string; viewOnlyShortMark?: string | null; viewOnlyName?: string | null };

export type SortOption = "newest" | "oldest" | "title_asc" | "title_desc";
export type CategoryFilter = "all" | "announcements" | "resources" | "questions" | "attendance" | "students";

export interface UnifiedItem {
  id: string;
  kind: "announcements" | "resources" | "questions" | "attendance";
  title: string;
  date: Date;
  dateFormatted: string;
  snippet: string;
  badge: string;
  badgeTone: "amber" | "sky" | "purple" | "emerald";
  href: string;
  actionLabel: string;
  meta?: {
    category?: string;
    resourceType?: string;
    destinationUrl?: string;
    isOfficial?: boolean;
    tags?: string[];
    sessionState?: string;
  };
}

function cleanSnippet(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`~\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function PremiumPublicSubjectHome() {
  const [, params] = useRoute("/s/:publicId");
  const input = useMemo(() => ({ publicId: params?.publicId ?? "" }), [params?.publicId]);
  const query = trpc.foundation.publicSubject.useQuery(input, { enabled: Boolean(input.publicId) });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [viewMode, setViewMode] = useState<"categorized" | "feed">("feed");
  const [showPushOptInBanner, setShowPushOptInBanner] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const subjectData = query.data?.available ? query.data.subject : null;
  const socialTitle = subjectData
    ? formatSocialTitle({
        type: "Subject",
        contentTitle: subjectData.name,
        subjectCode: subjectData.code,
        numberOrDate: subjectData.code,
        version: 1,
      })
    : undefined;
  const socialDesc = subjectData
    ? formatSocialDescription({
        type: "subject",
        subjectCode: subjectData.code,
        subjectName: subjectData.name,
        professorName: subjectData.professorName,
      })
    : undefined;
  const dynamicOg = subjectData
    ? `/api/og?type=subject&title=${encodeURIComponent(socialTitle || subjectData.name)}&subjectCode=${encodeURIComponent(subjectData.code)}&professorName=${encodeURIComponent(subjectData.professorName)}&subtitle=${encodeURIComponent("Official Student Portal")}`
    : undefined;

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    keywords: subjectData ? [subjectData.code, subjectData.name, `Professor ${subjectData.professorName}`, "Class Portal", "Attendance", "Announcements"] : undefined,
    canonicalPath: params?.publicId ? `/s/${params.publicId}` : undefined,
    ogImage: dynamicOg,
    ogImageAlt: subjectData ? `${subjectData.name} Portal Cover` : undefined,
    ogType: "website",
    jsonLd: subjectData
      ? {
          "@context": "https://schema.org",
          "@type": "Course",
          name: subjectData.name,
          courseCode: subjectData.code,
          description: `Official class portal for ${subjectData.name}`,
          provider: {
            "@type": "Organization",
            name: "supersec",
          },
          instructor: {
            "@type": "Person",
            name: subjectData.professorName,
          },
        }
      : undefined,
  });

  const { subject, allUnifiedItems, latestAttendance } = useMemo(() => {
    if (!subjectData) return { subject: null, allUnifiedItems: [], latestAttendance: null };
    const { latest, ...sub } = subjectData;

    const announcements: UnifiedItem[] = (latest.announcements || []).map((a: any) => {
      const d = a.publishedAt ? new Date(a.publishedAt) : new Date();
      return {
        id: `announcement-${a.publicId}`,
        kind: "announcements",
        title: a.title,
        date: d,
        dateFormatted: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        snippet: cleanSnippet(a.body),
        badge: "Announcement",
        badgeTone: "amber",
        href: `/a/${a.publicId}`,
        actionLabel: "Read Announcement",
      };
    });

    const resources: UnifiedItem[] = (latest.resources || []).map((r: any) => {
      const d = r.publishedAt ? new Date(r.publishedAt) : new Date();
      return {
        id: `resource-${r.publicId}`,
        kind: "resources",
        title: r.title,
        date: d,
        dateFormatted: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        snippet: cleanSnippet(r.description),
        badge: r.category || r.resourceType || "Material",
        badgeTone: "sky",
        href: `/r/${r.publicId}`,
        actionLabel: "View Material",
        meta: {
          category: r.category,
          resourceType: r.resourceType,
          destinationUrl: r.destinationUrl,
        },
      };
    });

    const questions: UnifiedItem[] = (latest.questions || []).map((q: any) => {
      const d = q.publishedAt ? new Date(q.publishedAt) : new Date();
      return {
        id: `question-${q.publicId}`,
        kind: "questions",
        title: q.title || q.question || "Q&A Question",
        date: d,
        dateFormatted: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        snippet: cleanSnippet(q.answer),
        badge: q.isOfficial ? "Official Answer" : "Q&A Discussion",
        badgeTone: "purple",
        href: `/q/${q.publicId}`,
        actionLabel: "View Answer",
        meta: {
          isOfficial: q.isOfficial,
          tags: q.tagsText ? q.tagsText.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        },
      };
    });

    const attendance: UnifiedItem[] = (latest.attendance || []).map((att: any) => {
      const d = new Date(att.startsAt);
      const isCompleted = att.sessionState === "completed";
      const isNoClass = att.sessionState === "no_class";
      return {
        id: `attendance-${att.publicId}`,
        kind: "attendance",
        title: isNoClass
          ? `No Class · ${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
          : `Session on ${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`,
        date: d,
        dateFormatted: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        snippet: isNoClass
          ? (att.noClassReason ? `Suspension Notice: ${att.noClassReason}` : "Class suspended / No classes scheduled for this date.")
          : "Official class attendance roll and submission history.",
        badge: isNoClass ? "No Class" : isCompleted ? "Session Completed" : "Attendance Open",
        badgeTone: isNoClass ? "amber" : "emerald",
        href: `/attendance/${att.publicId}`,
        actionLabel: isNoClass ? "View Notice" : "View Roll",
        meta: {
          sessionState: att.sessionState,
        },
      };
    });

    const items = [...announcements, ...resources, ...questions, ...attendance];
    const latestAtt = latest.attendance?.[0] || null;

    return { subject: sub, allUnifiedItems: items, latestAttendance: latestAtt };
  }, [subjectData]);

  const filteredAndSortedItems = useMemo(() => {
    return filterAndSortItems(allUnifiedItems, { searchQuery, activeCategory, sortBy });
  }, [allUnifiedItems, activeCategory, searchQuery, sortBy]);

  const students = useMemo(() => subjectData?.students || [], [subjectData?.students]);
  const conflictCount = useMemo(() => students.filter(s => s.hasScheduleConflict).length, [students]);
  const regularCount = students.length - conflictCount;

  const counts = useMemo(() => ({
    announcements: allUnifiedItems.filter(i => i.kind === "announcements").length,
    resources: allUnifiedItems.filter(i => i.kind === "resources").length,
    questions: allUnifiedItems.filter(i => i.kind === "questions").length,
    attendance: allUnifiedItems.filter(i => i.kind === "attendance").length,
    students: students.length,
    all: allUnifiedItems.length,
  }), [allUnifiedItems, students.length]);

  const categories = useMemo((): Array<{ id: CategoryFilter; label: string; count: number; icon: typeof BellRing }> => [
    { id: "all", label: "All Items", count: counts.all, icon: LayoutGrid },
    { id: "announcements", label: "Announcements", count: counts.announcements, icon: BellRing },
    { id: "resources", label: "Resources", count: counts.resources, icon: BookOpen },
    { id: "questions", label: "Q&A Knowledgebase", count: counts.questions, icon: HelpCircle },
    { id: "attendance", label: "Attendance", count: counts.attendance, icon: CalendarCheck },
    { id: "students", label: "Student Master List", count: counts.students, icon: Users },
  ], [counts]);

  useEffect(() => {
    if (!subject?.publicId) return;
    const isSub = isSubjectSubscribedLocally(subject.publicId);
    setIsPushSubscribed(isSub);
    const dismissed = localStorage.getItem(`push_optin_dismissed_${subject.publicId}`);
    if (!isSub && !dismissed && isPushNotificationSupported()) {
      setShowPushOptInBanner(true);
    }
  }, [subject?.publicId]);

  if (query.isLoading)
    return (
      <PublicFrame>
        <div className="signal-inset p-8 text-center text-xs sm:text-sm text-muted-foreground animate-pulse rounded-2xl">
          Loading Subject portal…
        </div>
      </PublicFrame>
    );

  if (!query.data?.available || !subjectData || !subject)
    return (
      <PublicFrame>
        <div className="signal-panel border-t-2 border-t-primary p-8 text-center rounded-2xl space-y-4">
          <CircleAlert className="mx-auto size-8 text-primary" />
          <h1 className="signal-heading text-xl font-bold">Subject Unavailable</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            This student portal link is not currently published or has been moved by the class secretary.
          </p>
        </div>
      </PublicFrame>
    );

  const schedule = subject.meetingDays.length
    ? subject.meetingDays.map(day => `${dayNames[day.weekday]}${formatTimeRange12Hour(day.startTime, day.endTime)}`).join(" · ")
    : "Schedule to be announced";

  const isSearchActive = Boolean(searchQuery.trim());
  const showBentoCategorized = activeCategory === "all" && !isSearchActive && viewMode === "categorized";

  const dismissPushOptIn = () => {
    if (subject?.publicId) {
      localStorage.setItem(`push_optin_dismissed_${subject.publicId}`, "true");
    }
    setShowPushOptInBanner(false);
  };

  const handleOneClickOptOut = async () => {
    if (!subject?.publicId) return;
    try {
      await unsubscribeFromBrowserPush();
      setSubjectSubscribedLocally(subject.publicId, false);
      setIsPushSubscribed(false);
      toast.success("Unsubscribed from Notifications", {
        description: `You will no longer receive push alerts for ${subject.code}.`,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to unsubscribe.");
    }
  };

  return <PublicFrame subject={subject}>
      {/* Hero Subject Header */}
      <article className="signal-hero-banner p-6 sm:p-8 rounded-2xl space-y-5 border border-border/70 shadow-lg shadow-black/10 bg-gradient-to-b from-card via-card/95 to-secondary/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-primary px-3 py-0.5 text-xs font-extrabold text-primary-foreground shadow-sm">
                {subject.code}
              </Badge>
              <span className="signal-status-pill bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <span className="relative flex size-2 shrink-0 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
                </span>
                Official Student Portal
              </span>
            </div>
            <h1 className="signal-title mt-2.5 text-2xl sm:text-3xl md:text-4xl font-black tracking-[-0.04em] text-foreground">
              {subject.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <span>Professor {subject.professorName}</span>
            </p>
          </div>

          {/* Quick Actions: Push Alerts & 1-Click Opt-Out */}
          <div className="shrink-0 flex items-center flex-wrap gap-2">
            <PushNotificationSubscribeButton
              subjectPublicId={subject.publicId}
              subjectName={subject.name}
              subjectCode={subject.code}
              variant="pill"
            />
            {isPushSubscribed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOneClickOptOut}
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 rounded-xl"
                title="Turn off notifications for this class"
              >
                <BellOff className="size-3.5" />
                <span>Opt-Out</span>
              </Button>
            )}
          </div>
        </div>

        {/* Push Notification Opt-In Banner for un-opted users */}
        {showPushOptInBanner && !isPushSubscribed && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-card p-4 sm:p-5 shadow-lg shadow-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                  <BellRing className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/50 bg-primary/20 text-primary text-[10px] font-extrabold uppercase tracking-wider">
                      Instant Alerts
                    </Badge>
                    <span className="text-xs font-bold text-foreground">Stay up to date</span>
                  </div>
                  <h4 className="mt-1 text-sm sm:text-base font-extrabold text-foreground">
                    Get instant notifications for {subject.code}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    Receive immediate browser alerts for class cancellations, new lecture resources, and priority announcements.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <PushNotificationSubscribeButton
                  subjectPublicId={subject.publicId}
                  subjectName={subject.name}
                  subjectCode={subject.code}
                  variant="button"
                  className="shadow-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={dismissPushOptIn}
                  className="size-9 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss notification prompt"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Active No Class Suspension Notice */}
        {subject.noClass && (
          <section className="signal-inset flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
                <CalendarX className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-amber-500/50 bg-amber-500/20 text-[10px] font-extrabold text-amber-300">
                    NO CLASSES
                  </Badge>
                  <span className="text-[11px] font-bold text-amber-400 truncate">
                    {new Date(subject.noClass.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-bold text-foreground truncate">
                  {subject.noClass.reason || "Class suspended / No classes scheduled"}
                </p>
              </div>
            </div>
            {(latestAttendance as any)?.sessionState === "no_class" && (
              <Link
                href={`/attendance/${latestAttendance.publicId}`}
                className="shrink-0 text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-1"
              >
                View Notice
                <ChevronRight className="size-3.5" />
              </Link>
            )}
          </section>
        )}

        {/* Schedule Ribbon */}
        <section className="signal-inset flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border border-border/80 bg-secondary/40">
          <Clock className="size-4 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Class Meeting Rhythm
            </p>
            <p className="mt-0.5 text-xs sm:text-sm font-semibold leading-relaxed text-foreground truncate">
              {schedule}
            </p>
          </div>
        </section>

        {/* Quick summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 pt-1">
          <button
            type="button"
            onClick={() => setActiveCategory("announcements")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeCategory === "announcements"
                ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                : "border-border/60 bg-secondary/20 hover:border-amber-500/30 hover:bg-secondary/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Announcements</span>
              <BellRing className="size-3.5 text-amber-400" />
            </div>
            <div className="mt-1 text-lg sm:text-xl font-black text-foreground">{counts.announcements}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("resources")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeCategory === "resources"
                ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30"
                : "border-border/60 bg-secondary/20 hover:border-sky-500/30 hover:bg-secondary/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Resources</span>
              <BookOpen className="size-3.5 text-sky-400" />
            </div>
            <div className="mt-1 text-lg sm:text-xl font-black text-foreground">{counts.resources}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("questions")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeCategory === "questions"
                ? "border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-500/30"
                : "border-border/60 bg-secondary/20 hover:border-purple-500/30 hover:bg-secondary/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Q&amp;As</span>
              <HelpCircle className="size-3.5 text-purple-400" />
            </div>
            <div className="mt-1 text-lg sm:text-xl font-black text-foreground">{counts.questions}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("attendance")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeCategory === "attendance"
                ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                : "border-border/60 bg-secondary/20 hover:border-emerald-500/30 hover:bg-secondary/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Sessions</span>
              <CalendarCheck className="size-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 text-lg sm:text-xl font-black text-foreground">{counts.attendance}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("students")}
            className={`col-span-2 sm:col-span-1 p-3 rounded-xl border text-left transition-all ${
              activeCategory === "students"
                ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                : "border-border/60 bg-secondary/20 hover:border-indigo-500/30 hover:bg-secondary/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Master List</span>
              <Users className="size-3.5 text-indigo-400" />
            </div>
            <div className="mt-1 text-lg sm:text-xl font-black text-foreground">
              {counts.students}
              {conflictCount > 0 && (
                <span className="ml-1 text-[11px] font-semibold text-amber-400">
                  ({conflictCount} conflict{conflictCount === 1 ? "" : "s"})
                </span>
              )}
            </div>
          </button>
        </div>
      </article>

      {/* Interactive Search, Sorting & Filter Control Toolbar */}
      <section className="mt-7 space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search announcements, files, Q&amp;As, or attendance..."
              className="w-full h-11 pl-10 pr-14 rounded-xl border border-border/80 bg-card/90 backdrop-blur-sm text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-mono text-muted-foreground/80 bg-secondary/60 border border-border/60 rounded-md pointer-events-none">
                /
              </kbd>
            )}
          </div>

          {/* Sort Selector & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <label htmlFor="subject-sort" className="sr-only">Sort by</label>
              <div className="flex items-center gap-1.5 h-11 px-3 rounded-xl border border-border/80 bg-card/90 backdrop-blur-sm shadow-sm text-xs font-semibold text-foreground">
                <ArrowUpDown className="size-3.5 text-primary shrink-0" />
                <select
                  id="subject-sort"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
                >
                  <option value="newest" className="bg-popover text-popover-foreground">Newest First</option>
                  <option value="oldest" className="bg-popover text-popover-foreground">Oldest First</option>
                  <option value="title_asc" className="bg-popover text-popover-foreground">Title (A → Z)</option>
                  <option value="title_desc" className="bg-popover text-popover-foreground">Title (Z → A)</option>
                </select>
              </div>
            </div>

            {/* View Mode Toggle when browsing all items without active search */}
            {activeCategory === "all" && !isSearchActive && (
              <div className="flex items-center rounded-xl border border-border/80 bg-card/90 p-1 h-11 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("categorized")}
                  className={`flex items-center gap-1 px-2.5 h-full rounded-lg text-xs font-bold transition-all ${
                    viewMode === "categorized"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grouped sections"
                >
                  <LayoutGrid className="size-3.5" />
                  <span className="hidden sm:inline">Sections</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("feed")}
                  className={`flex items-center gap-1 px-2.5 h-full rounded-lg text-xs font-bold transition-all ${
                    viewMode === "feed"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Unified list"
                >
                  <List className="size-3.5" />
                  <span className="hidden sm:inline">Feed</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {categories.map(cat => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-[1.02]"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? "bg-black/25 text-white" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mt-6">
        {/* Top Priority Announcement Banner (Visible on 'all' without active search) */}
        {activeCategory === "all" && !isSearchActive && allUnifiedItems.find(i => i.kind === "announcements") && (
          <div className="signal-card-shell mb-6">
            {(() => {
              const topAnno = allUnifiedItems.find(i => i.kind === "announcements")!;
              return (
                <article className="p-5 sm:p-6 rounded-2xl border-2 border-amber-500/80 bg-amber-950 text-amber-50 shadow-xl">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-300">
                    <span className="inline-flex items-center gap-1.5 uppercase tracking-wider text-[10px] sm:text-[11px] font-black bg-amber-500/25 px-2.5 py-1 rounded-full border border-amber-400/30 text-amber-200">
                      <BellRing className="size-3.5 text-amber-300" /> Priority Announcement
                    </span>
                    <span className="text-amber-200/80 font-medium">{topAnno.dateFormatted}</span>
                  </div>
                  <h3 className="mt-2.5 text-base sm:text-lg font-extrabold text-white">
                    {topAnno.title}
                  </h3>
                  <div className="mt-3.5 flex justify-end">
                    <Link
                      href={topAnno.href}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-amber-200 hover:text-white bg-amber-900/80 hover:bg-amber-800 px-3.5 py-1.5 rounded-xl border border-amber-400/40 transition-colors shadow-sm"
                    >
                      Read full announcement <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })()}
          </div>
        )}

        {activeCategory === "students" ? (
          <StudentMasterListSection
            students={students}
            initialSearch={searchQuery}
          />
        ) : showBentoCategorized ? (
          /* State 1: Categorized Bento Section View (when explicitly toggled to sections) */
          <div className="space-y-6">
            {/* Categorized Bento Grid */}
            <div className="grid gap-5 grid-cols-1">
              {/* Announcements Section */}
              <CategoryBentoCard
                variant="announcements"
                title="Announcements"
                count={counts.announcements}
                items={sortItems(allUnifiedItems.filter(i => i.kind === "announcements"), sortBy)}
                empty="No announcements published yet."
                onViewAll={() => setActiveCategory("announcements")}
              />

              {/* Resources Section */}
              <CategoryBentoCard
                variant="resources"
                title="Resources"
                count={counts.resources}
                items={sortItems(allUnifiedItems.filter(i => i.kind === "resources"), sortBy)}
                empty="No course resources or files shared yet."
                onViewAll={() => setActiveCategory("resources")}
              />

              {/* Q&A Section */}
              <CategoryBentoCard
                variant="questions"
                title="Q&amp;A Knowledgebase"
                count={counts.questions}
                items={sortItems(allUnifiedItems.filter(i => i.kind === "questions"), sortBy)}
                empty="No Q&amp;As published yet."
                onViewAll={() => setActiveCategory("questions")}
                allHref={`/s/${subject.publicId}/questions`}
              />

              {/* Attendance Section */}
              <CategoryBentoCard
                variant="attendance"
                title="Attendance Roll"
                count={counts.attendance}
                items={sortItems(allUnifiedItems.filter(i => i.kind === "attendance"), sortBy)}
                empty="No attendance records published yet."
                onViewAll={() => setActiveCategory("attendance")}
              />

              {/* Student Master List Section */}
              <StudentMasterListBentoCard
                students={students}
                onViewAll={() => setActiveCategory("students")}
              />
            </div>

            {/* Instant Push Notifications Card */}
            <div className="mt-6">
              <PushNotificationSubscribeButton
                subjectPublicId={subject.publicId}
                subjectName={subject.name}
                subjectCode={subject.code}
                variant="card"
              />
            </div>
          </div>
        ) : filteredAndSortedItems.length === 0 && (isSearchActive || activeCategory !== "all") ? (
          /* State 2: Filtered / Search Empty State */
          <div className="signal-panel border border-dashed border-border/80 p-8 sm:p-12 text-center rounded-2xl space-y-3 bg-secondary/10">
            <Search className="mx-auto size-8 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground">No matches found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              We couldn't find anything matching{" "}
              {searchQuery ? <span className="font-semibold text-foreground">"{searchQuery}"</span> : "your filter criteria"}
              {activeCategory !== "all" ? " in this category" : ""}.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-sm"
                >
                  Clear Search
                </button>
              )}
              {activeCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 transition-all"
                >
                  View All Categories
                </button>
              )}
            </div>
          </div>
        ) : (
          /* State 3: Interactive Feed / Search Results List */
          <div className="space-y-6">
            {filteredAndSortedItems.length === 0 ? (
              <div className="signal-panel border border-dashed border-border/80 p-8 sm:p-12 text-center rounded-2xl space-y-2 bg-secondary/10">
                <BellRing className="mx-auto size-8 text-muted-foreground/60" />
                <h3 className="text-base font-bold text-foreground">No posts or updates yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  Check back soon for class announcements, files, and attendance sessions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {isSearchActive ? `Matches (${filteredAndSortedItems.length})` : `${activeCategory.toUpperCase()} (${filteredAndSortedItems.length})`}
                  </p>
                  {isSearchActive && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Reset search
                    </button>
                  )}
                </div>

                <div className="grid gap-3 grid-cols-1">
                  {filteredAndSortedItems.map(item => (
                    <FeedItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* In feed view without active search when viewing all items, show Student Master List summary & Push Notification Subscribe Card */}
            {activeCategory === "all" && !isSearchActive && (
              <div className="space-y-6 pt-2">
                {students && students.length > 0 && (
                  <StudentMasterListBentoCard
                    students={students}
                    onViewAll={() => setActiveCategory("students")}
                  />
                )}
                <PushNotificationSubscribeButton
                  subjectPublicId={subject.publicId}
                  subjectName={subject.name}
                  subjectCode={subject.code}
                  variant="card"
                />
              </div>
            )}
          </div>
        )}
      </section>
    </PublicFrame>;
}

export function sortItems(items: UnifiedItem[], sortBy: SortOption): UnifiedItem[] {
  return [...items].sort((a, b) => {
    if (sortBy === "newest") return b.date.getTime() - a.date.getTime();
    if (sortBy === "oldest") return a.date.getTime() - b.date.getTime();
    if (sortBy === "title_asc") return a.title.localeCompare(b.title);
    if (sortBy === "title_desc") return b.title.localeCompare(a.title);
    return 0;
  });
}

export function filterAndSortItems(
  items: UnifiedItem[],
  options: {
    activeCategory?: CategoryFilter;
    searchQuery?: string;
    sortBy?: SortOption;
  } = {}
): UnifiedItem[] {
  const { activeCategory = "all", searchQuery = "", sortBy = "newest" } = options;
  const q = searchQuery.trim().toLowerCase();
  let result = items;

  // Filter by Category
  if (activeCategory !== "all") {
    result = result.filter(item => item.kind === activeCategory);
  }

  // Filter by Search Query across title, snippet, badge, date, category, resourceType, and tags
  if (q) {
    result = result.filter(item => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.snippet.toLowerCase().includes(q)) return true;
      if (item.badge.toLowerCase().includes(q)) return true;
      if (item.dateFormatted.toLowerCase().includes(q)) return true;
      if (item.meta?.category?.toLowerCase().includes(q)) return true;
      if (item.meta?.resourceType?.toLowerCase().includes(q)) return true;
      if (item.meta?.tags?.some(t => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  return sortItems(result, sortBy);
}

const sectionThemes = {
  attendance: {
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    glow: "shadow-lg shadow-emerald-950/20 bg-gradient-to-br from-emerald-950/25 via-card/95 to-card",
    eyebrowText: "text-emerald-400 font-extrabold",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    accentDot: "bg-emerald-400",
    hoverBg: "hover:bg-emerald-950/20",
    hoverText: "group-hover:text-emerald-300",
    chevronColor: "group-hover:text-emerald-400",
    browseText: "text-emerald-400 hover:text-emerald-300",
  },
  announcements: {
    border: "border-amber-500/30 hover:border-amber-500/60",
    glow: "shadow-lg shadow-amber-950/20 bg-gradient-to-br from-amber-950/25 via-card/95 to-card",
    eyebrowText: "text-amber-400 font-extrabold",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    accentDot: "bg-amber-400",
    hoverBg: "hover:bg-amber-950/20",
    hoverText: "group-hover:text-amber-300",
    chevronColor: "group-hover:text-amber-400",
    browseText: "text-amber-400 hover:text-amber-300",
  },
  resources: {
    border: "border-sky-500/30 hover:border-sky-500/60",
    glow: "shadow-lg shadow-sky-950/20 bg-gradient-to-br from-sky-950/25 via-card/95 to-card",
    eyebrowText: "text-sky-400 font-extrabold",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    accentDot: "bg-sky-400",
    hoverBg: "hover:bg-sky-950/20",
    hoverText: "group-hover:text-sky-300",
    chevronColor: "group-hover:text-sky-400",
    browseText: "text-sky-400 hover:text-sky-300",
  },
  questions: {
    border: "border-purple-500/30 hover:border-purple-500/60",
    glow: "shadow-lg shadow-purple-950/20 bg-gradient-to-br from-purple-950/25 via-card/95 to-card",
    eyebrowText: "text-purple-400 font-extrabold",
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    accentDot: "bg-purple-400",
    hoverBg: "hover:bg-purple-950/20",
    hoverText: "group-hover:text-purple-300",
    chevronColor: "group-hover:text-purple-400",
    browseText: "text-purple-400 hover:text-purple-300",
  },
  students: {
    border: "border-indigo-500/30 hover:border-indigo-500/60",
    glow: "shadow-lg shadow-indigo-950/20 bg-gradient-to-br from-indigo-950/25 via-card/95 to-card",
    eyebrowText: "text-indigo-400 font-extrabold",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    accentDot: "bg-indigo-400",
    hoverBg: "hover:bg-indigo-950/20",
    hoverText: "group-hover:text-indigo-300",
    chevronColor: "group-hover:text-indigo-400",
    browseText: "text-indigo-400 hover:text-indigo-300",
  },
};

function CategoryBentoCard({
  variant,
  title,
  count,
  items,
  empty,
  onViewAll,
  allHref,
}: {
  variant: keyof typeof sectionThemes;
  title: string;
  count: number;
  items: UnifiedItem[];
  empty: string;
  onViewAll: () => void;
  allHref?: string;
}) {
  const theme = sectionThemes[variant];
  return (
    <div className="signal-card-shell">
      <section className={`signal-record-card overflow-hidden rounded-2xl border ${theme.border} ${theme.glow} shadow-md transition-all flex flex-col justify-between h-full backdrop-blur-sm`}>
        <div>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
            <div className="min-w-0 flex items-center gap-2.5">
              <span className={`size-2 shrink-0 rounded-full ${theme.accentDot} shadow-sm animate-pulse`} />
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{title}</h3>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${theme.badge}`}>
              {count}
            </span>
          </div>

          {items.length ? (
            <div className="divide-y divide-border/40">
              {items.slice(0, 4).map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`signal-action group flex min-h-13 items-center justify-between gap-3 px-5 py-3 ${theme.hoverBg} active:bg-secondary transition-all`}
                >
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs sm:text-sm font-semibold text-foreground ${theme.hoverText} transition-colors truncate block`}>
                      {item.title}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                      {item.dateFormatted}
                    </span>
                    <ChevronRight className={`size-4 text-muted-foreground ${theme.chevronColor} group-hover:translate-x-0.5 transition-all`} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 pb-5 pt-3">
              <div className="signal-inset px-4 py-3 text-xs text-muted-foreground rounded-xl">{empty}</div>
            </div>
          )}
        </div>

        {items.length > 4 || allHref ? (
          <div className="border-t border-border/60 px-5 py-2.5 bg-secondary/15 flex justify-end items-center gap-3">
            {allHref ? (
              <Link
                href={allHref}
                className={`signal-action inline-flex min-h-8 items-center gap-1.5 text-xs font-extrabold ${theme.browseText} hover:underline`}
              >
                Search &amp; browse all <ArrowRight className="size-3" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onViewAll}
                className={`signal-action inline-flex min-h-8 items-center gap-1.5 text-xs font-extrabold ${theme.browseText} hover:underline cursor-pointer`}
              >
                View all {count} updates <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function FeedItemCard({ item }: { item: UnifiedItem }) {
  const theme = sectionThemes[item.kind] || sectionThemes.announcements;

  return (
    <article className={`p-4 sm:p-5 rounded-2xl border ${theme.border} bg-card/85 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${theme.badge}`}>
              {item.badge}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {item.dateFormatted}
            </span>
            {item.meta?.isOfficial && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                <CheckCircle2 className="size-3" /> Official
              </span>
            )}
          </div>

          <h3 className="mt-2 text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
            <Link href={item.href} className="hover:underline">
              {item.title}
            </Link>
          </h3>

          {item.meta?.tags && item.meta.tags.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {item.meta.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md">
                  <Tag className="size-2.5 opacity-70" /> {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 pt-1 flex flex-col sm:flex-row items-end sm:items-center gap-2">
          {item.kind === "attendance" && (
            <Link
              href={`${item.href}/proof`}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
            >
              <Camera className="size-3" /> Submit Proof
            </Link>
          )}
          <Link
            href={item.href}
            className={`inline-flex items-center gap-1 text-xs font-bold ${theme.browseText} hover:underline`}
          >
            <span>{item.actionLabel}</span>
            <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PublicFrame({ children, subject }: { children: React.ReactNode; subject?: ViewOnlySubject }) {
  return (
    <main className="signal-canvas min-h-screen px-3.5 sm:px-6 md:px-8 py-3.5 sm:py-6 md:py-8 text-foreground">
      <div className="mx-auto max-w-5xl">
        <ViewOnlyHeader subject={subject} />
        <div className="pb-12">{children}</div>
      </div>
    </main>
  );
}

function StudentMasterListBentoCard({
  students,
  onViewAll,
}: {
  students: Array<{ canonicalName: string; hasScheduleConflict: boolean }>;
  onViewAll: () => void;
}) {
  const theme = sectionThemes.students;
  const conflictCount = students.filter(s => s.hasScheduleConflict).length;
  const regularCount = students.length - conflictCount;

  return (
    <div className="signal-card-shell">
      <section className={`signal-record-card overflow-hidden rounded-2xl border ${theme.border} ${theme.glow} shadow-md transition-all flex flex-col justify-between h-full backdrop-blur-sm`}>
        <div>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
            <div className="min-w-0 flex items-center gap-2.5">
              <span className={`size-2 shrink-0 rounded-full ${theme.accentDot} shadow-sm animate-pulse`} />
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">Student Master List</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${theme.badge}`}>
                {students.length} Enrolled
              </span>
              {conflictCount > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold border border-amber-500/40 bg-amber-500/15 text-amber-300">
                  {conflictCount} Conflict{conflictCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

          {/* Quick preview list */}
          {students.length ? (
            <div className="divide-y divide-border/40">
              {students.slice(0, 4).map((student, idx) => (
                <div
                  key={`${student.canonicalName}-${idx}`}
                  className={`flex min-h-12 items-center justify-between gap-3 px-5 py-2.5 ${theme.hoverBg} transition-all`}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {student.canonicalName}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      student.hasScheduleConflict
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {student.hasScheduleConflict ? "⚠️ Schedule Conflict" : "✓ Regular"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 pb-5 pt-3">
              <div className="signal-inset px-4 py-3 text-xs text-muted-foreground rounded-xl">
                No students enrolled on the active master list yet.
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 px-5 py-2.5 bg-secondary/15 flex justify-between items-center gap-3">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {regularCount} regular · {conflictCount} with conflict
          </span>
          <button
            type="button"
            onClick={onViewAll}
            className={`signal-action inline-flex min-h-8 items-center gap-1.5 text-xs font-extrabold ${theme.browseText} hover:underline cursor-pointer ml-auto`}
          >
            Check your name &amp; view all {students.length} <ArrowRight className="size-3" />
          </button>
        </div>
      </section>
    </div>
  );
}

function StudentMasterListSection({
  students,
  initialSearch = "",
}: {
  students: Array<{ canonicalName: string; hasScheduleConflict: boolean }>;
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<"all" | "regular" | "conflict">("all");

  const conflictCount = useMemo(() => students.filter(s => s.hasScheduleConflict).length, [students]);
  const regularCount = students.length - conflictCount;

  const filtered = useMemo(() => {
    let list = students;
    if (statusFilter === "regular") list = list.filter(s => !s.hasScheduleConflict);
    if (statusFilter === "conflict") list = list.filter(s => s.hasScheduleConflict);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.canonicalName.toLowerCase().includes(q));
    }
    return list;
  }, [students, statusFilter, search]);

  const searchVerification = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const matches = students.filter(s => s.canonicalName.toLowerCase().includes(q));
    return {
      query: search.trim(),
      found: matches.length > 0,
      count: matches.length,
      firstMatch: matches[0] || null,
      exactMatch: matches.find(s => s.canonicalName.toLowerCase() === q) || (matches.length === 1 ? matches[0] : null),
    };
  }, [students, search]);

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <section className="p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/25 via-card/95 to-card shadow-lg shadow-indigo-950/20 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Users className="size-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">Official Student Master List</h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
              Check if your name is on the enrolled master list and verify your schedule conflict status for this subject.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs font-bold text-foreground">
              {students.length} Total Enrolled
            </span>
          </div>
        </div>

        {/* Live Search / Name Checker Tool */}
        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Check your name (e.g. Dela Cruz, Juan)..."
              className="w-full h-11 pl-10 pr-12 rounded-xl border border-border/80 bg-background/80 backdrop-blur-sm text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Clear name search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Verification Status Banner */}
          {searchVerification && (
            <div
              className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm transition-all animate-in fade-in-50 duration-200 ${
                searchVerification.found
                  ? searchVerification.exactMatch?.hasScheduleConflict
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                  : "bg-destructive/10 border-destructive/40 text-destructive"
              }`}
            >
              <div className="flex items-start gap-3">
                {searchVerification.found ? (
                  searchVerification.exactMatch?.hasScheduleConflict ? (
                    <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                  )
                ) : (
                  <CircleAlert className="size-5 shrink-0 text-destructive mt-0.5" />
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  {searchVerification.found ? (
                    searchVerification.exactMatch ? (
                      <>
                        <div className="font-extrabold text-foreground text-sm sm:text-base">
                          Found on Master List: {searchVerification.exactMatch.canonicalName}
                        </div>
                        <p className="text-xs leading-relaxed">
                          {searchVerification.exactMatch.hasScheduleConflict ? (
                            <span className="text-amber-400 font-semibold">
                              ⚠️ Status: With Schedule Conflict. You are flagged as having a conflict with another class schedule.
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">
                              ✓ Status: Regular / Clear. No schedule conflicts recorded for this class.
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="font-extrabold text-foreground text-sm">
                          Found {searchVerification.count} matching student{searchVerification.count === 1 ? "" : "s"}
                        </div>
                        <p className="text-xs opacity-90">
                          Refine your search above to check exact individual conflict status.
                        </p>
                      </>
                    )
                  ) : (
                    <>
                      <div className="font-extrabold text-sm">
                        "{searchVerification.query}" not found on the active master list
                      </div>
                      <p className="text-xs opacity-85">
                        Please verify your spelling or consult your class secretary / professor if you believe you are enrolled.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-[1.02]"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60"
              }`}
            >
              All Enrolled ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("regular")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                statusFilter === "regular"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 scale-[1.02]"
                  : "bg-secondary/50 text-muted-foreground hover:text-emerald-400 hover:bg-secondary/80 border border-border/60"
              }`}
            >
              Regular / Clear ({regularCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("conflict")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                statusFilter === "conflict"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/25 scale-[1.02]"
                  : "bg-secondary/50 text-muted-foreground hover:text-amber-400 hover:bg-secondary/80 border border-border/60"
              }`}
            >
              With Schedule Conflict ({conflictCount})
            </button>
          </div>
        </div>
      </section>

      {/* Student Cards Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Showing {filtered.length} of {students.length} students
          </p>
          {(search || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((student, idx) => {
              const initials = student.canonicalName
                .split(/[\s,]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(p => p[0]?.toUpperCase())
                .join("") || "ST";

              return (
                <div
                  key={`${student.canonicalName}-${idx}`}
                  className="p-4 rounded-2xl border border-border/70 bg-card/85 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-xs font-extrabold text-indigo-300 shadow-sm group-hover:scale-105 transition-transform">
                        {initials}
                      </span>
                      <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md bg-secondary text-[9px] font-mono text-muted-foreground border border-border/60">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-indigo-300 transition-colors">
                        {student.canonicalName}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {student.hasScheduleConflict ? "Schedule conflict registered" : "Clear enrolled status"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        student.hasScheduleConflict
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {student.hasScheduleConflict ? (
                        <>
                          <AlertTriangle className="size-3" />
                          <span>Conflict</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3" />
                          <span>Regular</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="signal-panel border border-dashed border-border/80 p-8 text-center rounded-2xl space-y-2 bg-secondary/10">
            <Users className="mx-auto size-8 text-muted-foreground/60" />
            <h3 className="text-sm font-bold text-foreground">No students match your criteria</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search ? `No student matching "${search}" was found.` : "No students in this filter."}
            </p>
          </div>
        )}

        {/* Privacy Note */}
        <div className="pt-2">
          <div className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 flex items-start gap-2.5 text-muted-foreground text-xs leading-relaxed">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground">Privacy Protection Notice: </span>
              In accordance with student privacy protection standards, only active enrolled names and class schedule conflict statuses are visible on this public portal. Student identification numbers, contact information, and private remarks are strictly withheld.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

