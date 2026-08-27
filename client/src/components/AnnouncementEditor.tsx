import { Textarea } from "@/components/ui/textarea";
import { AiTextAssist } from "@/components/AiTextAssist";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import * as React from "react";

type AnnouncementEditorProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  minHeightClassName?: string;
  aiTarget?: "student_note" | "announcement" | "resource_description" | "question_answer" | "excuse_reason";
  aiContext?: string;
};

export function AnnouncementEditor({ value, onChange, required, id = "announcement-body", label = "Announcement content", placeholder = "Write the announcement", helperText = "Use formatting for headings, lists, quotes, and links.", minHeightClassName = "min-h-56", aiTarget, aiContext }: AnnouncementEditorProps) {
  const editorRef = React.useRef<HTMLTextAreaElement>(null);
  const resolvedAiTarget = aiTarget ?? (label === "Private Student note" ? "student_note" : undefined);

  const placeSelection = (start: number, selectionLength: number) => {
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(start, start + selectionLength);
    });
  };

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const element = editorRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const selected = value.slice(start, element.selectionEnd) || "text";
    onChange(`${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(element.selectionEnd)}`);
    placeSelection(start + prefix.length, selected.length);
  };

  const prefixCurrentLine = (prefix: string) => {
    const element = editorRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    onChange(`${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`);
    placeSelection(start + prefix.length, 0);
  };

  const tool = (label: string, action: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={action}
      className="grid min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="signal-editor-shell mt-3 overflow-hidden rounded-2xl border border-input shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/25 p-2">
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label={`${label} formatting`}>
        {tool("Bold", () => wrapSelection("**"), <Bold className="h-4 w-4" />)}
        {tool("Italic", () => wrapSelection("*"), <Italic className="h-4 w-4" />)}
        {tool("Heading", () => prefixCurrentLine("## "), <Heading2 className="h-4 w-4" />)}
        {tool("Bullet list", () => prefixCurrentLine("- "), <List className="h-4 w-4" />)}
        {tool("Numbered list", () => prefixCurrentLine("1. "), <ListOrdered className="h-4 w-4" />)}
        {tool("Quote", () => prefixCurrentLine("> "), <Quote className="h-4 w-4" />)}
        {tool("Link", () => wrapSelection("[", "](https://)"), <Link2 className="h-4 w-4" />)}
      </div>
      {resolvedAiTarget ? <AiTextAssist value={value} onApply={onChange} target={resolvedAiTarget} context={aiContext} /> : null}
      </div>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Textarea
        ref={editorRef}
        id={id}
        required={required}
        className={`${minHeightClassName} rounded-none border-0 bg-transparent px-4 py-4 leading-7 shadow-none focus-visible:ring-0`}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <p className="border-t border-border/70 px-4 py-3 text-xs leading-5 text-muted-foreground">{helperText}</p>
    </div>
  );
}
