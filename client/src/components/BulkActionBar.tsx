import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  allSelected: boolean;
  children: React.ReactNode;
  noun?: string;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  allSelected,
  children,
  noun = "item",
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-lg lg:left-72 shadow-xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => (allSelected ? onDeselectAll() : onSelectAll())}
              aria-label={allSelected ? "Deselect all" : "Select all"}
            />
            <span className="text-sm font-semibold">
              {selectedCount} of {totalCount} {totalCount === 1 ? noun : `${noun}s`} selected
            </span>
          </div>
          <button
            type="button"
            onClick={onDeselectAll}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function BulkCheckbox({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className="size-4"
      />
    </div>
  );
}
