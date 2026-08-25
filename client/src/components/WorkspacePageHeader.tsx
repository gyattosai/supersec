import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

type WorkspacePageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  back?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function WorkspacePageHeader({ eyebrow, title, description, back, action, className }: WorkspacePageHeaderProps) {
  return (
    <header className={cn("relative overflow-hidden rounded-[28px] bg-card/45 p-5 ring-1 ring-border/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7", className)}>
      {back ? <div className="mb-5">{back}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
