import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type RecordStatusTone = "published" | "draft" | "archived" | "private" | "attention" | "confirmed" | "official" | "conflict";

const toneClass: Record<RecordStatusTone, string> = {
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 dark:text-emerald-300",
  draft: "border-border bg-secondary/70 text-muted-foreground",
  archived: "border-border bg-secondary/50 text-muted-foreground",
  private: "border-border bg-secondary/70 text-muted-foreground",
  attention: "border-amber-500/35 bg-amber-500/10 text-amber-500 dark:text-amber-300",
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 dark:text-emerald-300",
  official: "border-primary/40 bg-primary/10 text-primary",
  conflict: "border-purple-500/35 bg-purple-500/10 text-purple-400 dark:text-purple-300",
};

const dotClass: Record<RecordStatusTone, string> = {
  published: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  draft: "bg-muted-foreground/60",
  archived: "bg-muted-foreground/40",
  private: "bg-muted-foreground/60",
  attention: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
  confirmed: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  official: "bg-primary shadow-[0_0_8px_rgba(201,80,0,0.6)]",
  conflict: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]",
};

export function RecordStatusBadge({ tone, children, className }: { tone: RecordStatusTone; children: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn("inline-flex items-center gap-1.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight leading-none", toneClass[tone], className)}>
      <span className={cn("size-1.5 rounded-full shrink-0", dotClass[tone])} aria-hidden="true" />
      <span>{children}</span>
    </Badge>
  );
}
