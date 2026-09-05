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
      {back ? <div className="mb-4 sm:mb-5">{back}</div> : null}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 max-w-3xl flex-1">
          {showEyebrow ? (
            <p className="signal-kicker mb-2 sm:mb-3">{label}</p>
          ) : null}
          <h1 className="signal-heading text-xl sm:text-2xl md:text-3xl font-extrabold tracking-[-0.05em] break-words">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-2xl break-words">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 shrink-0 pt-1">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
