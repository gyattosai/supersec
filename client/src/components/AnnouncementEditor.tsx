import { Textarea } from "@/components/ui/textarea";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import * as React from "react";

type AnnouncementEditorProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function AnnouncementEditor({ value, onChange, required }: AnnouncementEditorProps) {
  const editorRef = React.useRef<HTMLTextAreaElement>(null);

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
    <div className="mt-3 overflow-hidden rounded-2xl border border-input bg-background">
      <div className="flex flex-wrap gap-1 border-b border-border p-2" role="toolbar" aria-label="Announcement formatting">
        {tool("Bold", () => wrapSelection("**"), <Bold className="h-4 w-4" />)}
        {tool("Italic", () => wrapSelection("*"), <Italic className="h-4 w-4" />)}
        {tool("Heading", () => prefixCurrentLine("## "), <Heading2 className="h-4 w-4" />)}
        {tool("Bullet list", () => prefixCurrentLine("- "), <List className="h-4 w-4" />)}
        {tool("Numbered list", () => prefixCurrentLine("1. "), <ListOrdered className="h-4 w-4" />)}
        {tool("Quote", () => prefixCurrentLine("> "), <Quote className="h-4 w-4" />)}
        {tool("Link", () => wrapSelection("[", "](https://)"), <Link2 className="h-4 w-4" />)}
      </div>
      <label htmlFor="announcement-body" className="sr-only">Announcement content</label>
      <Textarea
        ref={editorRef}
        id="announcement-body"
        required={required}
        className="min-h-56 rounded-none border-0 shadow-none focus-visible:ring-0"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Write the announcement"
      />
      <p className="px-3 pb-3 text-xs leading-5 text-muted-foreground">Use the formatting controls for headings, emphasis, lists, quotes, and links. The shared page renders these safely and does not accept raw HTML.</p>
    </div>
  );
}
