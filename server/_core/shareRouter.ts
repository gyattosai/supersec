import type { Express, Request, Response } from "express";
import { Client, Databases, Query } from "node-appwrite";
import { ENV } from "./env";

const DEFAULT_STATIC_URL = "https://supersec.mjbalubar.tech";
const DEFAULT_OG_IMAGE = "https://supersec.mjbalubar.tech/og-cover.png";
const DEFAULT_TITLE = "supersec — a class secretary management system";
const DEFAULT_DESC = "Real-time class updates, verified attendance records, and official academic resources.";

const KNOWN_STATIC_CARDS = new Set([
  "announcement-gsI_ywvWRr6G","announcement-gsl_ywvWRr6G","announcement-hHJ5_F2T9eNN",
  "announcement-KhXF3duS4hLw","announcement-OLCBGGSR01","announcement-OLCBGGSRO1",
  "announcement-OLCBSTM01","announcement-OLCBSTMO1","announcement-OLCBTQM01",
  "announcement-OLCBTQMO1","announcement-rpsH0WKhdy10","announcement-rpsH0WKhdy1O",
  "announcement-rpsHOWKhdy10","announcement-rpsHOWKhdy1O","announcement-SEC 401",
  "announcement-SEC 4O1","announcement-wZqXVKLoCRv_","qa-71_e9ukGI3M5",
  "qa-71_e9ukGl3M5","qa-8sYDr-bqijKM","qa-gsI_ywvWRr6G","qa-gsl_ywvWRr6G",
  "qa-OLCBGGSR01","qa-OLCBGGSRO1","qa-OLCBSTM01","qa-OLCBSTMO1","qa-OLCBTQM01",
  "qa-OLCBTQMO1","qa-qMLs9Dku880a","qa-qMLs9Dku88Oa","qa-qxAjiTe-SGiG",
  "qa-SEC 401","qa-SEC 4O1","qa-vdJGSv913ZrS","resource-1_ddWb5tiUuY",
  "resource-2M0IRCnd1FxA","resource-2M0lRCnd1FxA","resource-gsI_ywvWRr6G",
  "resource-gsl_ywvWRr6G","resource-kD146CSPbFZZ","resource-LbTUmb5QfHjT",
  "resource-OLCBGGSR01","resource-OLCBGGSRO1","resource-OLCBSTM01",
  "resource-OLCBSTMO1","resource-OLCBTQM01","resource-OLCBTQMO1","resource-SEC 401",
  "resource-SEC 4O1","subject-0LCBGGSR01","subject-0LCBGGSRO1","subject-0LCBSTM01",
  "subject-0LCBSTMO1","subject-0LCBTQM01","subject-0LCBTQMO1","subject-7Cys0hznJ8tQ",
  "subject-7CysOhznJ8tQ","subject-FhwdWPP2gYb3","subject-gsI_ywvWRr6G",
  "subject-gsl_ywvWRr6G","subject-OLCBGGSR01","subject-OLCBGGSRO1","subject-OLCBSTM01",
  "subject-OLCBSTMO1","subject-OLCBTQM01","subject-OLCBTQMO1","subject-SEC 401","subject-SEC 4O1"
]);

function resolveStaticCardUrl(prefix: string, id: string, staticAppUrl: string, fallbackImage: string, ver?: string | number): string {
  const cardKey = `${prefix}-${id}`;
  if (KNOWN_STATIC_CARDS.has(cardKey)) {
    return `${staticAppUrl}/og/${encodeURIComponent(cardKey)}.jpg${ver ? `?v=${ver}` : ""}`;
  }
  return fallbackImage;
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeSnippet(text?: string | null, maxLength = 160): string {
  if (!text || typeof text !== "string") return "";
  const clean = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, "$1")
    .replace(/^>\s*/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= maxLength) return clean;
  const truncated = clean.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return `${truncated.slice(0, lastSpace)}…`;
  }
  return `${truncated.trimEnd()}…`;
}

export function parseTargetPathFromRequest(req: Request): string {
  const query = req.query as Record<string, string | undefined>;
  if (query.target) return query.target;
  if (query.path) return query.path;
  if (query.url) {
    try {
      return new URL(query.url).pathname;
    } catch {
      return query.url;
    }
  }

  let rawPath = req.path || "/";
  if (rawPath.startsWith("/api/share")) {
    rawPath = rawPath.slice("/api/share".length) || "/";
  } else if (rawPath.startsWith("/share")) {
    rawPath = rawPath.slice("/share".length) || "/";
  }

  if (rawPath === "/" && query.type && query.id) {
    const t = String(query.type).toLowerCase();
    const id = encodeURIComponent(String(query.id));
    if (t === "a" || t === "announcement") return `/a/${id}`;
    if (t === "r" || t === "resource") return `/r/${id}`;
    if (t === "q" || t === "qa" || t === "question") return `/q/${id}`;
    if (t === "s" || t === "subject") return `/s/${id}`;
    if (t === "attendance") return `/attendance/${id}`;
    if (t === "reports" || t === "report") return `/reports/${id}`;
  }

  return rawPath;
}

export async function generateShareHtml(req: Request): Promise<{ html: string; isFound: boolean; title: string; imageUrl: string; redirectTargetUrl: string }> {
  const staticAppUrl = (process.env.CANONICAL_ORIGIN || DEFAULT_STATIC_URL).replace(/\/+$/, "");
  const endpoint = ENV.appwriteEndpoint || "https://sgp.cloud.appwrite.io/v1";
  const projectId = ENV.appwriteProjectId || "supersec";
  const apiKey = ENV.appwriteApiKey || "";
  const dbId = ENV.appwriteDatabaseId || "supersec_db";
  const fallbackImage = DEFAULT_OG_IMAGE;

  const targetPath = parseTargetPathFromRequest(req);
  const redirectTargetUrl = `${staticAppUrl}${targetPath.startsWith("/") ? targetPath : `/${targetPath}`}`;
  const canonicalShareUrl = `${staticAppUrl}/share?target=${encodeURIComponent(targetPath)}`;

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESC;
  let imageUrl = fallbackImage;
  let isFound = false;

  let databases: Databases | null = null;
  if (apiKey) {
    try {
      const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
      databases = new Databases(client);
    } catch (err) {
      console.warn("[ShareRouter] Could not init databases client:", err);
    }
  }

  try {
    if (targetPath.startsWith("/a/")) {
      const id = targetPath.slice("/a/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        const docs = await databases.listDocuments(dbId, "announcements", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        const doc: any = docs.documents[0];
        if (doc) {
          isFound = true;
          title = doc.title || "Class Announcement";
          description = sanitizeSnippet(doc.body) || "Official class announcement and updates.";
          const assetId = doc.socialPreviewMediaAssetId || doc.mediaAssetId;
          if (assetId) {
            imageUrl = `${endpoint}/storage/buckets/media-assets/files/${assetId}/view?project=${projectId}`;
          } else {
            imageUrl = resolveStaticCardUrl("announcement", id, staticAppUrl, fallbackImage);
          }
        }
      }
    } else if (targetPath.startsWith("/r/")) {
      const id = targetPath.slice("/r/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        const docs = await databases.listDocuments(dbId, "resources", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        const doc: any = docs.documents[0];
        if (doc) {
          isFound = true;
          title = doc.title || "Class Resource";
          description = sanitizeSnippet(doc.description) || "Official class syllabus, materials, and reference links.";
          const assetId = doc.socialPreviewMediaAssetId || doc.fallbackMediaAssetId;
          if (assetId) {
            imageUrl = `${endpoint}/storage/buckets/media-assets/files/${assetId}/view?project=${projectId}`;
          } else {
            imageUrl = resolveStaticCardUrl("resource", id, staticAppUrl, fallbackImage);
          }
        }
      }
    } else if (targetPath.startsWith("/q/")) {
      const id = targetPath.slice("/q/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        const docs = await databases.listDocuments(dbId, "questionsAnswers", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        const doc: any = docs.documents[0];
        if (doc) {
          isFound = true;
          title = doc.question ? `Q: ${doc.question}` : "Class Q&A";
          description = sanitizeSnippet(doc.answer) || "Official answered question for class inquiries.";
          const assetId = doc.socialPreviewMediaAssetId;
          if (assetId) {
            imageUrl = `${endpoint}/storage/buckets/media-assets/files/${assetId}/view?project=${projectId}`;
          } else {
            imageUrl = resolveStaticCardUrl("qa", id, staticAppUrl, fallbackImage);
          }
        }
      }
    } else if (targetPath.startsWith("/s/")) {
      const id = targetPath.slice("/s/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        const docs = await databases.listDocuments(dbId, "subjects", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        const doc: any = docs.documents[0];
        if (doc) {
          isFound = true;
          title = `${doc.code} — ${doc.name}`;
          description = `Official student portal for ${doc.name} (${doc.code}). View attendance records, announcements, and resources.`;
          imageUrl = resolveStaticCardUrl("subject", id, staticAppUrl, fallbackImage);
        }
      }
    } else if (targetPath.startsWith("/attendance/")) {
      const id = targetPath.slice("/attendance/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        const docs = await databases.listDocuments(dbId, "classSessions", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        const doc: any = docs.documents[0];
        if (doc) {
          isFound = true;
          title = "Class Attendance Record";
          description = doc.noClassReason ? `No Class Session · ${doc.noClassReason}` : "Verified class session attendance report and student attendance roster.";
          imageUrl = fallbackImage;
        }
      }
    } else if (targetPath.startsWith("/reports/")) {
      const id = targetPath.slice("/reports/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        const docs = await databases.listDocuments(dbId, "generatedReports", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        const doc: any = docs.documents[0];
        if (doc) {
          isFound = true;
          title = doc.title || "Academic & Attendance Summary Report";
          description = "Official executive summary, attendance rates, and student masterlist records.";
          imageUrl = fallbackImage;
        }
      }
    }
  } catch (err) {
    console.error("[ShareRouter] Error querying document metadata:", err);
  }

  const cleanImageNoQuery = imageUrl.split("?")[0].toLowerCase();
  const isJpg = cleanImageNoQuery.endsWith(".jpg") || cleanImageNoQuery.endsWith(".jpeg");
  const isPng = cleanImageNoQuery.endsWith(".png");
  const isWebp = cleanImageNoQuery.endsWith(".webp");
  const imageMime = isJpg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(imageUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">

  <!-- Open Graph / Meta Platforms (Facebook & Messenger) -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalShareUrl}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:type" content="${imageMime}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:site_name" content="supersec">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonicalShareUrl}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">

  <!-- Canonical Link -->
  <link rel="canonical" href="${redirectTargetUrl}">

  <!-- Approach 1: Client-Side Redirect Injection for Human Browsers -->
  <script>
    window.location.replace("${redirectTargetUrl}");
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${redirectTargetUrl}">
  </noscript>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; box-sizing: border-box; text-align: center;">
  <div style="max-width: 420px; background: #131b2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 1.25rem; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
    <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 1rem;">⚡</div>
    <h1 style="font-size: 1.125rem; font-weight: 700; margin: 0 0 0.5rem 0;">Redirecting to supersec...</h1>
    <p style="font-size: 0.8125rem; color: #94a3b8; line-height: 1.5; margin: 0 0 1.25rem 0;">Taking you directly to the class portal. Click below if you are not redirected automatically.</p>
    <a href="${redirectTargetUrl}" style="display: inline-block; background: #38bdf8; color: #090d16; font-size: 0.8125rem; font-weight: 700; text-decoration: none; padding: 0.625rem 1.25rem; border-radius: 0.75rem;">Open Link</a>
  </div>
</body>
</html>`;

  return { html, isFound, title, imageUrl, redirectTargetUrl };
}

export async function scrapeOpenGraphMetadata(targetUrl: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const html = await res.text();
    const getMeta = (prop: string) => {
      const match =
        html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${prop}["']`, "i"));
      return match ? match[1] : "";
    };
    const getTitle = () => {
      const og = getMeta("title");
      if (og) return og;
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return titleMatch ? titleMatch[1].trim() : "Link Preview";
    };

    return {
      title: getTitle(),
      description: getMeta("description"),
      image: getMeta("image"),
      url: getMeta("url") || targetUrl,
      siteName: getMeta("site_name") || "",
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(err.message || "Failed to scrape metadata");
  }
}

export function registerShareRouter(app: Express) {
  const getHandler = async (req: Request, res: Response) => {
    try {
      const { html, isFound } = await generateShareHtml(req);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", isFound ? "public, max-age=300, s-maxage=300, stale-while-revalidate=86400" : "public, max-age=60, s-maxage=60");
      res.status(200).send(html);
    } catch (err: any) {
      console.error("[ShareRouter] Error processing share route:", err);
      res.status(500).send("Error generating social preview");
    }
  };

  const postHandler = async (req: Request, res: Response) => {
    const targetUrl = req.body?.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing "url" parameter in request body.' });
    }
    try {
      const metadata = await scrapeOpenGraphMetadata(targetUrl);
      return res.status(200).json(metadata);
    } catch (err: any) {
      console.error("[ShareRouter] Scraper error:", err);
      return res.status(500).json({ error: "Failed to parse Open Graph metadata." });
    }
  };

  app.get("/share", getHandler);
  app.get("/share/*", getHandler);
  app.get("/api/share", getHandler);
  app.get("/api/share/*", getHandler);

  app.post("/share", postHandler);
  app.post("/api/share", postHandler);
  app.post("/api/share/unfurl", postHandler);
}
