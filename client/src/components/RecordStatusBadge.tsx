import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type RecordStatusTone = "published" | "draft" | "archived" | "private" | "attention" | "confirmed" | "official";

const toneClass: Record<RecordStatusTone, string> = {
  published: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  draft: "border-border bg-secondary text-muted-foreground",
  archived: "border-border bg-secondary/60 text-muted-foreground",
  private: "border-border bg-secondary text-muted-foreground",
  attention: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  confirmed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  official: "border-primary/30 bg-primary/10 text-primary",
};

export function RecordStatusBadge({ tone, children, className }: { tone: RecordStatusTone; children: ReactNode; className?: string }) {
  return <Badge variant="outline" className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none", toneClass[tone], className)}>{children}</Badge>;
}
