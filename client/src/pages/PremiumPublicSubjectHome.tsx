import { Badge } from "@/components/ui/badge";
import { ViewOnlyHeader } from "@/components/ViewOnlyHeader";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  MessageCircleMore,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useRoute } from "wouter";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type ViewOnlySubject = { publicId: string; viewOnlyShortMark?: string | null; viewOnlyName?: string | null };

export function PremiumPublicSubjectHome() {
  const [, params] = useRoute("/s/:publicId");
  const input = useMemo(() => ({ publicId: params?.publicId ?? "" }), [params?.publicId]);
  const query = trpc.foundation.publicSubject.useQuery(input, { enabled: Boolean(input.publicId) });

  if (query.isLoading) return <PublicFrame><div className="signal-panel p-6 text-sm text-muted-foreground">Loading Subject…</div></PublicFrame>;
  if (!query.data?.available) return <PublicFrame><div className="signal-panel border-t-2 border-primary p-7 text-center"><CircleAlert className="mx-auto size-6 text-primary" /><h1 className="signal-heading mt-4">Subject unavailable</h1><p className="mt-2 text-sm text-muted-foreground">This link is not shared.</p></div></PublicFrame>;

  const { latest, ...subject } = query.data.subject;
  const schedule = subject.meetingDays.length
    ? subject.meetingDays.map(day => `${dayNames[day.weekday]}${day.startTime ? ` · ${day.startTime}${day.endTime ? `–${day.endTime}` : ""}` : ""}`).join(" · ")
    : "Schedule pending";

  return <PublicFrame subject={subject}>
    <article className="signal-card-shell">
      <div className="signal-record-card signal-hero-surface p-5 sm:p-7">
        <div className="flex flex-col gap-6">
          <div>
            <Badge className="rounded-full bg-primary px-3 py-1 text-primary-foreground">{subject.code}</Badge>
            <p className="signal-kicker mt-5">Shared Subject</p>
            <h1 className="signal-title mt-2 max-w-2xl">{subject.name}</h1>
            <p className="mt-3 text-sm font-semibold text-foreground/85">Professor {subject.professorName}</p>
          </div>
          <section className="signal-inset border-l-2 border-l-primary p-4">
            <div className="flex items-center gap-2 text-primary"><CalendarDays className="size-4" /><p className="signal-kicker">Class time</p></div>
            <p className="mt-3 text-sm leading-6 text-foreground/90">{schedule}</p>
          </section>
        </div>
      </div>
    </article>
    {subject.noClass ? <div className="signal-card-shell mt-4"><section className="signal-record-card border-l-2 border-l-amber-300 bg-amber-300/10 p-4"><div className="flex gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" /><div><p className="font-semibold">No Class · {new Date(subject.noClass.startsAt).toLocaleDateString()}</p><p className="mt-1 text-sm text-muted-foreground">{subject.noClass.reason}</p></div></div></section></div> : null}
    <section className="mt-6">
      <div><p className="signal-kicker">Class updates</p><h2 className="signal-heading mt-2">See what is shared.</h2></div>
      <div className="mt-5 space-y-3">
        <RecordList icon={ClipboardCheck} eyebrow="Attendance" title="Class Attendance" items={latest.attendance.map(item => ({ ...item, title: new Date(item.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) }))} hrefPrefix="/attendance/" empty="No Attendance published." />
        <RecordList icon={BellRing} eyebrow="Updates" title="Announcements" items={latest.announcements} hrefPrefix="/a/" empty="No announcements published." />
        <RecordList icon={BookOpen} eyebrow="Resources" title="Class resources" items={latest.resources} hrefPrefix="/r/" empty="No resources published." />
        <RecordList icon={MessageCircleMore} eyebrow="Answers" title="Questions & Answers" items={latest.questions} hrefPrefix="/q/" empty="No answers published." allHref={`/s/${subject.publicId}/questions`} />
      </div>
    </section>
  </PublicFrame>;
}

function RecordList({ icon: Icon, eyebrow, title, items, hrefPrefix, empty, allHref }: { icon: typeof BellRing; eyebrow: string; title: string; items: Array<{ publicId: string; title: string }>; hrefPrefix: string; empty: string; allHref?: string }) {
  return <div className="signal-card-shell"><section className="signal-record-card overflow-hidden"><div className="flex items-start gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-4" /></span><div className="min-w-0"><p className="signal-kicker">{eyebrow}</p><h2 className="signal-heading mt-2">{title}</h2></div></div>{items.length ? <div className="border-t border-border">{items.slice(0, 3).map(item => <Link key={item.publicId} href={`${hrefPrefix}${item.publicId}`} className="signal-action group flex min-h-14 items-center justify-between gap-3 border-b border-border px-5 last:border-b-0 hover:bg-secondary/70 sm:px-6"><span className="min-w-0 truncate text-sm font-semibold">{item.title}</span><ArrowRight className="size-4 shrink-0 text-primary" /></Link>)}</div> : <div className="px-5 pb-5 sm:px-6 sm:pb-6"><EmptySurface label={empty} /></div>}{allHref && items.length ? <div className="border-t border-border px-5 py-3 sm:px-6"><Link href={allHref} className="signal-action inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-primary hover:bg-primary/10">All answers <ArrowRight className="size-4" /></Link></div> : null}</section></div>;
}

function EmptySurface({ label }: { label: string }) { return <div className="signal-inset mt-4 px-4 py-4 text-sm text-muted-foreground">{label}</div>; }

function PublicFrame({ children, subject }: { children: React.ReactNode; subject?: ViewOnlySubject }) {
  return <main className="signal-canvas min-h-screen px-5 py-5 text-foreground sm:px-8 sm:py-9"><div className="mx-auto max-w-5xl"><ViewOnlyHeader subject={subject} /><div className="pb-8">{children}</div><footer className="mt-2 text-center text-xs text-muted-foreground">Shared class page</footer></div></main>;
}
