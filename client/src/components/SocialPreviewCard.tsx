import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateOgDataUrl, type OgParams } from "@shared/ogImageEngine";
import { formatSocialTitle, formatSocialDescription, formatShorthandDate } from "@shared/socialTitle";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Share2,
  Sparkles,
  Twitter,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export interface SocialPreviewProps {
  title: string;
  description: string;
  publicUrl: string;
  subjectCode?: string;
  type?: "subject" | "attendance" | "announcement" | "resource" | "question" | "proof" | "excuse" | "report";
  version?: number | string;
  date?: string;
  subtitle?: string;
  professorName?: string;
  present?: number | string;
  absent?: number | string;
  excused?: number | string;
  category?: string;
  coverUrl?: string;
}

export function SocialPreviewCard({
  title,
  description,
  publicUrl,
  subjectCode,
  type = "subject",
  version,
  date,
  subtitle,
  professorName,
  present,
  absent,
  excused,
  category,
  coverUrl,
}: SocialPreviewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFastLink, setCopiedFastLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState("messenger");

  const versionNum = version !== undefined && version !== "" ? String(version).replace(/^v/i, "") : "1";
  const versionStr = `v${versionNum}`;

  const cleanBaseTitle = useMemo(() => {
    let t = typeof title === "string" ? title : "";
    if (!t) return "Class Update";
    if (subjectCode) {
      const escapedCode = String(subjectCode).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      t = t.replace(new RegExp(`^\\[${escapedCode}\\]\\s*`, "i"), "");
    }
    t = t.replace(/\s*-\s*v\d+(\.\d+)?$/i, "").trim();
    return t || "Class Update";
  }, [title, subjectCode]);

  const displayCardTitle = useMemo(() => {
    if (type === "subject") {
      return formatSocialTitle({
        type: "Subject",
        contentTitle: cleanBaseTitle !== "Class Update" ? cleanBaseTitle : undefined,
        numberOrDate: subjectCode || cleanBaseTitle,
        version: versionNum,
        subjectCode,
      });
    }

    const shorthand = date ? formatShorthandDate(date) : "";
    const descriptor = (type === "question" ? "#1" : shorthand) || `#${versionNum}`;

    return formatSocialTitle({
      type: type || "Subject",
      contentTitle: cleanBaseTitle !== "Class Update" ? cleanBaseTitle : undefined,
      numberOrDate: descriptor,
      version: versionNum,
      subjectCode,
      fallbackTitle: `${subjectCode ? `[${subjectCode}] ` : ""}${cleanBaseTitle} - ${versionStr}`,
    });
  }, [type, date, subjectCode, versionNum, cleanBaseTitle, versionStr]);

  const ogParams: OgParams = useMemo(
    () => ({
      type,
      title: cleanBaseTitle,
      subjectCode: subjectCode ? String(subjectCode) : undefined,
      subtitle: subtitle || (professorName ? `Prof. ${professorName}` : undefined),
      professorName: professorName ? String(professorName) : undefined,
      version: versionNum,
      date: date ? String(date) : undefined,
      present,
      absent,
      excused,
      category,
      coverUrl,
    }),
    [type, cleanBaseTitle, subjectCode, subtitle, professorName, versionNum, date, present, absent, excused, category, coverUrl]
  );

  const previewImageDataUri = useMemo(() => {
    try {
      return generateOgDataUrl(ogParams);
    } catch (e) {
      console.error("Error generating OG preview image:", e);
      return "";
    }
  }, [ogParams]);

  const safePublicUrl = useMemo(() => {
    if (!publicUrl || typeof publicUrl !== "string") {
      return typeof window !== "undefined" ? window.location.href : "https://supersec.mjbalubar.tech";
    }
    return publicUrl;
  }, [publicUrl]);

  const normalizedPublicUrl = useMemo(() => {
    try {
      const url = new URL(safePublicUrl, typeof window !== "undefined" ? window.location.origin : "https://supersec.mjbalubar.tech");
      if (url.pathname.length > 1) {
        url.pathname = url.pathname.replace(/\/+$/, "");
      }
      return url.toString();
    } catch {
      return safePublicUrl.length > 1 ? safePublicUrl.replace(/\/+$/, "") : safePublicUrl;
    }
  }, [safePublicUrl]);

  const originDomain = useMemo(() => {
    try {
      const url = new URL(normalizedPublicUrl);
      return url.hostname;
    } catch {
      return "supersec.mjbalubar.tech";
    }
  }, [normalizedPublicUrl]);

  const fastMessengerUrl = useMemo(() => {
    const base = normalizedPublicUrl || safePublicUrl;
    const separator = base.includes("?") ? "&" : "?";
    const ts = Math.floor(Date.now() / 1000).toString(36);
    return `${base}${separator}v=${versionNum}&t=${ts}`;
  }, [normalizedPublicUrl, safePublicUrl, versionNum]);

  const safeDescription = useMemo(() => {
    if (typeof description === "string" && description.trim()) {
      return description.trim();
    }
    return formatSocialDescription({
      type,
      subjectCode,
      date,
      professorName,
      category,
      totals: {
        present: typeof present === "number" ? present : Number(present) || 0,
        absent: typeof absent === "number" ? absent : Number(absent) || 0,
        excused: typeof excused === "number" ? excused : Number(excused) || 0,
      },
    });
  }, [description, type, subjectCode, date, professorName, category, present, absent, excused]);

  const fbDebuggerUrl = useMemo(() => {
    return `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(normalizedPublicUrl || safePublicUrl)}`;
  }, [normalizedPublicUrl, safePublicUrl]);

  const copyUrlOnly = async () => {
    try {
      await navigator.clipboard.writeText(normalizedPublicUrl || publicUrl);
      setCopiedLink(true);
      toast.success("Standard link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Could not copy link to clipboard.");
    }
  };

  const copyFastMessengerLink = async () => {
    try {
      await navigator.clipboard.writeText(fastMessengerUrl);
      setCopiedFastLink(true);
      toast.success("⚡ Cache-busting link copied! Facebook Messenger will crawl and render immediately.");
      setTimeout(() => setCopiedFastLink(false), 2500);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const copyFormattedMessengerText = async () => {
    const formatted = `📢 ${displayCardTitle}\n\n${safeDescription}\n\n👉 Open Portal: ${fastMessengerUrl}`;

    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedText(true);
      toast.success(`Formatted announcement text (${versionStr}) copied! Ready to paste in Messenger.`);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      toast.error("Could not copy text.");
    }
  };

  return (
    <div className="signal-card-shell">
      <section className="signal-panel rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card to-secondary/30 p-5 sm:p-7 shadow-xl shadow-primary/5 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Share2 className="size-4" />
              </span>
              <p className="signal-kicker text-primary">Social &amp; OpenGraph Previews</p>
            </div>
            <h2 className="signal-heading text-lg sm:text-xl font-black text-foreground">
              Messenger &amp; Social Card Preview
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              <Zap className="mr-1.5 size-3.5" />
              Instant Pre-rendered Edge
            </Badge>
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="mr-1.5 size-3.5" />
              1200×630 OG Cover
            </Badge>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          When this link is sent to Facebook Messenger, Discord, Telegram, iMessage, or Twitter/X, classmates will see this rich high-resolution cover card with live verified details.
        </p>

        {/* Tab Switcher for different platforms */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-secondary/60 p-1">
            <TabsTrigger value="messenger" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary">
              <MessageCircle className="size-3.5" />
              <span className="hidden sm:inline">Messenger</span>
            </TabsTrigger>
            <TabsTrigger value="discord" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-sky-400">
              <MessageSquare className="size-3.5" />
              <span className="hidden sm:inline">Discord / TG</span>
            </TabsTrigger>
            <TabsTrigger value="twitter" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground">
              <Twitter className="size-3.5" />
              <span className="hidden sm:inline">Twitter / X</span>
            </TabsTrigger>
            <TabsTrigger value="google" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-emerald-400">
              <Globe className="size-3.5" />
              <span className="hidden sm:inline">Google Search</span>
            </TabsTrigger>
          </TabsList>

          {/* Facebook Messenger Preview */}
          <TabsContent value="messenger" className="mt-0 space-y-3">
            <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-[#1e293b]/90 shadow-2xl transition-all">
              {/* Dynamic Image Cover */}
              <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-black/40">
                <img
                  src={previewImageDataUri}
                  alt={title}
                  className="h-full w-full object-cover transition-all"
                  loading="lazy"
                />
              </div>
              {/* Messenger Link Caption Block */}
              <div className="p-4 space-y-1 bg-[#0f172a]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {originDomain}
                </p>
                <p className="font-bold text-sm text-foreground line-clamp-1">
                  {displayCardTitle}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {safeDescription}
                </p>
              </div>
            </div>
            <p className="text-center text-[11px] font-medium text-muted-foreground">
              Messenger Chat Card representation
            </p>
          </TabsContent>

          {/* Discord / Telegram Preview */}
          <TabsContent value="discord" className="mt-0 space-y-3">
            <div className="mx-auto max-w-lg overflow-hidden rounded-xl border-l-4 border-l-primary border-y border-r border-border/70 bg-[#2b2d31] p-4 text-foreground shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-primary">supersec</span>
                {subjectCode ? <span className="text-[11px] text-muted-foreground">· {subjectCode}</span> : null}
              </div>
              <p className="text-sm font-bold text-sky-400 hover:underline cursor-pointer">
                {displayCardTitle}
              </p>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed line-clamp-2">
                {safeDescription}
              </p>
              <div className="mt-3 aspect-[1.91/1] w-full overflow-hidden rounded-lg border border-border/40">
                <img src={previewImageDataUri} alt={displayCardTitle} className="h-full w-full object-cover" />
              </div>
            </div>
            <p className="text-center text-[11px] font-medium text-muted-foreground">
              Discord / Telegram Rich Embed representation
            </p>
          </TabsContent>

          {/* Twitter / X Large Summary Card */}
          <TabsContent value="twitter" className="mt-0 space-y-3">
            <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-neutral-800 bg-black text-foreground shadow-xl">
              <div className="aspect-[1.91/1] w-full overflow-hidden">
                <img src={previewImageDataUri} alt={displayCardTitle} className="h-full w-full object-cover" />
              </div>
              <div className="p-3.5 space-y-0.5 border-t border-neutral-800 bg-neutral-950">
                <p className="text-[11px] text-neutral-400 truncate">{originDomain}</p>
                <p className="text-sm font-bold text-neutral-100 line-clamp-1">{displayCardTitle}</p>
                <p className="text-xs text-neutral-400 line-clamp-1">{safeDescription}</p>
              </div>
            </div>
            <p className="text-center text-[11px] font-medium text-muted-foreground">
              Twitter / X Large Image Card representation
            </p>
          </TabsContent>

          {/* Google Search Snippet */}
          <TabsContent value="google" className="mt-0 space-y-3">
            <div className="mx-auto max-w-lg rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-lg space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="size-3.5 text-emerald-500" />
                <span className="truncate">{originDomain} &gt; s &gt; {subjectCode?.toLowerCase() || "portal"}</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-primary hover:underline cursor-pointer">
                {title} · supersec
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
            <p className="text-center text-[11px] font-medium text-muted-foreground">
              Google Search Snippet representation
            </p>
          </TabsContent>
        </Tabs>

        {/* Quick Action Toolbar */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              onClick={copyFastMessengerLink}
              className="signal-action min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 gap-2 text-xs"
            >
              {copiedFastLink ? <Check className="size-4 text-white" /> : <Zap className="size-4 text-emerald-200" />}
              {copiedFastLink ? "Copied Fast Link!" : "Fast Messenger Link"}
            </Button>

            <Button
              onClick={copyFormattedMessengerText}
              variant="outline"
              className="signal-action min-h-11 rounded-xl font-bold border-border/80 hover:bg-secondary gap-2 text-xs"
            >
              {copiedText ? <Check className="size-4 text-emerald-400" /> : <MessageCircle className="size-4 text-primary" />}
              {copiedText ? "Copied Post!" : "Copy Post + Link"}
            </Button>

            <Button
              onClick={copyUrlOnly}
              variant="outline"
              className="signal-action min-h-11 rounded-xl font-semibold border-border/80 hover:bg-secondary gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {copiedLink ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              {copiedLink ? "Copied URL!" : "Copy Raw URL"}
            </Button>

            <Button
              asChild
              variant="outline"
              className="signal-action min-h-11 rounded-xl font-semibold border-border/80 hover:bg-secondary text-sky-400 hover:text-sky-300 gap-2 text-xs"
            >
              <a href={fbDebuggerUrl} target="_blank" rel="noreferrer" title="Force Facebook crawler to scrape this exact URL right now">
                <RefreshCw className="size-3.5 text-sky-400" />
                Force FB Re-scrape
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="signal-action min-h-11 rounded-xl font-semibold border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground gap-2 text-xs md:col-span-2 lg:col-span-2"
            >
              <a href={normalizedPublicUrl || publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5 mr-1" />
                Open Live Shared Page
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
