import { AnnouncementPreview } from "@/components/AnnouncementPreview";
import { PublicResourceAttachments } from "@/components/PublicResourceAttachments";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ExternalLink, History } from "lucide-react";
import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { PublicShell, PublicUnavailable } from "./PublicPages";

export function PremiumPublicResourcePage() {
  const [, params] = useRoute("/r/:publicId");
  const input = useMemo(() => ({ kind: "resource" as const, publicId: params?.publicId ?? "" }), [params?.publicId]);
  const item = trpc.foundation.publicItem.useQuery(input, { enabled: Boolean(input.publicId) });
  const history = trpc.foundation.publicHistory.useQuery(input, { enabled: Boolean(input.publicId) && Boolean(item.data?.available) });
  if (item.isLoading) return <PublicShell><p className="text-sm text-muted-foreground">Loading Resource…</p></PublicShell>;
  if (!item.data?.available) return <PublicUnavailable />;

  const details = item.data.item;
  const visual = details.media ?? details.socialPreviewMedia;
  return <PublicShell><Link href={`/s/${details.subject.publicId}`} className="signal-action inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primary hover:bg-secondary hover:text-primary">{details.subject.code} · {details.subject.name}</Link><article className="signal-panel mt-4 overflow-hidden border-t-2 border-primary"><div className="p-5 sm:p-7"><div className="flex flex-wrap gap-2"><Badge variant="outline" className="rounded-full border-primary/30 text-primary">{details.category ?? "Resource"}</Badge>{details.sourceDomain ? <Badge variant="outline" className="rounded-full">{details.sourceDomain}</Badge> : null}</div><p className="signal-kicker mt-5">Resource · Version {details.version}</p><h1 className="signal-title mt-3">{details.title}</h1></div>{visual ? <img src={visual.url} alt={visual.altText ?? ""} className="max-h-[30rem] w-full object-cover" /> : null}<div className="p-5 pt-0 sm:p-7 sm:pt-0"><div className="border-t border-border pt-6"><AnnouncementPreview body={details.body} /></div>{details.destinationUrl ? <a href={details.destinationUrl} target="_blank" rel="noreferrer" className="signal-action mt-8 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-bold text-primary-foreground"><ExternalLink className="size-4" />Open Resource</a> : null}<PublicResourceAttachments attachments={details.attachments} /><p className="mt-7 text-xs leading-5 text-muted-foreground">Published by the class secretary{details.publishedAt ? ` · ${new Date(details.publishedAt).toLocaleDateString()}` : ""}</p></div></article>{history.data?.available && history.data.history.length ? <section className="mt-6 border-t border-border pt-5"><div className="flex items-center gap-2"><History className="size-4 text-primary" /><h2 className="font-semibold">History</h2></div><ol className="mt-4 divide-y divide-border">{history.data.history.map(entry => <li key={`${entry.version}-${entry.createdAt}`} className="py-4"><p className="text-sm font-semibold">Version {entry.version} · {entry.action}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.summary}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</p></li>)}</ol></section> : null}</PublicShell>;
}
