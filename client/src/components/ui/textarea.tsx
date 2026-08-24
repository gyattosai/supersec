import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import * as React from "react";

function Textarea({
  className,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"textarea">) {
  const editorRef = React.useRef<HTMLTextAreaElement>(null);
  const richAnnouncement = props.placeholder === "Write the announcement";
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLTextAreaElement>({
    onKeyDown: (e) => {
      // Check if this is an Enter key that should be blocked
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      // Note: For textarea, Shift+Enter should still work for newlines
      if (e.key === "Enter" && !e.shiftKey && isComposing) {
        return;
      }

      // Otherwise, call the user's onKeyDown
      onKeyDown?.(e);
    },
    onCompositionStart: e => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: e => {
      // Mark that composition just ended - this helps handle the Enter key that confirms input
      dialogComposition.markCompositionEnd();
      // Delay setting composing to false to handle Safari's event order
      // In Safari, compositionEnd fires before the ESC keydown event
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  const textarea = (
    <textarea
      ref={editorRef}
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
  if (props.placeholder === "Official answer") return <div className="space-y-3"><>{textarea}</><div className="rounded-xl border border-border bg-secondary/40 p-3"><label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium"><input name="questionOfficial" type="checkbox" value="true" defaultChecked className="h-4 w-4 rounded border-input accent-primary" />Mark as an official answer</label><input name="questionChangeSummary" className="mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Public change summary when saving an edit" /></div></div>;
  if (!richAnnouncement) return textarea;
  const format = (prefix: string, suffix = prefix) => {
    const element = editorRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = element.value.slice(start, end) || "text";
    const next = `${element.value.slice(0, start)}${prefix}${selected}${suffix}${element.value.slice(end)}`;
    props.onChange?.({ target: { ...element, value: next }, currentTarget: { ...element, value: next } } as React.ChangeEvent<HTMLTextAreaElement>);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + prefix.length, start + prefix.length + selected.length); });
  };
  const prefixLine = (prefix: string) => {
    const element = editorRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const lineStart = element.value.lastIndexOf("\n", start - 1) + 1;
    const next = `${element.value.slice(0, lineStart)}${prefix}${element.value.slice(lineStart)}`;
    props.onChange?.({ target: { ...element, value: next }, currentTarget: { ...element, value: next } } as React.ChangeEvent<HTMLTextAreaElement>);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + prefix.length, start + prefix.length); });
  };
  const tool = (label: string, action: () => void, icon: React.ReactNode) => <button type="button" onClick={action} className="grid min-h-9 min-w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={label} title={label}>{icon}</button>;
  return <div className="mt-3 overflow-hidden rounded-2xl border border-input bg-background"><div className="flex flex-wrap gap-1 border-b border-border p-2" role="toolbar" aria-label="Announcement formatting">{tool("Bold", () => format("**"), <Bold className="h-4 w-4" />)}{tool("Italic", () => format("*"), <Italic className="h-4 w-4" />)}{tool("Heading", () => prefixLine("## "), <Heading2 className="h-4 w-4" />)}{tool("Bullet list", () => prefixLine("- "), <List className="h-4 w-4" />)}{tool("Numbered list", () => prefixLine("1. "), <ListOrdered className="h-4 w-4" />)}{tool("Quote", () => prefixLine("> "), <Quote className="h-4 w-4" />)}{tool("Link", () => format("[", "](https://)"), <Link2 className="h-4 w-4" />)}</div>{textarea}<p className="px-3 pb-3 text-xs leading-5 text-muted-foreground">Use the formatting controls for readable Markdown-style content.</p></div>;
}

export { Textarea };
