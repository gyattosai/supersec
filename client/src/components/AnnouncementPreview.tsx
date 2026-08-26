import type { ReactNode } from "react";

export function AnnouncementPreview({ body }: { body: string }) {
  const lines = body.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith("## ")) { blocks.push(<h2 key={index} className="mt-9 text-xl font-semibold leading-tight tracking-[-0.03em] first:mt-0"><InlineMarkdown text={line.slice(3)} /></h2>); index += 1; continue; }
    if (line.startsWith("> ")) { blocks.push(<blockquote key={index} className="my-6 rounded-r-xl border-l-2 border-primary bg-primary/5 py-3 pl-4 pr-3 text-sm italic leading-7 text-muted-foreground"><InlineMarkdown text={line.slice(2)} /></blockquote>); index += 1; continue; }
    if (line.startsWith("- ")) { const entries: string[] = []; while (index < lines.length && lines[index].startsWith("- ")) { entries.push(lines[index].slice(2)); index += 1; } blocks.push(<ul key={index} className="my-6 list-disc space-y-2.5 pl-5 text-sm leading-7 text-foreground/90 marker:text-primary">{entries.map((entry, entryIndex) => <li key={entryIndex} className="pl-1"><InlineMarkdown text={entry} /></li>)}</ul>); continue; }
    if (/^\d+\.\s/.test(line)) { const entries: string[] = []; while (index < lines.length && /^\d+\.\s/.test(lines[index])) { entries.push(lines[index].replace(/^\d+\.\s/, "")); index += 1; } blocks.push(<ol key={index} className="my-6 list-decimal space-y-2.5 pl-5 text-sm leading-7 text-foreground/90 marker:font-semibold marker:text-primary">{entries.map((entry, entryIndex) => <li key={entryIndex} className="pl-1"><InlineMarkdown text={entry} /></li>)}</ol>); continue; }
    blocks.push(<p key={index} className="mb-5 text-[0.9375rem] leading-7 text-foreground/90 last:mb-0"><InlineMarkdown text={line} /></p>); index += 1;
  }
  return <div className="max-w-prose">{blocks}</div>;
}

function InlineMarkdown({ text }: { text: string }) {
  return <>{text.split(/(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g).filter(Boolean).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/); if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="font-semibold text-primary underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary/80">{link[1]}</a>;
    const bold = part.match(/^\*\*([^*]+)\*\*$/); if (bold) return <strong key={index}>{bold[1]}</strong>;
    const italic = part.match(/^\*([^*]+)\*$/); if (italic) return <em key={index}>{italic[1]}</em>;
    return part;
  })}</>;
}
