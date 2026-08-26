import { cn } from "@/lib/utils";
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
    <header className={cn("linear-row pb-6", className)}>
      {back ? <div className="mb-4">{back}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          <p className="linear-label text-primary">{eyebrow}</p>
          <h1 className="linear-title mt-3">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
