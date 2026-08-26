import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type WorkspacePageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  back?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function WorkspacePageHeader({ eyebrow, title, description, back, action, className }: WorkspacePageHeaderProps) {
  return (
    <header className={cn("border-b border-border pb-7", className)}>
      {back ? <div className="mb-5">{back}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <p className="signal-kicker">{eyebrow}</p>
          <h1 className="signal-title mt-3">{title}</h1>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
