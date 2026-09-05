import { useEffect } from "react";
import { generateOgDataUrl, type OgParams } from "@shared/ogImageEngine";

export interface PageMetaOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalPath?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: "website" | "article" | "profile";
  ogParams?: OgParams;
  publishedTime?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

function setMetaTag(name: string, content: string, isProperty: boolean = false) {
  if (typeof document === "undefined") return;
  const attr = isProperty ? "property" : "name";
  let tag = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonicalTag(url: string) {
  if (typeof document === "undefined") return;
  let link = document.querySelector(`link[rel="canonical"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function setJsonLd(data: Record<string, any> | Array<Record<string, any>>) {
  if (typeof document === "undefined") return;
  let script = document.querySelector(`script[type="application/ld+json"]#page-jsonld`) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("id", "page-jsonld");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function usePageMeta({
  title,
  description,
  keywords,
  canonicalPath,
  ogImage,
  ogImageAlt,
  ogType = "website",
  ogParams,
  publishedTime,
  noindex = false,
  jsonLd,
}: PageMetaOptions) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const siteName = "supersec";
    const formattedTitle = title || "supersec — Class Secretary Management System";
    document.title = formattedTitle;

    const origin = typeof window !== "undefined" ? window.location.origin : "https://supersec.mjbalubar.tech";
    const currentUrl = typeof window !== "undefined" ? window.location.href : origin;
    let canonicalUrl = canonicalPath
      ? canonicalPath.startsWith("http")
        ? canonicalPath
        : `${origin}${canonicalPath}`
      : currentUrl;

    if (!canonicalUrl.endsWith("/") && !canonicalUrl.includes(".") && !canonicalUrl.includes("?")) {
      canonicalUrl = `${canonicalUrl}/`;
    }

    // Standard HTML & SEO Meta
    if (description) {
      setMetaTag("description", description);
      setMetaTag("og:description", description, true);
      setMetaTag("twitter:description", description);
    }

    if (keywords && keywords.length > 0) {
      setMetaTag("keywords", keywords.join(", "));
    }

    setMetaTag("robots", noindex ? "noindex, follow" : "index, follow");
    setCanonicalTag(canonicalUrl);

    // OpenGraph & Facebook / Messenger Meta
    setMetaTag("og:title", formattedTitle, true);
    setMetaTag("og:site_name", siteName, true);
    setMetaTag("og:type", ogType, true);
    setMetaTag("og:url", canonicalUrl, true);
    setMetaTag("og:locale", "en_US", true);

    // Twitter / X Meta
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", formattedTitle);

    // Resolve Image: either explicitly provided, generated via params, or default API endpoint
    let resolvedImage = ogImage;
    if (!resolvedImage && ogParams) {
      resolvedImage = `/api/og?type=${encodeURIComponent(ogParams.type || "subject")}&title=${encodeURIComponent(ogParams.title || title || "")}${ogParams.subjectCode ? `&subjectCode=${encodeURIComponent(ogParams.subjectCode)}` : ""}${ogParams.version ? `&version=${encodeURIComponent(String(ogParams.version))}` : ""}${ogParams.subtitle ? `&subtitle=${encodeURIComponent(ogParams.subtitle)}` : ""}${ogParams.date ? `&date=${encodeURIComponent(ogParams.date)}` : ""}${ogParams.present ? `&present=${encodeURIComponent(String(ogParams.present))}` : ""}${ogParams.absent ? `&absent=${encodeURIComponent(String(ogParams.absent))}` : ""}${ogParams.excused ? `&excused=${encodeURIComponent(String(ogParams.excused))}` : ""}`;
    }

    if (resolvedImage) {
      const absoluteImage = resolvedImage.startsWith("http") || resolvedImage.startsWith("data:")
        ? resolvedImage
        : `${origin}${resolvedImage}`;

      setMetaTag("og:image", absoluteImage, true);
      setMetaTag("og:image:secure_url", absoluteImage, true);
      setMetaTag("og:image:width", "1200", true);
      setMetaTag("og:image:height", "630", true);
      const isJpg = absoluteImage.includes(".jpg") || absoluteImage.includes(".jpeg");
      const isPng = absoluteImage.includes(".png");
      const isWebp = absoluteImage.includes(".webp");
      const imageMime = isJpg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";
      setMetaTag("og:image:type", imageMime, true);
      setMetaTag("og:image:alt", ogImageAlt || title || "supersec Class Management", true);
      setMetaTag("twitter:image", absoluteImage);
      setMetaTag("twitter:image:width", "1200");
      setMetaTag("twitter:image:height", "630");
      setMetaTag("twitter:image:alt", ogImageAlt || title || "supersec Class Management");
    }

    if (publishedTime) {
      setMetaTag("article:published_time", publishedTime, true);
    }

    // JSON-LD Structured Data
    if (jsonLd) {
      setJsonLd(jsonLd);
    }
  }, [
    title,
    description,
    keywords,
    canonicalPath,
    ogImage,
    ogImageAlt,
    ogType,
    ogParams,
    publishedTime,
    noindex,
    jsonLd,
  ]);
}
