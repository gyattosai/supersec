import { WysiwygEditor } from "./WysiwygEditor";
import { AiTextAssist, type AiTextTarget } from "./AiTextAssist";
import * as React from "react";

export type AnnouncementEditorProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  minHeightClassName?: string;
  aiTarget?: AiTextTarget;
  aiContext?: string;
  disabled?: boolean;
};

export function AnnouncementEditor({
  value,
  onChange,
  required,
  id,
  label = "Announcement content",
  placeholder = "Write with rich text formatting (supports headings, bold, lists, links, quotes, and code)...",
  helperText = "Use headings, lists, quotes, and links to make content easy to scan.",
  minHeightClassName = "min-h-56",
  aiTarget,
  aiContext,
  disabled = false,
}: AnnouncementEditorProps) {
  const resolvedAiTarget = aiTarget ?? (label === "Private Student note" ? "student_note" : undefined);

  return (
    <div className="mt-3">
      {label && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <label htmlFor={id} className="text-sm font-bold text-foreground">
            {label} {required ? <span className="text-primary">*</span> : null}
          </label>
        </div>
      )}
      <WysiwygEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeightClassName={minHeightClassName}
        id={id}
        disabled={disabled}
        aiTarget={resolvedAiTarget}
        aiContext={aiContext}
      />
      {helperText && (
        <p className="mt-2 px-1 text-xs leading-5 text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
