import "dotenv/config";
import { Client, Databases, Query } from "node-appwrite";
import { ENV } from "../server/_core/env.js";
import { formatSocialTitle, formatShorthandDate } from "../shared/socialTitle.js";
import fs from "node:fs";
import path from "node:path";

function escapeHtml(str: string) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function injectMeta(template: string, {
  title,
  description,
  canonicalPath,
  ogImage = "https://supersec.mjbalubar.tech/og-cover.png",
  ogType = "website",
  jsonLd
}: {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, any>;
}) {
  const fullUrl = `https://supersec.mjbalubar.tech${canonicalPath}`;
  const cleanTitle = escapeHtml(title);
  const cleanDesc = escapeHtml(description.replace(/\s+/g, " ").slice(0, 200));
  const cleanImage = escapeHtml(ogImage.startsWith("/") ? `https://supersec.mjbalubar.tech${ogImage}` : ogImage);

  const headTags = [
    `<title>${cleanTitle}</title>`,
    `<meta name="description" content="${cleanDesc}" />`,
    `<link rel="canonical" href="${escapeHtml(fullUrl)}" />`,
    `<meta property="og:site_name" content="supersec" />`,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:url" content="${escapeHtml(fullUrl)}" />`,
    `<meta property="og:title" content="${cleanTitle}" />`,
    `<meta property="og:description" content="${cleanDesc}" />`,
    `<meta property="og:image" content="${cleanImage}" />`,
    `<meta property="og:image:secure_url" content="${cleanImage}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${cleanTitle}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@supersec" />`,
    `<meta name="twitter:creator" content="@supersec" />`,
    `<meta name="twitter:title" content="${cleanTitle}" />`,
    `<meta name="twitter:description" content="${cleanDesc}" />`,
    `<meta name="twitter:image" content="${cleanImage}" />`,
    jsonLd ? `<script type="application/ld+json" id="page-jsonld">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : ""
  ].filter(Boolean).join("\n    ");

  let clean = template
    .replace(/<title>.*?<\/title>/gis, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:(?:title|description|image|image:secure_url|image:width|image:height|image:type|image:alt|site_name|type|url|locale)["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:(?:card|title|description|image|image:alt|site|creator|url)["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>.*?<\/script>/gis, "");

  return clean.replace("<!--app-head-->", () => headTags);
}

async function prerender() {
  const distDir = path.resolve(process.cwd(), "dist", "public");
  const templatePath = path.join(distDir, "index.html");

  if (!fs.existsSync(templatePath)) {
    console.error("dist/public/index.html not found! Run vite build first.");
    return;
  }

  const template = await fs.promises.readFile(templatePath, "utf-8");

  const endpoint = ENV.appwriteEndpoint;
  const projectId = ENV.appwriteProjectId;
  const apiKey = ENV.appwriteApiKey;
  const dbId = ENV.appwriteDatabaseId;

  if (!projectId || !apiKey) {
    console.log("No Appwrite API key; skipping database pre-rendering.");
    return;
  }

  const client = new Client();
  client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  console.log("⚡ Pre-rendering public pages with exact OpenGraph tags...");

  // 1. Pre-render Subjects
  try {
    const subs = await databases.listDocuments(dbId, "subjects", [Query.limit(100)]);
    for (const sub of subs.documents as any[]) {
      if (!sub.publicId) continue;
      const socialTitle = formatSocialTitle({
        type: "Subject",
        numberOrDate: sub.code,
        version: 1
      });
      const html = injectMeta(template, {
        title: socialTitle,
        description: `${sub.code} · Professor ${sub.professorName || "Professor"} · Official student portal for class updates, announcements, resources, and attendance.`,
        canonicalPath: `/s/${sub.publicId}`,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Course",
          name: sub.name,
          courseCode: sub.code
        }
      });

      const subDir = path.join(distDir, "s", sub.publicId);
      await fs.promises.mkdir(subDir, { recursive: true });
      await fs.promises.writeFile(path.join(subDir, "index.html"), html, "utf-8");

      // Pre-render Q&A route
      const qaTitle = formatSocialTitle({
        type: "Q&A",
        numberOrDate: "Knowledgebase",
        version: 1,
        subjectCode: sub.code
      });
      const qaHtml = injectMeta(template, {
        title: qaTitle,
        description: `Search verified class questions, answers, and FAQs for ${sub.code} — ${sub.name}.`,
        canonicalPath: `/s/${sub.publicId}/questions`,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          name: `${sub.name} Class Q&A`
        }
      });
      const qaDir = path.join(subDir, "questions");
      await fs.promises.mkdir(qaDir, { recursive: true });
      await fs.promises.writeFile(path.join(qaDir, "index.html"), qaHtml, "utf-8");

      console.log(`  ✓ Pre-rendered Subject & Q&A: /s/${sub.publicId}`);
    }
  } catch (err: any) {
    console.warn("  ! Could not pre-render subjects:", err.message);
  }

  // 2. Pre-render Attendance Sessions
  try {
    const attendances = await databases.listDocuments(dbId, "attendance", [Query.limit(100)]);
    for (const att of attendances.documents as any[]) {
      if (!att.publicId) continue;
      let subjectCode = "";
      let subjectName = "Class";
      if (att.subjectId) {
        try {
          const sub = await databases.getDocument(dbId, "subjects", att.subjectId);
          subjectCode = sub.code || "";
          subjectName = sub.name || "Class";
        } catch {}
      }

      const dateShorthand = formatShorthandDate(att.startsAt) || "Session";
      const socialTitle = formatSocialTitle({
        type: "Attendance",
        numberOrDate: dateShorthand,
        version: att.version || 1,
        subjectCode
      });

      const html = injectMeta(template, {
        title: socialTitle,
        description: `Class Attendance for ${subjectCode} — ${subjectName}. Verified roll call attendance session.`,
        canonicalPath: `/attendance/${att.publicId}`,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "EducationEvent",
          name: `${subjectName} Attendance Session`
        }
      });

      const attDir = path.join(distDir, "attendance", att.publicId);
      await fs.promises.mkdir(attDir, { recursive: true });
      await fs.promises.writeFile(path.join(attDir, "index.html"), html, "utf-8");

      // Proof route
      const proofHtml = injectMeta(template, {
        title: "Submit Zoom Attendance Proof",
        description: "Submit Zoom attendance screenshot for instant automated AI verification and present status.",
        canonicalPath: `/attendance/${att.publicId}/proof`
      });
      const proofDir = path.join(attDir, "proof");
      await fs.promises.mkdir(proofDir, { recursive: true });
      await fs.promises.writeFile(path.join(proofDir, "index.html"), proofHtml, "utf-8");

      // Excuse route
      const excuseHtml = injectMeta(template, {
        title: "Submit Excuse Letter",
        description: "Submit excuse letter and supporting documents for secretary review.",
        canonicalPath: `/attendance/${att.publicId}/excuse`
      });
      const excuseDir = path.join(attDir, "excuse");
      await fs.promises.mkdir(excuseDir, { recursive: true });
      await fs.promises.writeFile(path.join(excuseDir, "index.html"), excuseHtml, "utf-8");

      console.log(`  ✓ Pre-rendered Attendance: /attendance/${att.publicId} (${socialTitle})`);
    }
  } catch (err: any) {
    console.warn("  ! Could not pre-render attendances:", err.message);
  }

  // 3. Pre-render Content Items (Announcements, Resources, Questions)
  try {
    const items = await databases.listDocuments(dbId, "content_items", [Query.limit(100)]);
    for (const itm of items.documents as any[]) {
      if (!itm.publicId) continue;
      const kind = itm.kind || "announcement";
      const prefix = kind === "announcement" ? "a" : kind === "resource" ? "r" : "q";
      let subjectCode = "";
      if (itm.subjectId) {
        try {
          const sub = await databases.getDocument(dbId, "subjects", itm.subjectId);
          subjectCode = sub.code || "";
        } catch {}
      }

      const dateShorthand = formatShorthandDate(itm.publishedAt) || `#${itm.version || 1}`;
      const socialTitle = formatSocialTitle({
        type: kind,
        numberOrDate: dateShorthand,
        version: itm.version || 1,
        subjectCode
      });

      const html = injectMeta(template, {
        title: socialTitle,
        description: itm.body ? itm.body.replace(/\s+/g, " ").slice(0, 180) : "Official class post.",
        canonicalPath: `/${prefix}/${itm.publicId}`,
        ogType: "article"
      });

      const itemDir = path.join(distDir, prefix, itm.publicId);
      await fs.promises.mkdir(itemDir, { recursive: true });
      await fs.promises.writeFile(path.join(itemDir, "index.html"), html, "utf-8");

      console.log(`  ✓ Pre-rendered Content Item: /${prefix}/${itm.publicId} (${socialTitle})`);
    }
  } catch (err: any) {
    console.warn("  ! Could not pre-render content items:", err.message);
  }

  // 4. Pre-render Reports
  try {
    const reports = await databases.listDocuments(dbId, "summary_reports", [Query.limit(100)]);
    for (const rep of reports.documents as any[]) {
      if (!rep.publicId) continue;
      const dateShorthand = formatShorthandDate(rep.startsAt) || `#${rep.version || 1}`;
      const socialTitle = formatSocialTitle({
        type: "Report",
        numberOrDate: dateShorthand,
        version: rep.version || 1
      });

      const html = injectMeta(template, {
        title: socialTitle,
        description: `Official summary attendance report for ${rep.title || "Class"}. Version ${rep.version || 1}.`,
        canonicalPath: `/reports/${rep.publicId}`
      });

      const repDir = path.join(distDir, "reports", rep.publicId);
      await fs.promises.mkdir(repDir, { recursive: true });
      await fs.promises.writeFile(path.join(repDir, "index.html"), html, "utf-8");

      console.log(`  ✓ Pre-rendered Report: /reports/${rep.publicId} (${socialTitle})`);
    }
  } catch (err: any) {
    console.warn("  ! Could not pre-render reports:", err.message);
  }

  console.log("✨ Pre-rendering complete!");
}

prerender();
