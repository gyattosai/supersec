import { Client, Databases, Query } from "node-appwrite";
import ogs from "open-graph-scraper";

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

function resolveStaticCardUrl(prefix, id, staticAppUrl, fallbackImage, ver) {
  const cardKey = `${prefix}-${id}`;
  if (KNOWN_STATIC_CARDS.has(cardKey)) {
    return `${staticAppUrl}/og/${encodeURIComponent(cardKey)}.jpg${ver ? `?v=${ver}` : ""}`;
  }
  return fallbackImage;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeSnippet(text, maxLength = 160) {
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

function parseTargetPath(req) {
  const query = req.query || {};

  // Check specific query aliases
  if (query.postId) return `/a/${encodeURIComponent(query.postId)}`;
  if (query.announcementId) return `/a/${encodeURIComponent(query.announcementId)}`;
  if (query.resourceId) return `/r/${encodeURIComponent(query.resourceId)}`;
  if (query.questionId) return `/q/${encodeURIComponent(query.questionId)}`;
  if (query.subjectId) return `/s/${encodeURIComponent(query.subjectId)}`;
  if (query.sessionId || query.attendanceId) return `/attendance/${encodeURIComponent(query.sessionId || query.attendanceId)}`;
  if (query.reportId) return `/reports/${encodeURIComponent(query.reportId)}`;

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
  if (rawPath.startsWith("/share")) {
    rawPath = rawPath.slice("/share".length) || "/";
  }

  // Handle generic type & id parameters
  if (rawPath === "/" && query.type && query.id) {
    const t = String(query.type).toLowerCase();
    const id = encodeURIComponent(String(query.id));
    if (t === "a" || t === "announcement" || t === "post") return `/a/${id}`;
    if (t === "r" || t === "resource") return `/r/${id}`;
    if (t === "q" || t === "qa" || t === "question") return `/q/${id}`;
    if (t === "s" || t === "subject") return `/s/${id}`;
    if (t === "attendance" || t === "session") return `/attendance/${id}`;
    if (t === "reports" || t === "report") return `/reports/${id}`;
  }

  return rawPath;
}

export default async ({ req, res, log, error }) => {
  // 1. If method is POST, handle external URL metadata unfurling (Scraper Mode)
  if (req.method === "POST") {
    let targetUrl;
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      targetUrl = body?.url;
    } catch (err) {
      return res.json({ error: "Invalid JSON body payload." }, 400);
    }

    if (!targetUrl) {
      return res.json({ error: 'Missing "url" parameter in request body.' }, 400);
    }

    try {
      if (log) log(`Scraping Open Graph tags for URL: ${targetUrl}`);
      const options = { url: targetUrl, timeout: 5000 };
      const { error: ogError, result } = await ogs(options);

      if (ogError) {
        if (error) error(`OG Scraper Error: ${JSON.stringify(result)}`);
        return res.json({ error: "Failed to parse Open Graph metadata." }, 500);
      }

      const messengerPreview = {
        title: result.ogTitle || result.twitterTitle || result.dcTitle || "Link Preview",
        description: result.ogDescription || result.twitterDescription || result.dcDescription || "",
        image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || "",
        url: result.ogUrl || targetUrl,
        siteName: result.ogSiteName || "",
      };

      return res.json(messengerPreview, 200);
    } catch (err) {
      if (error) error(`Unexpected system error: ${err.message}`);
      return res.json({ error: "An unexpected internal error occurred." }, 500);
    }
  }

  // 2. If method is GET, handle incoming social share previews (Approach 1: Function Router)
  const staticAppUrl = (process.env.STATIC_APP_URL || DEFAULT_STATIC_URL).replace(/\/+$/, "");
  const endpoint = process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || "supersec";
  const apiKey = process.env.APPWRITE_API_KEY || "";
  const dbId = process.env.APPWRITE_DATABASE_ID || "supersec_db";
  const fallbackImage = process.env.FALLBACK_OG_IMAGE || DEFAULT_OG_IMAGE;

  const targetPath = parseTargetPath(req);
  const redirectTargetUrl = `${staticAppUrl}${targetPath.startsWith("/") ? targetPath : `/${targetPath}`}`;
  const queryVer = req.query?.v ? String(req.query.v) : "";
  const canonicalShareUrl = `${staticAppUrl}/share?target=${encodeURIComponent(targetPath)}${queryVer ? `&v=${encodeURIComponent(queryVer)}` : ""}`;

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESC;
  let imageUrl = fallbackImage;
  let isFound = false;

  let databases = null;
  if (apiKey) {
    try {
      const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
      databases = new Databases(client);
    } catch (err) {
      if (error) error(`Failed to init Appwrite client: ${err.message}`);
    }
  }

  try {
    // 1. Announcements (/a/:id)
    if (targetPath.startsWith("/a/")) {
      const id = targetPath.slice("/a/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        let doc = null;
        const docs = await databases.listDocuments(dbId, "announcements", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        doc = docs.documents?.[0];
        if (!doc) {
          doc = await databases.getDocument(dbId, "announcements", id).catch(() => null);
        }

        if (doc) {
          isFound = true;
          const data = doc.data ? { ...doc, ...doc.data } : doc;
          const ver = queryVer || data.version || 1;
          title = `${data.title || "Class Announcement"}${ver > 1 ? ` · v${ver}` : ""}`;
          description = sanitizeSnippet(data.body) || "Official class announcement and updates.";
          const assetId = data.socialPreviewMediaAssetId || data.mediaAssetId;
          if (assetId) {
            imageUrl = `${endpoint}/storage/buckets/media-assets/files/${assetId}/view?project=${projectId}&v=${ver}`;
          } else {
            imageUrl = resolveStaticCardUrl("announcement", id, staticAppUrl, fallbackImage, ver);
          }
        }
      }
    }

    // 2. Resources (/r/:id)
    else if (targetPath.startsWith("/r/")) {
      const id = targetPath.slice("/r/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        let doc = null;
        const docs = await databases.listDocuments(dbId, "resources", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        doc = docs.documents?.[0];
        if (!doc) {
          doc = await databases.getDocument(dbId, "resources", id).catch(() => null);
        }

        if (doc) {
          isFound = true;
          const data = doc.data ? { ...doc, ...doc.data } : doc;
          const ver = queryVer || data.version || 1;
          title = `${data.title || "Class Resource"}${ver > 1 ? ` · v${ver}` : ""}`;
          description = sanitizeSnippet(data.description) || "Official class syllabus, materials, and reference links.";
          const assetId = data.socialPreviewMediaAssetId || data.fallbackMediaAssetId;
          if (assetId) {
            imageUrl = `${endpoint}/storage/buckets/media-assets/files/${assetId}/view?project=${projectId}&v=${ver}`;
          } else {
            imageUrl = resolveStaticCardUrl("resource", id, staticAppUrl, fallbackImage, ver);
          }
        }
      }
    }

    // 3. Q&A (/q/:id)
    else if (targetPath.startsWith("/q/")) {
      const id = targetPath.slice("/q/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        let doc = null;
        const docs = await databases.listDocuments(dbId, "questionsAnswers", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        doc = docs.documents?.[0];
        if (!doc) {
          doc = await databases.getDocument(dbId, "questionsAnswers", id).catch(() => null);
        }

        if (doc) {
          isFound = true;
          const data = doc.data ? { ...doc, ...doc.data } : doc;
          const ver = queryVer || data.version || 1;
          title = `${data.question ? `Q: ${data.question}` : "Class Q&A"}${ver > 1 ? ` · v${ver}` : ""}`;
          description = sanitizeSnippet(data.answer) || "Official answered question for class inquiries.";
          const assetId = data.socialPreviewMediaAssetId;
          if (assetId) {
            imageUrl = `${endpoint}/storage/buckets/media-assets/files/${assetId}/view?project=${projectId}&v=${ver}`;
          } else {
            imageUrl = resolveStaticCardUrl("qa", id, staticAppUrl, fallbackImage, ver);
          }
        }
      }
    }

    // 4. Subjects (/s/:id)
    else if (targetPath.startsWith("/s/")) {
      const id = targetPath.slice("/s/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        let doc = null;
        const docs = await databases.listDocuments(dbId, "subjects", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        doc = docs.documents?.[0];
        if (!doc) {
          doc = await databases.getDocument(dbId, "subjects", id).catch(() => null);
        }

        if (doc) {
          isFound = true;
          const data = doc.data ? { ...doc, ...doc.data } : doc;
          title = `${data.code} — ${data.name}`;
          description = `Official student portal for ${data.name} (${data.code}). View attendance records, announcements, and resources.`;
          imageUrl = resolveStaticCardUrl("subject", id, staticAppUrl, fallbackImage);
        }
      }
    }

    // 5. Attendance Session (/attendance/:id)
    else if (targetPath.startsWith("/attendance/")) {
      const id = targetPath.slice("/attendance/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        let doc = null;
        const docs = await databases.listDocuments(dbId, "classSessions", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        doc = docs.documents?.[0];
        if (!doc) {
          doc = await databases.getDocument(dbId, "classSessions", id).catch(() => null);
        }

        if (doc) {
          isFound = true;
          const data = doc.data ? { ...doc, ...doc.data } : doc;
          const ver = queryVer || data.version || 1;
          let subjectCode = "CLASS";
          let subjectName = "Class";
          if (data.subjectId && databases) {
            const subjDoc = await databases.getDocument(dbId, "subjects", data.subjectId).catch(() => null);
            if (subjDoc) {
              const sData = subjDoc.data ? { ...subjDoc, ...subjDoc.data } : subjDoc;
              subjectCode = sData.code || subjectCode;
              subjectName = sData.name || subjectName;
            }
          }
          const dateStr = data.startsAt
            ? new Date(data.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "Session";

          if (data.sessionState === "no_class") {
            title = `[${subjectCode}] No Class Notice — ${dateStr}`;
            description = `Class session suspended for ${subjectCode} (${subjectName}). Reason: ${data.noClassReason || "Suspended"}.`;
          } else {
            title = `[${subjectCode}] Attendance — ${dateStr}${ver > 1 ? ` (v${ver})` : ""}`;
            description = `Official verified attendance roster and session status for ${subjectCode} — ${subjectName}.`;
          }
          imageUrl = fallbackImage;
        }
      }
    }

    // 6. Reports (/reports/:id)
    else if (targetPath.startsWith("/reports/")) {
      const id = targetPath.slice("/reports/".length).split("/")[0].split("?")[0].trim();
      if (databases && id) {
        let doc = null;
        const docs = await databases.listDocuments(dbId, "generatedReports", [
          Query.equal("publicId", id),
          Query.limit(1),
        ]).catch(() => ({ documents: [] }));
        doc = docs.documents?.[0];
        if (!doc) {
          doc = await databases.getDocument(dbId, "generatedReports", id).catch(() => null);
        }

        if (doc) {
          isFound = true;
          const data = doc.data ? { ...doc, ...doc.data } : doc;
          const ver = queryVer || data.version || 1;
          title = `${data.title || "Academic & Attendance Summary Report"}${ver > 1 ? ` · v${ver}` : ""}`;
          description = "Official executive summary, attendance rates, and student masterlist records.";
          imageUrl = fallbackImage;
        }
      }
    }
  } catch (err) {
    if (error) error(`Query error during metadata resolution: ${err.message}`);
  }

  // Determine Image MIME Type
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

  return res.text(html, 200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": isFound ? "public, max-age=300, s-maxage=300, stale-while-revalidate=86400" : "public, max-age=60, s-maxage=60",
  });
};
