import { AnnouncementPreview } from "@/components/AnnouncementPreview";
import { PublicResourceAttachments } from "@/components/PublicResourceAttachments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/lib/meta";
import { formatSocialTitle, formatSocialDescription, formatShorthandDate } from "@shared/socialTitle";
import { ArrowLeft, ExternalLink, FileText, Globe, History, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { PublicShell, PublicUnavailable } from "./PublicPages";

export function PremiumPublicResourcePage() {
  const [, params] = useRoute("/r/:publicId");
  const input = useMemo(() => ({ kind: "resource" as const, publicId: params?.publicId ?? "" }), [params?.publicId]);
  const item = trpc.foundation.publicItem.useQuery(input, { enabled: Boolean(input.publicId) });
  const history = trpc.foundation.publicHistory.useQuery(input, { enabled: Boolean(input.publicId) && Boolean(item.data?.available) });

  const details = item.data?.available ? item.data.item : null;
  const visual = details?.media ?? details?.socialPreviewMedia;
  const dateShorthand = details ? formatShorthandDate(details.publishedAt) || `#${details.version}` : "";
  const socialTitle = details
    ? formatSocialTitle({
        type: "Resource",
        contentTitle: details.title,
        numberOrDate: dateShorthand,
        version: details.version,
        subjectCode: details.subject?.code,
      })
    : undefined;
  const socialDesc = details
    ? formatSocialDescription({
        type: "resource",
        subjectCode: details.subject?.code,
        subjectName: details.subject?.name,
        contentTitle: details.title,
        contentBody: details.body,
        category: details.category || undefined,
        version: details.version,
      })
    : "Published course resource and download link.";
  const dynamicOg = details
    ? visual?.url || `/og/resource-${params?.publicId}.jpg?v=${details.version}`
    : undefined;

  usePageMeta({
    title: socialTitle,
    description: socialDesc,
    keywords: details ? [details.title, details.subject?.code || "", details.category || "Resource", "Resource", "Class Download"] : undefined,
    canonicalPath: params?.publicId ? `/r/${params.publicId}` : undefined,
    ogImage: dynamicOg,
    ogImageAlt: visual?.altText || details?.title,
    ogType: "article",
    publishedTime: details?.publishedAt ? new Date(details.publishedAt).toISOString() : undefined,
    jsonLd: details
      ? {
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: details.title,
          description: details.body ? details.body.replace(/\s+/g, " ").slice(0, 180) : "Course resource",
          datePublished: details.publishedAt ? new Date(details.publishedAt).toISOString() : undefined,
          learningResourceType: details.category || "Resource",
          url: details.destinationUrl || undefined,
        }
      : undefined,
  });

  if (item.isLoading)
    return (
      <PublicShell>
        <div className="signal-inset p-8 text-center text-xs sm:text-sm text-muted-foreground animate-pulse rounded-2xl">
          Loading Resource…
        </div>
      </PublicShell>
    );

  if (!item.data?.available || !details) return <PublicUnavailable />;

  return (
    <PublicShell subject={details.subject}>
      {/* Breadcrumb back to subject home */}
      {details?.subject?.publicId ? (
        <Link
          href={`/s/${details.subject.publicId}`}
          className="signal-action mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-bold text-primary hover:bg-secondary transition-all shadow-sm"
        >
          <ArrowLeft className="size-3.5" />
          {details.subject.code} · {details.subject.name}
        </Link>
      ) : null}

      {/* Main Resource Card */}
      <article className="signal-panel overflow-hidden border-t-2 border-t-primary rounded-2xl shadow-xl space-y-0">
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="glow-badge-orange inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold">
              {details.category ?? "Resource"}
            </span>
            {details.sourceDomain ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                <Globe className="size-3" />
                {details.sourceDomain}
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              Version {details.version}
            </span>
          </div>

          <h1 className="signal-title text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {details.title}
          </h1>
        </div>

        {/* Visual Cover Asset */}
        {visual ? (
          <div className="border-y border-border/70 bg-black/20">
            <img
              src={visual.url}
              alt={visual.altText ?? details.title}
              className="max-h-[26rem] w-full object-cover"
            />
          </div>
        ) : null}

        <div className="p-6 sm:p-8 space-y-6">
          {/* Rich Body Content */}
          <div className="signal-prose border-b border-border/60 pb-6">
            <AnnouncementPreview body={details.body} />
          </div>

          {/* Primary Action Button */}
          {details.destinationUrl ? (
            <div className="pt-2">
              <a
                href={details.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="signal-action inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 active:scale-[0.98] transition-all"
              >
                <ExternalLink className="size-4" />
                Open Course Resource / Link
              </a>
            </div>
          ) : null}

          {/* Attachments Section */}
          <PublicResourceAttachments attachments={details.attachments} />

          <p className="text-[11px] text-muted-foreground pt-2">
            Published by the class secretary
            {details.publishedAt ? ` · ${new Date(details.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : ""}
          </p>
        </div>
      </article>

      {/* Version History */}
      {history.data?.available && history.data.history.length ? (
        <section className="mt-8 border-t border-border pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Publication History</h2>
          </div>
          <ol className="divide-y divide-border/60">
            {history.data.history.map(entry => (
              <li key={`${entry.version}-${entry.createdAt}`} className="py-3.5 space-y-1">
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  Version {entry.version} · {entry.action}
                </p>
                <p className="text-xs text-muted-foreground">{entry.summary}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </PublicShell>
  );
}

