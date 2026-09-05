import type { ReactNode } from "react";
import { CheckSquare, Square } from "lucide-react";

export function AnnouncementPreview({ body }: { body: string }) {
  if (!body) return null;

  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={index} className="mt-8 mb-4 text-2xl sm:text-3xl font-black leading-tight tracking-tight first:mt-0 text-foreground">
          <InlineMarkdown text={line.slice(2)} />
        </h1>
      );
      index += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={index} className="mt-7 mb-3 text-xl sm:text-2xl font-bold leading-tight tracking-tight first:mt-0 text-foreground">
          <InlineMarkdown text={line.slice(3)} />
        </h2>
      );
      index += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={index} className="mt-6 mb-2 text-lg sm:text-xl font-bold leading-tight tracking-tight first:mt-0 text-foreground">
          <InlineMarkdown text={line.slice(4)} />
        </h3>
      );
      index += 1;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      blocks.push(<hr key={index} className="my-6 border-border/80" />);
      index += 1;
      continue;
    }

    // Fenced code blocks
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <div key={`code-${index}`} className="my-5 rounded-xl border border-border bg-secondary/70 overflow-hidden">
          {lang ? (
            <div className="border-b border-border/60 bg-secondary/50 px-3 py-1 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
              {lang}
            </div>
          ) : null}
          <pre className="p-4 overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed text-foreground">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      index += 1; // Skip closing ```
      continue;
    }

    // Blockquote
    if (line.startsWith("> ") || line === ">") {
      const quoteLines: string[] = [];
      while (index < lines.length && (lines[index].startsWith("> ") || lines[index] === ">")) {
        quoteLines.push(lines[index].startsWith("> ") ? lines[index].slice(2) : "");
        index += 1;
      }
      blocks.push(
        <blockquote
          key={index}
          className="my-5 border-l-4 border-primary/40 bg-secondary/20 py-2.5 px-4 rounded-r-xl italic text-muted-foreground text-sm sm:text-base leading-relaxed"
        >
          {quoteLines.map((q, qIdx) => (
            <p key={qIdx} className={qIdx > 0 ? "mt-1.5" : ""}>
              <InlineMarkdown text={q} />
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Task Checklist (- [ ] or - [x])
    if (/^-\s*\[([ xX])\]/.test(line.trim())) {
      const taskItems: { checked: boolean; text: string }[] = [];
      while (index < lines.length && /^-\s*\[([ xX])\]/.test(lines[index].trim())) {
        const match = lines[index].trim().match(/^-\s*\[([ xX])\]\s*(.*)$/);
        if (match) {
          taskItems.push({
            checked: match[1].toLowerCase() === "x",
            text: match[2],
          });
        }
        index += 1;
      }
      blocks.push(
        <ul key={`task-${index}`} className="my-4 space-y-2">
          {taskItems.map((item, tIdx) => (
            <li key={tIdx} className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/90">
              {item.checked ? (
                <CheckSquare className="size-4.5 mt-0.5 text-primary shrink-0" />
              ) : (
                <Square className="size-4.5 mt-0.5 text-muted-foreground shrink-0" />
              )}
              <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                <InlineMarkdown text={item.text} />
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Unordered list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const entries: string[] = [];
      while (index < lines.length && (lines[index].startsWith("- ") || lines[index].startsWith("* "))) {
        entries.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="my-4 ml-6 list-disc space-y-1.5 text-sm sm:text-base text-foreground/90">
          <ListItems entries={entries} />
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const entries: string[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        entries.push(lines[index].replace(/^\d+\.\s/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="my-4 ml-6 list-decimal space-y-1.5 text-sm sm:text-base text-foreground/90">
          <ListItems entries={entries} />
        </ol>
      );
      continue;
    }

    // Paragraph
    blocks.push(
      <p key={index} className="mb-4 text-sm sm:text-base leading-relaxed text-foreground/90 last:mb-0">
        <InlineMarkdown text={line} />
      </p>
    );
    index += 1;
  }

  return <div className="w-full max-w-none break-words [overflow-wrap:anywhere]">{blocks}</div>;
}

function ListItems({ entries }: { entries: string[] }) {
  return (
    <>
      {entries.map((entry, idx) => (
        <li key={idx} className="leading-relaxed">
          <InlineMarkdown text={entry} />
        </li>
      ))}
    </>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(
    /(`[^`]+`|!\[[^\]]*\]\((?:https?:\/\/[^\s)]+|\/[^\s)]+)\)|\[[^\]]+\]\((?:https?:\/\/[^\s)]+|\/[^\s)]+)\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~|<u>[^<]+<\/u>|<ins>[^<]+<\/ins>)/g
  );

  return (
    <>
      {parts.filter(Boolean).map((part, index) => {
        // Inline code
        const code = part.match(/^`([^`]+)`$/);
        if (code) return <code key={index} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs sm:text-sm text-foreground">{code[1]}</code>;

        // Image
        const img = part.match(/^!\[([^\]]*)\]\(((?:https?:\/\/[^\s)]+|\/[^\s)]+))\)$/);
        if (img) return <img key={index} src={img[2]} alt={img[1]} className="my-3 rounded-xl border border-border max-h-96 object-contain" />;

        // Link
        const link = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/[^\s)]+|\/[^\s)]+))\)$/);
        if (link) return (
          <a
            key={index}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline underline-offset-4 decoration-primary/50 transition-colors hover:text-primary/80"
          >
            {link[1]}
          </a>
        );

        // Bold
        const bold = part.match(/^\*\*([^*]+)\*\*$/) || part.match(/^__([^_]+)__$/);
        if (bold) return <strong key={index}>{bold[1]}</strong>;

        // Italic
        const italic = part.match(/^\*([^*]+)\*$/) || part.match(/^_([^_]+)_$/);
        if (italic) return <em key={index}>{italic[1]}</em>;

        // Strikethrough
        const strike = part.match(/^~~([^~]+)~~$/);
        if (strike) return <del key={index} className="line-through text-muted-foreground">{strike[1]}</del>;

        // Underline
        const underline = part.match(/^<u>([^<]+)<\/u>$/i) || part.match(/^<ins>([^<]+)<\/ins>$/i);
        if (underline) return <u key={index} className="underline underline-offset-4">{underline[1]}</u>;

        return part;
      })}
    </>
  );
}
