import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation } from "wouter";

type PublicSubjectIdentity = { publicId: string; viewOnlyShortMark?: string | null; viewOnlyName?: string | null };

export function resolveViewOnlyIdentity(subject?: PublicSubjectIdentity | null) {
  return {
    shortMark: subject?.viewOnlyShortMark?.trim() || "SS",
    fullName: subject?.viewOnlyName?.trim() || "supersec",
    subjectHome: subject?.publicId ? `/s/${subject.publicId}` : "/",
  };
}

function routeParts(location: string) {
  const subjectMatch = location.match(/^\/s\/([^/]+)/);
  const attendanceMatch = location.match(/^\/attendance\/([^/]+)/);
  const itemMatch = location.match(/^\/(a|r|q)\/([^/]+)/);
  const kind = itemMatch?.[1] === "a" ? "announcement" as const : itemMatch?.[1] === "r" ? "resource" as const : itemMatch?.[1] === "q" ? "question" as const : null;
  return { subjectId: subjectMatch?.[1] ?? "", attendanceId: attendanceMatch?.[1] ?? "", itemId: itemMatch?.[2] ?? "", kind };
}

export function ViewOnlyHeader({ subject }: { subject?: PublicSubjectIdentity | null }) {
  return subject ? <ViewOnlyHeaderSurface subject={subject} /> : <RouteAwareViewOnlyHeader />;
}

function RouteAwareViewOnlyHeader() {
  const [location] = useLocation();
  const route = useMemo(() => routeParts(location), [location]);
  const subjectQuery = trpc.foundation.publicSubject.useQuery({ publicId: route.subjectId }, { enabled: Boolean(route.subjectId) });
  const attendanceQuery = trpc.foundation.publicAttendance.useQuery({ publicId: route.attendanceId }, { enabled: Boolean(route.attendanceId) });
  const itemQuery = trpc.foundation.publicItem.useQuery({ kind: route.kind ?? "announcement", publicId: route.itemId }, { enabled: Boolean(route.kind && route.itemId) });
  const subject = subjectQuery.data?.available
    ? subjectQuery.data.subject
    : attendanceQuery.data?.available
      ? attendanceQuery.data.attendance.subject
      : itemQuery.data?.available
        ? itemQuery.data.item.subject
        : null;
  return <ViewOnlyHeaderSurface subject={subject} />;
}

function ViewOnlyHeaderSurface({ subject }: { subject?: PublicSubjectIdentity | null }) {
  const identity = resolveViewOnlyIdentity(subject);

  return <header className="signal-header-surface mb-6 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2 sm:px-4"><Link href={identity.subjectHome} aria-label={`${identity.fullName} shared Subject home`} className="signal-action inline-flex min-w-0 items-center gap-2 text-sm font-bold tracking-[-0.03em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary px-1 text-center text-[10px] font-extrabold leading-none text-primary-foreground">{identity.shortMark}</span><span className="truncate">{identity.fullName}</span></Link><div className="flex shrink-0 items-center gap-2"><span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 text-[11px] font-semibold tracking-wide text-primary"><ShieldCheck className="size-3.5" />VIEW ONLY</span><ThemeToggle /></div></header>;
}
