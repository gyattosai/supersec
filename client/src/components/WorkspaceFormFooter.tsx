import type { ReactNode } from "react";

export function WorkspaceFormFooter({ note, children }: { note: string; children: ReactNode }) {
  return (
    <div className="mt-5 pt-1">
      <p className="text-xs leading-5 text-muted-foreground">{note}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
