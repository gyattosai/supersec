import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type WorkspacePageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  back?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function WorkspacePageHeader({ eyebrow, title, description, back, action, className }: WorkspacePageHeaderProps) {
  const showEyebrow = Boolean(eyebrow && eyebrow.trim().toLocaleLowerCase() !== title.trim().toLocaleLowerCase());
  return (
    <header className={cn("pb-3 sm:pb-4", className)}>
      {back ? <div className="mb-5">{back}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          {showEyebrow ? <p className="signal-kicker">{eyebrow}</p> : null}
          <h1 className={cn("signal-title", showEyebrow ? "mt-3" : "mt-0")}>{title}</h1>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
