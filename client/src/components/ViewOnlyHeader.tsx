import { SimpleThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { Lock } from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation } from "wouter";

type PublicSubjectIdentity = { publicId: string; viewOnlyShortMark?: string | null; viewOnlyName?: string | null; code?: string };

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

  return (
    <header className="glass-header sticky top-0 z-40 mb-6 flex min-h-14 items-center justify-between gap-2.5 sm:gap-3 rounded-2xl border border-border/70 px-3 py-2 sm:px-5 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
      {/* Brand lockup */}
      <Link
        href={identity.subjectHome}
        aria-label={`${identity.fullName} shared Subject home`}
        className="signal-action inline-flex min-w-0 items-center gap-2 sm:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-primary text-[10px] font-extrabold leading-none text-primary-foreground shadow-sm shadow-primary/30">
          {identity.shortMark}
        </span>
        <span className="flex flex-col leading-none min-w-0 max-w-[130px] xs:max-w-[190px] sm:max-w-[340px] md:max-w-[500px]">
          <span className="truncate text-[11px] font-extrabold tracking-[-0.02em] text-foreground" title={identity.fullName}>
            {identity.fullName}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-muted-foreground">supersec</span>
        </span>
      </Link>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {subject?.code ? (
          <span className="hidden min-h-8 items-center rounded-full bg-primary/10 px-3 text-[11px] font-bold text-primary sm:inline-flex">
            {subject.code}
          </span>
        ) : null}
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 text-[11px] font-semibold text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          <span className="hidden xs:inline">View only</span>
        </span>
        <SimpleThemeToggle />
      </div>
    </header>
  );
}
