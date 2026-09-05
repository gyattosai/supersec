import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type WorkspacePageHeaderProps = {
  eyebrow?: string;
  kicker?: string;
  title: string;
  description?: ReactNode;
  back?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function WorkspacePageHeader({
  eyebrow,
  kicker,
  title,
  description,
  back,
  action,
  children,
  className,
}: WorkspacePageHeaderProps) {
  const label = kicker ?? eyebrow;
  const showEyebrow = Boolean(label && label.trim().toLocaleLowerCase() !== title.trim().toLocaleLowerCase());
  return (
    <header className={cn("pb-3 sm:pb-5", className)}>
      {back ? <div className="mb-4 sm:mb-5">{back}</div> : null}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 w-full">
        <div className="min-w-fit shrink-0">
          {showEyebrow ? (
            <p className="signal-kicker mb-2 sm:mb-3">{label}</p>
          ) : null}
          <h1 className="signal-heading block text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            {title}
          </h1>
          {description ? (
            <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-2xl">
              {description}
            </div>
          ) : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
        {action ? (
          <div className="w-full lg:w-auto flex flex-wrap items-center gap-2 lg:justify-end pt-1">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
