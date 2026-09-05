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
import { HistoryLedger, PublicShell, PublicUnavailable } from "./PublicPages";
import { PushNotificationSubscribeButton } from "@/components/PushNotificationSubscribeButton";

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
      {/* Breadcrumb back to subject home & Push Alerts */}
      {details?.subject?.publicId ? (
        <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          <Link
            href={`/s/${details.subject.publicId}`}
            className="signal-action inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-bold text-primary hover:bg-secondary transition-all shadow-sm"
          >
            <ArrowLeft className="size-3.5" />
            {details.subject.code} · {details.subject.name}
          </Link>
          <PushNotificationSubscribeButton
            subjectPublicId={details.subject.publicId}
            subjectName={details.subject.name || details.subject.code || "Subject"}
            subjectCode={details.subject.code || "Subject"}
            variant="pill"
          />
        </div>
      ) : null}

      {/* Main Resource Card */}
      <article className="signal-panel min-w-0 overflow-hidden border-t-2 border-t-primary rounded-2xl shadow-xl space-y-0">
        <div className="p-4 sm:p-6 md:p-8 space-y-4">
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

        <div className="p-4 sm:p-6 md:p-8 space-y-6">
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
                Open Link
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
      <HistoryLedger
        entries={history.data?.available ? history.data.history : []}
        itemKind="resource"
        entityId={details.publicId}
        itemTitle={details.title}
        itemBody={details.body}
        onHistoryUpdated={() => history.refetch()}
      />
    </PublicShell>
  );
}

