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
    <header className={cn("apple-surface rounded-[28px] p-5 sm:p-7", className)}>
      {back ? <div className="mb-5">{back}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</Badge>
          <h1 className="apple-title mt-3 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
