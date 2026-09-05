import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type WorkspacePageHeaderProps = {
  eyebrow?: string;
  kicker?: string;
  title: string;
  description?: string;
  back?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function WorkspacePageHeader({ eyebrow, kicker, title, description, back, action, className }: WorkspacePageHeaderProps) {
  const label = kicker ?? eyebrow;
  const showEyebrow = Boolean(label && label.trim().toLocaleLowerCase() !== title.trim().toLocaleLowerCase());
  return (
    <header className={cn("pb-3 sm:pb-5", className)}>
      {back ? <div className="mb-5">{back}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {showEyebrow ? (
            <p className="signal-kicker mb-3">{label}</p>
          ) : null}
          <h1 className="signal-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.05em]">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-2xl">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1">{action}</div>
        ) : null}
      </div>
    </header>
  );
}
