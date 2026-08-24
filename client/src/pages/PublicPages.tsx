import { BookOpen, CalendarDays, CircleAlert, ExternalLink, MessageCircleMore } from "lucide-react";
import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function PublicSubjectPage() {
  const [, params] = useRoute("/s/:publicId");
  const input = useMemo(() => ({ publicId: params?.publicId ?? "" }), [params?.publicId]);
  const subject = trpc.foundation.publicSubject.useQuery(input, { enabled: Boolean(input.publicId) });

  if (subject.isLoading) return <PublicShell><p className="text-sm text-muted-foreground">Loading Subject…</p></PublicShell>;
  if (!subject.data?.available) return <PublicUnavailable />;

  const details = subject.data.subject;
  return (
    <PublicShell>
      <p className="text-sm font-semibold text-primary">{details.code}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">{details.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Professor {details.professorName}</p>
      <section className="mt-7 rounded-[28px] border border-border bg-card p-5">
        <div className="flex gap-3"><CalendarDays className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Schedule</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{details.meetingDays.length ? details.meetingDays.map(day => `${dayNames[day.weekday]}${day.startTime ? ` · ${day.startTime}` : ""}`).join(" · ") : "Schedule will be shared soon."}</p></div></div>
      </section>
      {details.noClass ? <section className="mt-4 rounded-[24px] border border-amber-400/30 bg-amber-400/10 p-5"><div className="flex gap-3"><CircleAlert className="mt-0.5 h-5 w-5 text-amber-300" /><div><h2 className="font-semibold">No Class</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{new Date(details.noClass.startsAt).toLocaleDateString()} — {details.noClass.reason}</p></div></div></section> : null}
      <section className="mt-7 grid gap-3 sm:grid-cols-2">
        <PublicLink icon={BookOpen} title="Attendance" body="Published class-session Attendance will appear here." />
        <PublicList icon={MessageCircleMore} title="Questions & Answers" items={details.latest.questions} pathPrefix="/q/" empty="Shared answers will appear here." />
        <PublicList icon={ExternalLink} title="Announcements" items={details.latest.announcements} pathPrefix="/a/" empty="Official updates will appear here." />
        <PublicList icon={ExternalLink} title="Resources" items={details.latest.resources} pathPrefix="/r/" empty="Class links and materials will appear here." />
      </section>
    </PublicShell>
  );
}

export function PublicUnavailable() {
  return <PublicShell><section className="rounded-[28px] border border-border bg-card p-7 text-center"><CircleAlert className="mx-auto h-6 w-6 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">This page is not available</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">The link may be incomplete, unpublished, or no longer shared.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Go to Home</Link></section></PublicShell>;
}

export function PublicAnnouncementPage() { const [, params] = useRoute("/a/:publicId"); return <PublicContentPage kind="announcement" publicId={params?.publicId ?? ""} label="Announcement" />; }
export function PublicResourcePage() { const [, params] = useRoute("/r/:publicId"); return <PublicContentPage kind="resource" publicId={params?.publicId ?? ""} label="Resource" />; }
export function PublicQuestionPage() { const [, params] = useRoute("/q/:publicId"); return <PublicContentPage kind="question" publicId={params?.publicId ?? ""} label="Question & Answer" />; }

function PublicContentPage({ kind, publicId, label }: { kind: "announcement" | "resource" | "question"; publicId: string; label: string }) {
  const input = useMemo(() => ({ kind, publicId }), [kind, publicId]);
  const item = trpc.foundation.publicItem.useQuery(input, { enabled: Boolean(input.publicId) });
  if (item.isLoading) return <PublicShell><p className="text-sm text-muted-foreground">Loading {label}…</p></PublicShell>;
  if (!item.data?.available) return <PublicUnavailable />;
  const details = item.data.item;
  return <PublicShell><Link href={`/s/${details.subject.publicId}`} className="text-sm font-semibold text-primary">{details.subject.code} · {details.subject.name}</Link><article className="mt-5 rounded-[28px] border border-border bg-card p-6"><p className="text-sm font-semibold text-primary">{label} · Version {details.version}</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">{details.title}</h1>{details.kind === "resource" && details.category ? <p className="mt-3 text-sm text-muted-foreground">{details.category}{details.sourceDomain ? ` · ${details.sourceDomain}` : ""}</p> : null}<div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-foreground/90">{details.body}</div>{details.kind === "resource" && details.destinationUrl ? <a href={details.destinationUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><ExternalLink className="h-4 w-4" />Open Resource</a> : null}<p className="mt-7 text-xs text-muted-foreground">Published by the class secretary{details.publishedAt ? ` · ${new Date(details.publishedAt).toLocaleDateString()}` : ""}</p></article></PublicShell>;
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8"><div className="mx-auto max-w-2xl"><Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground">Class Management</Link>{children}</div></main>;
}

function PublicLink({ icon: Icon, title, body }: { icon: typeof BookOpen; title: string; body: string }) {
  return <section className="rounded-[24px] border border-border bg-card p-5"><Icon className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></section>;
}

function PublicList({ icon: Icon, title, items, pathPrefix, empty }: { icon: typeof BookOpen; title: string; items: Array<{ publicId: string; title: string }>; pathPrefix: string; empty: string }) {
  return <section className="rounded-[24px] border border-border bg-card p-5"><Icon className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">{title}</h2>{items.length ? <div className="mt-3 space-y-2">{items.map(item => <Link key={item.publicId} href={`${pathPrefix}${item.publicId}`} className="block rounded-xl bg-secondary px-3 py-2 text-sm font-medium hover:text-primary">{item.title}</Link>)}</div> : <p className="mt-1 text-sm leading-6 text-muted-foreground">{empty}</p>}</section>;
}
