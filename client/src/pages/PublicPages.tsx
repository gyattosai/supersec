import { AnnouncementPreview } from "@/components/AnnouncementPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ViewOnlyHeader } from "@/components/ViewOnlyHeader";
import { formatDateTime12Hour, formatTimeRange12Hour } from "@/lib/time";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/meta";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { formatSocialTitle, formatSocialDescription, formatShorthandDate, formatFullDate } from "@shared/socialTitle";
import { sortPublicAttendanceRecords, type PublicAttendanceSortMode } from "@shared/attendanceSorting";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  BellRing,
  BookOpen,
  CalendarDays,
  CalendarX,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock,
  ExternalLink,
  FileText,
  History,
  Loader2,
  MessageCircleMore,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Children, isValidElement, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { PushNotificationSubscribeButton } from "@/components/PushNotificationSubscribeButton";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function PublicSubjectPage() {
  const [, params] = useRoute("/s/:publicId");
  const input = useMemo(() => ({ publicId: params?.publicId ?? "" }), [params?.publicId]);
  const subject = trpc.foundation.publicSubject.useQuery(input, { enabled: Boolean(input.publicId) });

  const subjectName = subject.data?.available ? subject.data.subject.name : "";
  const subjectCode = subject.data?.available ? subject.data.subject.code : "";
  const professorName = subject.data?.available ? subject.data.subject.professorName : "";
  const socialTitle = subject.data?.available
    ? formatSocialTitle({
        type: "Subject",
        contentTitle: subjectName,
        subjectCode,
      })
    : undefined;
  const socialDesc = subject.data?.available
    ? formatSocialDescription({
        type: "subject",
        subjectCode,
        subjectName,
        professorName,
      })
    : undefined;

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    ogImage: subject.data?.available ? `/api/og?type=subject&title=${encodeURIComponent(subject.data.subject.name)}&subjectCode=${encodeURIComponent(subject.data.subject.code)}` : undefined,
  });

  if (subject.isLoading) return <PublicShell><ReaderLoading label="Subject" /></PublicShell>;
  if (subject.isError) return <PublicShell><ReaderFailure /></PublicShell>;
  if (!subject.data?.available) return <PublicUnavailable />;
  const details = subject.data.subject;
  const schedule = details.meetingDays.length ? details.meetingDays.map(day => `${dayNames[day.weekday]}${formatTimeRange12Hour(day.startTime, day.endTime)}`).join(" · ") : "Schedule to be announced";
  return (
    <PublicShell>
      <section className="signal-panel rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-7 shadow-xl shadow-primary/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-sm">{details.code}</Badge>
            <h1 className="signal-title mt-3 text-xl sm:text-2xl md:text-3xl font-extrabold">{details.name}</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-semibold text-muted-foreground">Professor {details.professorName}</p>
          </div>
          <div className="signal-inset min-w-44 p-3 sm:p-4 rounded-xl bg-secondary/30">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">Schedule</p>
            <p className="mt-1 text-xs sm:text-sm font-semibold leading-5 text-foreground/90">{schedule}</p>
          </div>
        </div>
      </section>

      {details.noClass ? (
        <section className="mt-4 border-l-2 border-amber-400 bg-amber-400/10 p-3.5 sm:p-4 rounded-xl">
          <div className="flex gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h2 className="font-bold text-xs sm:text-sm text-foreground">No Class · {new Date(details.noClass.startsAt).toLocaleDateString()}</h2>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">{details.noClass.reason}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 sm:mt-8">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Class Records</p>
        <h2 className="signal-heading mt-1 text-lg sm:text-xl font-bold">Published Updates</h2>
        <div className="mt-4 grid gap-3 sm:gap-4 grid-cols-1">
          <PublicStudentMasterList students={details.students || []} />
          <PublicAttendanceList items={details.latest.attendance} />
          <PublicList icon={MessageCircleMore} title="Q&A" items={details.latest.questions} pathPrefix="/q/" empty="No Q&As published yet." allHref={`/s/${details.publicId}/questions`} />
          <PublicList icon={ExternalLink} title="Announcements" items={details.latest.announcements} pathPrefix="/a/" empty="No announcements yet." />
          <PublicResourceCards items={details.latest.resources} />
        </div>
      </section>
    </PublicShell>
  );
}

export function PublicSubjectQuestionsPage() {
  const [, params] = useRoute("/s/:publicId/questions");
  const publicId = params?.publicId ?? "";
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const questions = trpc.foundation.publicQuestions.useQuery({ publicId, query: search || undefined }, { enabled: Boolean(publicId) });

  const subjectName = questions.data?.available ? questions.data.subject.name : "";
  const subjectCode = questions.data?.available ? questions.data.subject.code : "";
  const socialTitle = questions.data?.available
    ? formatSocialTitle({
        type: "Q&A",
        contentTitle: "Knowledgebase",
        numberOrDate: "Knowledgebase",
        version: 1,
        subjectCode,
      })
    : undefined;
  const socialDesc = questions.data?.available
    ? formatSocialDescription({
        type: "qa_hub",
        subjectCode,
        subjectName,
      })
    : undefined;
  const dynamicOg = questions.data?.available
    ? `/api/og?type=question&title=${encodeURIComponent(socialTitle || subjectName + " Q&A")}&subjectCode=${encodeURIComponent(subjectCode)}&subtitle=${encodeURIComponent("Verified Class FAQs")}`
    : undefined;

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    keywords: subjectCode ? [subjectCode, subjectName, "Q&A", "Questions", "Answers", "Class FAQ"] : undefined,
    canonicalPath: publicId ? `/s/${publicId}/questions` : undefined,
    ogImage: dynamicOg,
    ogImageAlt: `${subjectName} Q&A Knowledgebase`,
    jsonLd: questions.data?.available
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          name: `${subjectName} Class FAQs & Knowledgebase`,
          description: `Frequently asked class questions and verified answers for ${subjectCode}`,
        }
      : undefined,
  });

  if (questions.isLoading) return <PublicShell><ReaderLoading label="Q&A" /></PublicShell>;
  if (questions.isError) return <PublicShell><ReaderFailure /></PublicShell>;
  if (!questions.data?.available) return <PublicUnavailable />;
  const { subject, questions: items } = questions.data;
  return (
    <PublicShell>
      <BackToSubject subject={subject} />
      <section className="mt-4 sm:mt-6 space-y-4">
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">Class Knowledgebase</p>
          <h1 className="signal-title mt-1 text-xl sm:text-2xl font-black tracking-tight text-foreground">Questions &amp; Answers</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Search verified answers and recurring class FAQs.</p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={event => {
            event.preventDefault();
            setSearch(searchDraft.trim());
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-input bg-card pl-10 pr-9 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
              placeholder="Search questions or keywords…"
              aria-label="Search questions"
            />
            {searchDraft ? (
              <button
                type="button"
                onClick={() => {
                  setSearchDraft("");
                  setSearch("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            className="signal-action min-h-11 rounded-xl bg-primary px-5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 active:scale-[0.98]"
          >
            Search
          </button>
        </form>

        {search ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <p>
              Showing {items.length} {items.length === 1 ? "result" : "results"} for “<span className="font-bold text-foreground">{search}</span>”
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchDraft("");
                setSearch("");
              }}
              className="font-bold text-primary hover:underline"
            >
              Clear filter
            </button>
          </div>
        ) : null}
      </section>

      <section className="mt-5 space-y-3.5 pb-12">
        {items.map((item: any) => {
          const tags = item.tagsText?.split(",").map((tag: string) => tag.trim()).filter(Boolean) ?? [];
          return (
            <div key={item.publicId} className="signal-card-shell">
              <Link
                href={`/q/${item.publicId}`}
                className="signal-record-card signal-action block p-5 sm:p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/40 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        item.isOfficial ? "glow-badge-emerald" : "glow-badge-amber"
                      }`}
                    >
                      {item.isOfficial ? "Official Answer" : "Unofficial"}
                    </span>
                    {tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="rounded-full text-[10px] font-semibold">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <h2 className="mt-3 text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {item.question}
                </h2>
                <p className="mt-1.5 line-clamp-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
                {item.publishedAt ? (
                  <p className="mt-3 text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                    Published {new Date(item.publishedAt).toLocaleDateString()}
                  </p>
                ) : null}
              </Link>
            </div>
          );
        })}
        {!items.length ? (
          <div className="signal-card-shell">
            <div className="signal-record-card p-8 text-center rounded-2xl border border-border bg-card space-y-3">
              <MessageCircleMore className="mx-auto size-7 text-muted-foreground" />
              <h2 className="font-bold text-sm text-foreground">No answers found</h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search ? `No questions matched "${search}". Try different keywords.` : "No Q&As have been published for this subject yet."}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    setSearch("");
                  }}
                  className="signal-action inline-flex min-h-9 items-center rounded-xl bg-secondary px-4 text-xs font-bold text-foreground hover:bg-secondary/80"
                >
                  Reset Search
                </button>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </PublicShell>
  );
}

export function PublicUnavailable() {
  return (
    <PublicShell>
      <section className="signal-panel rounded-2xl border border-primary/25 bg-card p-6 sm:p-8 text-center shadow-lg">
        <CircleAlert className="mx-auto h-7 w-7 text-primary" />
        <h1 className="signal-heading mt-3 text-lg sm:text-xl font-bold">Page Not Available</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">This link is inactive or has not been published yet.</p>
        <Link href="/" className="signal-action mt-5 inline-flex min-h-10 items-center rounded-xl bg-primary px-5 text-xs sm:text-sm font-bold text-primary-foreground active:scale-[0.98]">
          Back to Home
        </Link>
      </section>
    </PublicShell>
  );
}
export function PublicAnnouncementPage() { const [, params] = useRoute("/a/:publicId"); return <PublicContentPage kind="announcement" publicId={params?.publicId ?? ""} label="Announcement" />; }
export function PublicResourcePage() { const [, params] = useRoute("/r/:publicId"); return <PublicContentPage kind="resource" publicId={params?.publicId ?? ""} label="Resource" />; }
export function PublicQuestionPage() { const [, params] = useRoute("/q/:publicId"); return <PublicContentPage kind="question" publicId={params?.publicId ?? ""} label="Q&A" />; }

export function PublicAttendancePage() {
  const [, params] = useRoute("/attendance/:publicId");
  const publicId = params?.publicId ?? "";
  const attendance = trpc.foundation.publicAttendance.useQuery({ publicId }, { enabled: Boolean(publicId) });
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "PRESENT" | "ABSENT" | "EXCUSED" | "CONFLICT" | "NOT_SET">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<PublicAttendanceSortMode>("last-name-asc");

  const details = attendance.data?.available ? attendance.data.attendance : null;
  const totals = details?.records.reduce(
    (result, record) => {
      if (record.status === "PRESENT") result.present += 1;
      else if (record.status === "ABSENT") result.absent += 1;
      else if (record.status === "EXCUSED") result.excused += 1;
      else if (record.status === "CONFLICT") result.conflict += 1;
      else result.notSet += 1;
      return result;
    },
    { present: 0, absent: 0, excused: 0, conflict: 0, notSet: 0 }
  ) ?? { present: 0, absent: 0, excused: 0, conflict: 0, notSet: 0 };

  const isNoClass = details?.sessionState === "no_class";
  const noClassReason = details?.noClassReason || "No class scheduled";

  const dateShorthand = details ? formatShorthandDate(details.startsAt) || "Session" : "";
  const dateStr = details?.startsAt ? new Date(details.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const socialTitle = details
    ? formatSocialTitle({
        type: "Attendance",
        numberOrDate: dateShorthand,
        version: details.version,
        subjectCode: details.subject.code,
        isNoClass,
        noClassReason,
      })
    : undefined;
  const socialDesc = details
    ? formatSocialDescription({
        type: "attendance",
        subjectCode: details.subject.code,
        subjectName: details.subject.name,
        date: details.startsAt,
        totals,
        version: details.version,
        isNoClass,
        noClassReason,
      })
    : undefined;
  const ogImgUrl = details
    ? `/og/attendance-${params?.publicId}.jpg?v=${details.version}`
    : undefined;

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    keywords: details
      ? [
          details.subject.code,
          details.subject.name,
          ...(isNoClass ? ["No Class", "Class Suspended", "Notice"] : ["Attendance", "Roll Call", "Class Session"]),
          `Version ${details.version}`,
        ]
      : undefined,
    canonicalPath: params?.publicId ? `/attendance/${params.publicId}` : undefined,
    ogImage: ogImgUrl,
    ogImageAlt: details ? (isNoClass ? `${details.subject.name} No Class Notice` : `${details.subject.name} Attendance v${details.version}`) : undefined,
    jsonLd: details
      ? {
          "@context": "https://schema.org",
          "@type": "EducationEvent",
          name: isNoClass ? `${details.subject.name} Class Session (Suspended)` : `${details.subject.name} Class Session Attendance`,
          startDate: details.startsAt ? new Date(details.startsAt).toISOString() : undefined,
          description: isNoClass ? `No class notice for ${details.subject.code}: ${noClassReason}` : `Verified roll call attendance for ${details.subject.code} — ${details.subject.name}`,
          eventStatus: isNoClass ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
          organizer: {
            "@type": "Organization",
            name: "supersec",
          },
        }
      : undefined,
  });

  const filteredRecords = useMemo(() => {
    if (!details?.records) return [];
    const matched = details.records.filter(record => {
      const matchesStatus = selectedStatus === "ALL" || record.status === selectedStatus;
      const matchesSearch = !searchQuery || record.canonicalName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
    return sortPublicAttendanceRecords(matched, sortMode);
  }, [details?.records, selectedStatus, searchQuery, sortMode]);

  if (attendance.isLoading) {
    return (
      <PublicShell>
        <div className="mt-4 sm:mt-6 space-y-4 animate-pulse">
          <div className="h-9 w-24 rounded-xl bg-secondary/80" />
          <div className="h-44 rounded-2xl border border-border/60 bg-secondary/30" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="h-20 rounded-xl bg-secondary/40" />
            <div className="h-20 rounded-xl bg-secondary/40" />
            <div className="h-20 rounded-xl bg-secondary/40" />
            <div className="h-20 rounded-xl bg-secondary/40" />
          </div>
          <div className="space-y-2">
            <div className="h-14 rounded-xl bg-secondary/30" />
            <div className="h-14 rounded-xl bg-secondary/30" />
            <div className="h-14 rounded-xl bg-secondary/30" />
          </div>
        </div>
      </PublicShell>
    );
  }
  if (attendance.isError) return <PublicShell><ReaderFailure /></PublicShell>;
  if (!attendance.data?.available || !details) return <PublicUnavailable />;

  return (
    <PublicShell>
      <BackToSubject subject={details.subject} />
      <article className="min-w-0 mt-4 sm:mt-6 space-y-4 sm:space-y-5">
        {/* Prominent Header Banner */}
        <section className={`signal-panel rounded-2xl border p-4 sm:p-6 shadow-xl ${
          isNoClass
            ? "border-amber-500/40 bg-gradient-to-br from-amber-950/25 via-card to-card shadow-amber-950/20"
            : "border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card shadow-primary/5"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge className="rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-sm">
                {details.subject.code}
              </Badge>
              <span className="truncate text-xs sm:text-sm font-semibold text-foreground/90">{details.subject.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isNoClass ? (
                <Badge variant="outline" className="rounded-full border-amber-500/50 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-400 shadow-sm">
                  <CalendarX className="mr-1 size-3 text-amber-400" />
                  No Classes Scheduled
                </Badge>
              ) : null}
              <Badge variant="secondary" className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-bold shadow-sm">
                v{details.version} · Published
              </Badge>
            </div>
          </div>

          <h1 className="signal-title mt-3 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            {isNoClass ? "Class Suspended / No Classes" : "Attendance Record"}
          </h1>

          {/* Large Visible Time & Date Card */}
          <div className={`mt-3.5 flex items-center gap-3 rounded-xl sm:rounded-2xl border p-3 sm:p-4 ${
            isNoClass ? "border-amber-500/30 bg-amber-950/20" : "border-border/80 bg-secondary/40"
          }`}>
            <span className={`grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl ${
              isNoClass ? "bg-amber-500/20 text-amber-400" : "bg-primary/10 text-primary"
            }`}>
              {isNoClass ? <CalendarX className="size-5" /> : <CalendarDays className="size-5" />}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {isNoClass ? "Scheduled Meeting Date" : "Class Session"}
              </p>
              <p className="mt-0.5 text-sm sm:text-base md:text-lg font-extrabold text-foreground truncate">
                {formatDateTime12Hour(details.startsAt)}
              </p>
            </div>
          </div>

          {/* Dedicated Suspension Reason Card */}
          {isNoClass && (
            <div className="mt-4 rounded-xl sm:rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                  <AlertTriangle className="size-4 sm:size-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
                    Official Notice · Reason for Suspension
                  </h2>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-foreground break-words leading-snug">
                    {noClassReason}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground pt-1">
                    Regular roll call is suspended for this date. Students are not marked absent, and attendance submissions are not required.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Two Separate Cards for Zoom Proof and Excuse Letter */}
        {isNoClass ? (
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 sm:p-5 text-center">
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Zoom proof and absence excuse letters are waived because class was suspended. If you need to review announcements or resources, visit the{" "}
              <Link href={`/s/${details.subject.publicId}`} className="font-bold text-primary hover:underline">
                {details.subject.name} portal
              </Link>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Card 1: Proof of Attendance (Attended Zoom) */}
            <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-card to-card p-4 sm:p-5 shadow-lg shadow-emerald-950/15">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 text-[11px] font-bold text-emerald-400">
                    <Sparkles className="mr-1 size-3" />
                    Instant AI Verification
                  </Badge>
                </div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Attended on Zoom?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Upload your Zoom participant screenshot for instant automated AI verification and attendance update.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href={`/attendance/${details.publicId}/proof`}
                  className="signal-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/30 transition-all active:scale-[0.99]"
                >
                  <Sparkles className="size-4" />
                  Submit Zoom Proof
                </Link>
              </div>
            </section>

            {/* Card 2: Excuse Letter Submission */}
            <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/20 via-card to-card p-4 sm:p-5 shadow-lg shadow-sky-950/15">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="rounded-full border-sky-500/40 bg-sky-500/10 text-[11px] font-bold text-sky-300">
                    <FileText className="mr-1 size-3" />
                    Secretary Review
                  </Badge>
                </div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Submit Excuse Letter
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Missed class? Submit your reason and optional medical or excuse proof for class secretary review.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href={`/attendance/${details.publicId}/excuse`}
                  className="signal-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-4 text-xs sm:text-sm font-bold shadow-md shadow-sky-950/30 transition-all active:scale-[0.99]"
                >
                  <FileText className="size-4" />
                  Submit Excuse Letter
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* Instant Class Alerts Card & Push Subscription */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card p-4 sm:p-5 shadow-md shadow-primary/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <BellRing className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/50 bg-primary/20 text-primary text-[10px] font-extrabold uppercase tracking-wider">
                    Instant Alerts
                  </Badge>
                  <span className="text-xs font-bold text-foreground">Class Push Notifications</span>
                </div>
                <h3 className="mt-1 text-sm sm:text-base font-bold text-foreground">
                  Get instant roll-call &amp; class notices for {details.subject.code}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Receive instant browser alerts when attendance opens, classes are suspended, or urgent updates are published.
                </p>
              </div>
            </div>

            <div className="shrink-0 self-stretch sm:self-center">
              <PushNotificationSubscribeButton
                subjectPublicId={details.subject.publicId}
                subjectName={details.subject.name}
                subjectCode={details.subject.code}
                variant="button"
                className="w-full sm:w-auto font-bold shadow-sm"
              />
            </div>
          </div>
        </section>

        {isNoClass && details.records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-12 text-center text-muted-foreground">
            <CalendarX className="mx-auto size-10 text-amber-400/80 mb-3" />
            <p className="text-base font-bold text-foreground">No Attendance Roll Call Recorded</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              This class session was officially designated as No Class. No roll call was conducted, and all student attendance requirements are waived for this date.
            </p>
          </div>
        ) : (
          <>
            {/* Clickable Status Metric Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "PRESENT" ? "ALL" : "PRESENT")}
                className={`p-3 sm:p-4 text-left transition-all cursor-pointer rounded-xl sm:rounded-2xl border active:scale-[0.98] ${
                  selectedStatus === "PRESENT"
                    ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/15 shadow-md shadow-emerald-950/20"
                    : "border-border/80 bg-card hover:border-emerald-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Present</p>
                  <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-400" />
                </div>
                <p className="mt-1.5 text-2xl sm:text-3xl font-black text-emerald-400">{totals.present}</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "ABSENT" ? "ALL" : "ABSENT")}
                className={`p-3 sm:p-4 text-left transition-all cursor-pointer rounded-xl sm:rounded-2xl border active:scale-[0.98] ${
                  selectedStatus === "ABSENT"
                    ? "border-red-500 ring-2 ring-red-500/30 bg-red-500/15 shadow-md shadow-red-950/20"
                    : "border-border/80 bg-card hover:border-red-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Absent</p>
                  <XCircle className="size-3.5 sm:size-4 text-red-400" />
                </div>
                <p className="mt-1.5 text-2xl sm:text-3xl font-black text-red-400">{totals.absent}</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "EXCUSED" ? "ALL" : "EXCUSED")}
                className={`p-3 sm:p-4 text-left transition-all cursor-pointer rounded-xl sm:rounded-2xl border active:scale-[0.98] ${
                  selectedStatus === "EXCUSED"
                    ? "border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/15 shadow-md shadow-sky-950/20"
                    : "border-border/80 bg-card hover:border-sky-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Excused</p>
                  <AlertCircle className="size-3.5 sm:size-4 text-sky-400" />
                </div>
                <p className="mt-1.5 text-2xl sm:text-3xl font-black text-sky-400">{totals.excused}</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "CONFLICT" ? "ALL" : "CONFLICT")}
                className={`p-3 sm:p-4 text-left transition-all cursor-pointer rounded-xl sm:rounded-2xl border active:scale-[0.98] ${
                  selectedStatus === "CONFLICT"
                    ? "border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/15 shadow-md shadow-purple-950/20"
                    : "border-border/80 bg-card hover:border-purple-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Conflict</p>
                  <AlertCircle className="size-3.5 sm:size-4 text-purple-400" />
                </div>
                <p className="mt-1.5 text-2xl sm:text-3xl font-black text-purple-400">{totals.conflict}</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "NOT_SET" ? "ALL" : "NOT_SET")}
                className={`p-3 sm:p-4 text-left transition-all cursor-pointer rounded-xl sm:rounded-2xl border active:scale-[0.98] ${
                  selectedStatus === "NOT_SET"
                    ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/15 shadow-md shadow-amber-950/20"
                    : "border-border/80 bg-card hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground">Not set</p>
                  <Clock className="size-3.5 sm:size-4 text-amber-400" />
                </div>
                <p className="mt-1.5 text-2xl sm:text-3xl font-black text-amber-400">{totals.notSet}</p>
              </button>
            </div>

            {/* Filter Tabs & Live Search Toolbar */}
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between pt-1">
              {/* Segmented Filter Pills (Scrollable on Mobile) */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-secondary/50 p-1 border border-border">
                {(
                  [
                    { id: "ALL", label: "All", count: details.records.length },
                    { id: "PRESENT", label: "Present", count: totals.present },
                    { id: "ABSENT", label: "Absent", count: totals.absent },
                    { id: "EXCUSED", label: "Excused", count: totals.excused },
                    { id: "CONFLICT", label: "Conflict", count: totals.conflict },
                    { id: "NOT_SET", label: "Not set", count: totals.notSet },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedStatus(tab.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      selectedStatus === tab.id
                        ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Box */}
                <div className="relative flex-1 min-w-40 sm:min-w-56">
                  <Search className="absolute left-3 top-1/2 size-3.5 sm:size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search student name…"
                    className="min-h-10 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Sort Select */}
                <div className="relative shrink-0">
                  <select
                    id="public-att-sort"
                    value={sortMode}
                    onChange={e => setSortMode(e.target.value as PublicAttendanceSortMode)}
                    className="min-h-10 rounded-xl border border-input bg-card pl-3 pr-8 text-xs sm:text-sm font-semibold text-foreground appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Sort Attendance records"
                  >
                    <option value="last-name-asc">Last Name (A–Z)</option>
                    <option value="last-name-desc">Last Name (Z–A)</option>
                    <option value="first-name">First Name (A–Z)</option>
                    <option value="status">Status priority</option>
                  </select>
                  <ArrowUpDown className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Student Count Indicator */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{filteredRecords.length} of {details.records.length} students</span>
              {selectedStatus !== "ALL" || searchQuery || sortMode !== "last-name-asc" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus("ALL");
                    setSearchQuery("");
                    setSortMode("last-name-asc");
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Reset filters
                </button>
              ) : null}
            </div>

            {/* Student List with Mobile-Optimized Roster Cards */}
            <div className="space-y-2">
              {filteredRecords.map((record, index) => {
                const isPresent = record.status === "PRESENT";
                const isAbsent = record.status === "ABSENT";
                const isExcused = record.status === "EXCUSED";
                const isConflict = record.status === "CONFLICT";
                return (
                  <div
                    key={record.canonicalName}
                    className={`flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                      isPresent
                        ? "border-emerald-500/30 bg-emerald-950/15 hover:border-emerald-500/50 shadow-sm"
                        : isAbsent
                        ? "border-red-500/30 bg-red-950/15 hover:border-red-500/50 shadow-sm"
                        : isExcused
                        ? "border-sky-500/30 bg-sky-950/15 hover:border-sky-500/50 shadow-sm"
                        : isConflict
                        ? "border-purple-500/30 bg-purple-950/15 hover:border-purple-500/50 shadow-sm"
                        : "border-border/80 bg-card hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {/* Number pill */}
                      <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-lg bg-secondary/80 text-[11px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-base text-foreground leading-snug break-words">
                          {record.canonicalName}
                        </p>
                      </div>
                    </div>

                    {/* Prominent High-Contrast Status Pill */}
                    <div className="shrink-0">
                      {isPresent ? (
                        <span className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] sm:text-xs font-black text-emerald-300 shadow-sm shadow-emerald-950/30">
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-300" />
                          PRESENT
                        </span>
                      ) : isAbsent ? (
                        <span className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl border border-red-500/40 bg-red-500/20 px-2.5 py-1 text-[11px] sm:text-xs font-black text-red-300 shadow-sm shadow-red-950/30">
                          <XCircle className="size-3.5 shrink-0 text-red-300" />
                          ABSENT
                        </span>
                      ) : isExcused ? (
                        <span className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl border border-sky-500/40 bg-sky-500/20 px-2.5 py-1 text-[11px] sm:text-xs font-black text-sky-300 shadow-sm shadow-sky-950/30">
                          <AlertCircle className="size-3.5 shrink-0 text-sky-300" />
                          EXCUSED
                        </span>
                      ) : isConflict ? (
                        <span className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl border border-purple-500/40 bg-purple-500/20 px-2.5 py-1 text-[11px] sm:text-xs font-black text-purple-300 shadow-sm shadow-purple-950/30">
                          <AlertCircle className="size-3.5 shrink-0 text-purple-300" />
                          CONFLICT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[11px] sm:text-xs font-black text-amber-300 shadow-sm shadow-amber-950/30">
                          <Clock className="size-3.5 shrink-0 text-amber-300" />
                          NOT SET
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {!filteredRecords.length ? (
                <div className="p-6 sm:p-8 text-center rounded-2xl border border-border bg-card">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {searchQuery
                      ? `No students found matching “${searchQuery}”`
                      : "No student records for this view."}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </article>

      <HistoryLedger entries={details.history} />
    </PublicShell>
  );
}

export function PublicReportPage() {
  const [, params] = useRoute("/reports/:publicId");
  const publicId = params?.publicId ?? "";
  const report = trpc.foundation.publicReport.useQuery({ publicId }, { enabled: Boolean(publicId) });
  const details = report.data?.available ? report.data.report : null;

  const dateShorthand = details ? formatShorthandDate(details.startsAt) || `#${details.version}` : "";
  const socialTitle = details
    ? formatSocialTitle({
        type: "Report",
        contentTitle: details.title,
        numberOrDate: dateShorthand,
        version: details.version,
      })
    : undefined;
  const socialDesc = details
    ? formatSocialDescription({
        type: "report",
        contentTitle: details.title,
        date: details.startsAt,
        totals: details.totals,
        version: details.version,
      })
    : "Official certified summary attendance and performance report.";
  const dynamicOg = details
    ? `/api/og?type=report&title=${encodeURIComponent(socialTitle || details.title)}&version=${details.version}&v=${details.version}`
    : undefined;

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    keywords: details ? [details.title, "Attendance Report", "Summary Analytics", "Class Report"] : undefined,
    canonicalPath: publicId ? `/reports/${publicId}` : undefined,
    ogImage: dynamicOg,
    ogImageAlt: details ? `${details.title} Report Cover` : undefined,
  });

  if (report.isLoading) return <PublicShell><ReaderLoading label="Report" /></PublicShell>;
  if (report.isError) return <PublicShell><ReaderFailure /></PublicShell>;
  if (!report.data?.available || !details) return <PublicUnavailable />;
  return (
    <PublicShell>
      <div className="print-hidden flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="signal-action inline-flex min-h-10 items-center rounded-xl border border-border bg-card px-4 text-xs sm:text-sm font-bold text-foreground hover:bg-secondary active:scale-[0.98] shadow-sm"
        >
          Print / Save PDF
        </button>
      </div>
      <article className="print-report mt-4 sm:mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-8 shadow-xl shadow-primary/5">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">Summary Report · v{details.version}</p>
        <h1 className="signal-title mt-2 text-xl sm:text-2xl md:text-3xl font-extrabold">{details.title}</h1>
        {details.startsAt ? <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{formatDateTime12Hour(details.startsAt)}</p> : null}
        
        {details.totals ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
            <ReportMetric label="Present" value={details.totals.present} tone="text-emerald-400" />
            <ReportMetric label="Absent" value={details.totals.absent} tone="text-red-400" />
            <ReportMetric label="Excused" value={details.totals.excused} tone="text-sky-400" />
            <ReportMetric label="Not set" value={details.totals.notSet} tone="text-amber-400" />
          </div>
        ) : null}

        {details.subjects?.length ? (
          <div className="mt-6 divide-y divide-border rounded-xl border border-border/80 bg-card/60 p-2 sm:p-4">
            {details.subjects.map(subject => (
              <div key={`${subject.subjectCode}-${subject.subjectName}`} className="py-3.5 first:pt-1 last:pb-1">
                <p className="font-bold text-xs sm:text-sm text-foreground">{subject.subjectName}</p>
                <p className="text-[11px] text-muted-foreground">{subject.subjectCode}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-300">{subject.present} present</span>
                  <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-red-300">{subject.absent} absent</span>
                  <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-sky-300">{subject.excused} excused</span>
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-300">{subject.notSet} not set</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <p className="mt-6 text-[11px] text-muted-foreground">Official class record.</p>
      </article>
    </PublicShell>
  );
}

function PublicContentPage({ kind, publicId, label }: { kind: "announcement" | "resource" | "question"; publicId: string; label: string }) {
  const input = useMemo(() => ({ kind, publicId }), [kind, publicId]);
  const item = trpc.foundation.publicItem.useQuery(input, { enabled: Boolean(input.publicId) });
  const history = trpc.foundation.publicHistory.useQuery(input, { enabled: Boolean(input.publicId) && Boolean(item.data?.available) });

  const details = item.data?.available ? item.data.item : null;
  const visual = details?.media ?? details?.socialPreviewMedia;
  const visibleTitle = details?.kind === "question" ? details.title.replace(/^(Official|Unofficial) answer — /, "") : (details?.title || "");
  const dateShorthand = details ? formatShorthandDate(details.publishedAt) || `#${details.version}` : "";
  const socialTitle = details
    ? formatSocialTitle({
        type: kind,
        contentTitle: visibleTitle,
        numberOrDate: dateShorthand,
        version: details.version,
        subjectCode: details.subject?.code,
      })
    : undefined;
  const socialDesc = details
    ? formatSocialDescription({
        type: kind,
        subjectCode: details.subject?.code,
        subjectName: details.subject?.name,
        contentTitle: visibleTitle,
        contentBody: details.body,
        category: details.category,
        date: details.publishedAt,
        version: details.version,
      })
    : "Official class post.";
  const dateStr = details?.publishedAt ? new Date(details.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const staticOgName =
    kind === "question"
      ? `qa-${publicId}.jpg`
      : kind === "resource"
      ? `resource-${publicId}.jpg`
      : `announcement-${publicId}.jpg`;
  const dynamicOg = details
    ? visual?.url || `/og/${staticOgName}?v=${details.version}`
    : undefined;

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    keywords: details ? [visibleTitle, details.subject?.code || "", label, "Class Update", "Official Announcement"] : undefined,
    canonicalPath: publicId ? `/${kind === "announcement" ? "a" : kind === "resource" ? "r" : "q"}/${publicId}` : undefined,
    ogImage: dynamicOg,
    ogImageAlt: visual?.altText || visibleTitle,
    ogType: "article",
    publishedTime: details?.publishedAt ? new Date(details.publishedAt).toISOString() : undefined,
    jsonLd: details
      ? {
          "@context": "https://schema.org",
          "@type": kind === "question" ? "QAPage" : kind === "resource" ? "LearningResource" : "Article",
          name: visibleTitle,
          description: details.body ? details.body.replace(/\s+/g, " ").slice(0, 180) : "Class post",
          datePublished: details.publishedAt ? new Date(details.publishedAt).toISOString() : undefined,
          author: {
            "@type": "Organization",
            name: "supersec",
          },
        }
      : undefined,
  });

  if (item.isLoading) return <PublicShell><ReaderLoading label={label} /></PublicShell>;
  if (item.isError) return <PublicShell><ReaderFailure /></PublicShell>;
  if (!item.data?.available || !details) return <PublicUnavailable />;

  const tags = details.kind === "question" ? details.tagsText?.split(",").map(tag => tag.trim()).filter(Boolean) ?? [] : [];
  return (
    <PublicShell>
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6 min-w-0">
        <BackToSubject subject={details.subject} />
        <article className="signal-panel min-w-0 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card shadow-xl shadow-primary/5 p-4 sm:p-6 md:p-8 space-y-6">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-primary">
                  {label}
                </span>
                {details.kind === "question" ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${details.isOfficial ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-sm" : "border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-sm"}`}>
                    {details.isOfficial ? <ShieldCheck className="size-3.5" /> : <CircleHelp className="size-3.5" />}
                    {details.isOfficial ? "Official Answer" : "Unofficial"}
                  </span>
                ) : null}
                {details.kind === "resource" && details.category ? (
                  <span className="text-xs sm:text-sm text-muted-foreground font-semibold">
                    · {details.category}{details.sourceDomain ? ` · ${details.sourceDomain}` : ""}
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                v{details.version}
              </span>
            </div>

            <h1 className="signal-title text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
              {visibleTitle}
            </h1>

            {tags.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="rounded-full text-xs px-2.5 py-0.5 font-medium">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {visual ? (
            <div className="-mx-4 sm:-mx-6 md:-mx-8 overflow-hidden border-y border-border/80 bg-black/20">
              <img src={visual.url} alt={visual.altText ?? ""} className="max-h-[28rem] w-full object-cover" />
            </div>
          ) : null}

          <div className="border-t border-border/70 pt-6 space-y-5">
            <div className="text-base sm:text-lg leading-relaxed text-foreground/95 font-normal max-w-none">
              <AnnouncementPreview body={details.body} />
            </div>

            {details.kind === "resource" && details.destinationUrl ? (
              <div className="pt-4 border-t border-border/30">
                <a href={details.destinationUrl} target="_blank" rel="noreferrer" className="signal-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground active:scale-[0.98] shadow-md shadow-primary/25">
                  <ExternalLink className="size-4" />
                  Open Link
                </a>
              </div>
            ) : null}

            <div className="pt-4 border-t border-border/40">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Official class record{details.publishedAt ? ` · ${new Date(details.publishedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>
        </article>
        <div className="text-xs text-muted-foreground space-y-2 mt-8 pt-6 border-t border-border/40">
          <HistoryLedger
            entries={history.data?.available ? history.data.history : []}
            itemKind={kind}
            entityId={details.publicId}
            itemTitle={visibleTitle}
            itemBody={details.body}
            onHistoryUpdated={() => history.refetch()}
          />
        </div>
      </div>
    </PublicShell>
  );
}

type ViewOnlySubject = { publicId: string; viewOnlyShortMark?: string | null; viewOnlyName?: string | null; code?: string };
function subjectFromReaderChildren(children: React.ReactNode): ViewOnlySubject | null { for (const child of Children.toArray(children)) if (isValidElement<{ subject?: ViewOnlySubject }>(child) && child.type === BackToSubject) return child.props.subject ?? null; return null; }
export function PublicShell({ children, subject }: { children: React.ReactNode; subject?: ViewOnlySubject | null }) {
  return (
    <main className="signal-canvas min-h-screen px-3.5 sm:px-6 md:px-8 py-3.5 sm:py-5 md:py-6 text-foreground">
      <div className="mx-auto max-w-5xl">
        <ViewOnlyHeader subject={subject ?? subjectFromReaderChildren(children)} />
        <div className="pb-10">{children}</div>
      </div>
    </main>
  );
}

function BackToSubject({ subject }: { subject?: { publicId?: string; code?: string; name?: string } | null }) {
  if (!subject?.publicId) return null;
  return (
    <div className="mb-4">
      <Link
        href={`/s/${subject.publicId}`}
        className="signal-action inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-bold text-primary hover:bg-secondary transition-all shadow-sm"
      >
        <ChevronRight className="size-3.5 rotate-180" />
        {subject.code ? `${subject.code} · ` : ""}{subject.name || "Subject Home"}
      </Link>
    </div>
  );
}
function ReaderLoading({ label }: { label: string }) {
  return (
    <div className="signal-inset flex items-center gap-3 p-5">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-xs sm:text-sm text-muted-foreground">Loading {label}…</p>
    </div>
  );
}
function ReaderFailure() {
  return (
    <section className="signal-panel border-t-2 border-primary p-7 text-center rounded-2xl">
      <CircleAlert className="mx-auto h-6 w-6 text-muted-foreground" />
      <h1 className="signal-heading mt-4 font-bold">Unable to load page</h1>
      <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Please try again in a moment.</p>
      <button type="button" onClick={() => window.location.reload()} className="signal-action mt-5 inline-flex min-h-10 items-center rounded-xl bg-primary px-5 text-xs sm:text-sm font-bold text-primary-foreground">Try again</button>
    </section>
  );
}
function statusTone(status: "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_SET") { return status === "PRESENT" ? "text-emerald-400" : status === "ABSENT" ? "text-red-400" : status === "EXCUSED" ? "text-sky-400" : "text-amber-400"; }
function ReportMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="signal-stat-card">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl sm:text-3xl font-black tracking-[-0.06em] ${tone}`}>{value}</p>
    </div>
  );
}
export function HistoryLedger({
  entries,
  itemKind,
  entityId,
  itemTitle,
  itemBody,
  onHistoryUpdated,
}: {
  entries: Array<{ version: number; action: string; summary: string; createdAt: Date }>;
  itemKind?: "announcement" | "resource" | "question";
  entityId?: string;
  itemTitle?: string;
  itemBody?: string;
  onHistoryUpdated?: () => void;
}) {
  const { user } = useAuth();
  const canEdit = Boolean(user && itemKind && entityId);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [draftingVersion, setDraftingVersion] = useState<number | null>(null);

  const autoDraftMutation = trpc.content.autoDraftVersionHistory.useMutation();
  const updateSummaryMutation = trpc.content.updateHistoryEntrySummary.useMutation();

  if (!entries.length) return null;

  const handleAutoDraft = async (entry: { version: number; action: string; summary: string }) => {
    if (!itemKind || !entityId) return;
    setDraftingVersion(entry.version);
    try {
      const res = await autoDraftMutation.mutateAsync({
        kind: itemKind,
        title: itemTitle || "Content",
        body: itemBody || "",
        version: entry.version,
        action: entry.action,
      });
      const generated = res.summary;
      if (editingVersion === entry.version) {
        setEditText(generated);
      } else {
        await updateSummaryMutation.mutateAsync({
          entityType: itemKind,
          entityId,
          version: entry.version,
          summary: generated,
        });
        toast.success(`v${entry.version} summary updated with AI`);
        onHistoryUpdated?.();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to auto-draft summary");
    } finally {
      setDraftingVersion(null);
    }
  };

  const handleSaveManual = async (version: number) => {
    if (!itemKind || !entityId) return;
    const clean = editText.trim();
    if (clean.length < 3) {
      toast.error("Summary must be at least 3 characters");
      return;
    }
    try {
      await updateSummaryMutation.mutateAsync({
        entityType: itemKind,
        entityId,
        version,
        summary: clean,
      });
      toast.success(`v${version} summary saved`);
      setEditingVersion(null);
      setEditText("");
      onHistoryUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save summary");
    }
  };

  return (
    <section className="mt-7 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-xs sm:text-sm font-bold text-foreground">Update History</h2>
        </div>
        {canEdit && (
          <span className="text-[11px] font-medium text-primary/80">
            Secretary Mode · AI drafting enabled
          </span>
        )}
      </div>
      <ol className="mt-3 divide-y divide-border/60">
        {entries.map(entry => {
          const isThisDrafting = draftingVersion === entry.version;
          const isThisEditing = editingVersion === entry.version;

          return (
            <li key={`${entry.version}-${entry.createdAt}`} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    v{entry.version} · {entry.action}
                  </p>
                  {isThisEditing ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        placeholder="Version summary..."
                        className="h-8 text-xs rounded-lg"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="h-7 text-xs px-2.5"
                          onClick={() => handleSaveManual(entry.version)}
                          disabled={updateSummaryMutation.isPending}
                        >
                          <Check className="size-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-primary"
                          onClick={() => handleAutoDraft(entry)}
                          disabled={isThisDrafting}
                        >
                          {isThisDrafting ? <Loader2 className="size-3 animate-spin mr-1" /> : <Sparkles className="size-3 mr-1 text-primary" />}
                          Re-draft with AI
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2"
                          onClick={() => { setEditingVersion(null); setEditText(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.summary}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {canEdit && !isThisEditing && (
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutoDraft(entry)}
                      disabled={isThisDrafting}
                      className="h-7 gap-1 px-2 text-[11px] font-semibold border-primary/30 text-primary hover:bg-primary/10"
                      title="Auto-draft details with Gemini AI"
                    >
                      {isThisDrafting ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Sparkles className="size-3" />
                      )}
                      <span>{isThisDrafting ? "Drafting..." : "AI Auto-Draft"}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingVersion(entry.version); setEditText(entry.summary); }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      title="Edit note manually"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function PublicStudentMasterList({
  students,
}: {
  students: Array<{ canonicalName: string; hasScheduleConflict: boolean }>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "regular" | "conflict">("all");

  const conflictCount = useMemo(() => students.filter(s => s.hasScheduleConflict).length, [students]);
  const regularCount = students.length - conflictCount;

  const filtered = useMemo(() => {
    let list = students;
    if (filter === "regular") list = list.filter(s => !s.hasScheduleConflict);
    if (filter === "conflict") list = list.filter(s => s.hasScheduleConflict);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.canonicalName.toLowerCase().includes(q));
    }
    return list;
  }, [students, filter, search]);

  const searchMatch = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    const found = students.filter(s => s.canonicalName.toLowerCase().includes(q));
    return {
      count: found.length,
      hasConflict: found.some(s => s.hasScheduleConflict),
      exact: found.length === 1 ? found[0] : null,
    };
  }, [students, search]);

  return (
    <ReaderSection icon={Users} title="Student Master List">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Enrolled active students and schedule conflict verification.
        </p>
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground border border-border">
            {students.length} Enrolled
          </span>
          {conflictCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-400 border border-amber-500/30">
              {conflictCount} With Conflict
            </span>
          )}
        </div>
      </div>

      {/* Name Checker / Search Box */}
      <div className="mt-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Check your name (e.g. Dela Cruz)..."
            className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Verification banner if user searched */}
        {search.trim() && searchMatch && (
          <div
            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              searchMatch.count > 0
                ? searchMatch.hasConflict
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {searchMatch.count > 0 ? (
                searchMatch.hasConflict ? (
                  <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                )
              ) : (
                <XCircle className="size-4 shrink-0 text-destructive" />
              )}
              <span className="font-semibold truncate">
                {searchMatch.count > 0
                  ? searchMatch.exact
                    ? `Found on masterlist: ${searchMatch.exact.canonicalName} (${searchMatch.exact.hasScheduleConflict ? "With Schedule Conflict" : "Regular"})`
                    : `Found ${searchMatch.count} matching student${searchMatch.count === 1 ? "" : "s"} on masterlist`
                  : `"${search}" not found on active masterlist`}
              </span>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("regular")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              filter === "regular"
                ? "bg-emerald-600 text-white"
                : "bg-secondary/60 text-muted-foreground hover:text-emerald-400"
            }`}
          >
            Regular ({regularCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("conflict")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              filter === "conflict"
                ? "bg-amber-600 text-white"
                : "bg-secondary/60 text-muted-foreground hover:text-amber-400"
            }`}
          >
            With Conflict ({conflictCount})
          </button>
        </div>
      </div>

      {/* Student list */}
      {filtered.length ? (
        <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-border/50 rounded-xl border border-border/60 bg-card/50">
          {filtered.map((student, idx) => (
            <div
              key={`${student.canonicalName}-${idx}`}
              className="flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-muted-foreground w-6 text-right shrink-0">
                  #{idx + 1}
                </span>
                <span className="font-semibold text-foreground truncate">
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
                {student.hasScheduleConflict ? "⚠️ Conflict" : "✓ Regular"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground py-2 text-center">
          {students.length === 0 ? "No active students enrolled in this subject." : "No students match your filter."}
        </p>
      )}

      <p className="mt-2.5 text-[10px] text-muted-foreground/80 italic">
        Safe public view: only enrolled active student names and schedule conflict statuses are shown. Private student records and contact details are strictly withheld.
      </p>
    </ReaderSection>
  );
}

function PublicAttendanceList({ items }: { items: Array<{ publicId: string; startsAt: Date }> }) {
  return (
    <ReaderSection icon={BookOpen} title="Attendance">
      <p className="text-xs text-muted-foreground">Published class session records.</p>
      {items.length ? (
        <div className="mt-3 divide-y divide-border/60">
          {items.map(item => (
            <Link key={item.publicId} href={`/attendance/${item.publicId}`} className="signal-action flex min-h-11 items-center justify-between py-2.5 text-xs sm:text-sm font-semibold hover:text-primary transition-colors">
              {new Date(item.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", weekday: "short" })}
              <span className="text-muted-foreground group-hover:text-primary">→</span>
            </Link>
          ))}
        </div>
      ) : <p className="mt-2 text-xs text-muted-foreground">No records published yet.</p>}
    </ReaderSection>
  );
}
function PublicResourceCards({ items }: { items: Array<{ publicId: string; title: string; description: string; category: string; resourceType: string; sourceDomain: string; thumbnail: { url: string; altText: string | null } | null }> }) {
  return (
    <ReaderSection icon={BookOpen} title="Resources" className="sm:col-span-2">
      {items.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map(item => (
            <Link key={item.publicId} href={`/r/${item.publicId}`} className="group overflow-hidden rounded-xl border border-border/80 bg-card hover:border-primary/40 shadow-sm hover:shadow-md transition-all">
              {item.thumbnail
                ? <img src={item.thumbnail.url} alt={item.thumbnail.altText ?? ""} className="aspect-[16/8] w-full object-cover" />
                : <div className="flex aspect-[16/8] items-end p-3.5 bg-secondary/40"><span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-bold">{item.resourceType}</span></div>
              }
              <div className="p-3.5">
                <p className="text-xs sm:text-sm font-bold group-hover:text-primary transition-colors">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                <p className="mt-2 text-[10px] text-muted-foreground font-medium">{item.category} · {item.sourceDomain}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : <p className="mt-2 text-xs text-muted-foreground">No resources shared yet.</p>}
    </ReaderSection>
  );
}
function PublicList({ icon, title, items, pathPrefix, empty, allHref }: { icon: typeof BookOpen; title: string; items: Array<{ publicId: string; title: string }>; pathPrefix: string; empty: string; allHref?: string }) {
  return (
    <ReaderSection icon={icon} title={title}>
      {items.length ? (
        <div className="mt-3 divide-y divide-border/60">
          {items.map(item => (
            <Link key={item.publicId} href={`${pathPrefix}${item.publicId}`} className="signal-action flex min-h-11 items-center justify-between py-2.5 text-xs sm:text-sm font-semibold hover:text-primary transition-colors">
              {item.title} <span className="text-muted-foreground">→</span>
            </Link>
          ))}
        </div>
      ) : <p className="mt-2 text-xs text-muted-foreground">{empty}</p>}
      {allHref ? <Link href={allHref} className="signal-action mt-3 inline-flex min-h-9 items-center text-xs font-bold text-primary hover:underline">Browse all →</Link> : null}
    </ReaderSection>
  );
}
function ReaderSection({ icon: Icon, title, children, className = "" }: { icon: typeof BookOpen; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`signal-panel p-4 sm:p-5 rounded-2xl shadow-sm ${className}`}>
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

