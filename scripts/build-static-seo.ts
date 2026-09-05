import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { Client, Databases, Query } from "appwrite";
import { formatSocialTitle, formatSocialDescription, formatShorthandDate } from "../shared/socialTitle";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "supersec";
const dbId = process.env.APPWRITE_DATABASE_ID || "supersec_db";

const client = new Client().setEndpoint(endpoint).setProject(projectId);
const db = new Databases(client);

function escapeHtml(str: string) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getCaseVariations(id: string): string[] {
  if (!id) return [];
  const results = new Set<string>();
  results.add(id);

  // Direct swaps
  if (id.includes("l")) results.add(id.replace(/l/g, "I"));
  if (id.includes("I")) results.add(id.replace(/I/g, "l"));
  if (id.includes("0")) results.add(id.replace(/0/g, "O"));
  if (id.includes("O")) results.add(id.replace(/O/g, "0"));

  // Combinatorial swaps if few ambiguous chars
  const chars = id.split("");
  const indices: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "l" || chars[i] === "I" || chars[i] === "0" || chars[i] === "O") {
      indices.push(i);
    }
  }

  if (indices.length > 0 && indices.length <= 4) {
    const combos = 1 << indices.length;
    for (let c = 0; c < combos; c++) {
      const arr = [...chars];
      for (let j = 0; j < indices.length; j++) {
        const idx = indices[j];
        const isSet = (c & (1 << j)) !== 0;
        const ch = chars[idx];
        if (ch === "l" || ch === "I") {
          arr[idx] = isSet ? "I" : "l";
        } else if (ch === "0" || ch === "O") {
          arr[idx] = isSet ? "O" : "0";
        }
      }
      results.add(arr.join(""));
    }
  }

  return Array.from(results);
}

function injectMeta(
  template: string,
  {
    title,
    description,
    canonicalPath,
    ogImage = "https://supersec.mjbalubar.tech/og-cover.png",
    ogType = "website",
    jsonLd,
  }: {
    title: string;
    description: string;
    canonicalPath: string;
    ogImage?: string;
    ogType?: string;
    jsonLd?: Record<string, any>;
  }
) {
  // Normalize directory canonicalPath with a trailing slash so that it matches server 301 behavior
  const normalizedPath = canonicalPath.endsWith("/")
    ? canonicalPath
    : canonicalPath.includes(".")
      ? canonicalPath
      : `${canonicalPath}/`;
  const fullUrl = `https://supersec.mjbalubar.tech${normalizedPath}`;
  const cleanTitle = escapeHtml(title);
  const cleanDesc = escapeHtml(description.replace(/\s+/g, " ").slice(0, 200));
  const rawImage = ogImage.startsWith("/") ? `https://supersec.mjbalubar.tech${ogImage}` : ogImage;
  const cleanImage = escapeHtml(rawImage);
  const isJpg = cleanImage.includes(".jpg") || cleanImage.includes(".jpeg");
  const isPng = cleanImage.includes(".png");
  const isWebp = cleanImage.includes(".webp");
  const imageMime = isJpg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";

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
    `<meta property="og:image:type" content="${imageMime}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${cleanTitle}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@supersec" />`,
    `<meta name="twitter:creator" content="@supersec" />`,
    `<meta name="twitter:title" content="${cleanTitle}" />`,
    `<meta name="twitter:description" content="${cleanDesc}" />`,
    `<meta name="twitter:image" content="${cleanImage}" />`,
    `<meta name="twitter:image:width" content="1200" />`,
    `<meta name="twitter:image:height" content="630" />`,
    jsonLd ? `<script type="application/ld+json" id="page-jsonld">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  let clean = template
    .replace(/<title>.*?<\/title>/gis, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:(?:title|description|image|image:secure_url|image:width|image:height|image:type|image:alt|site_name|type|url|locale)["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:(?:card|title|description|image|image:width|image:height|image:alt|site|creator|url)["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>.*?<\/script>/gis, "");

  return clean.replace("<!--app-head-->", () => headTags);
}

export interface StaticRouteItem {
  path: string;
  title: string;
  description: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, any>;
}

export async function buildStaticSeoPages() {
  const distDir = path.resolve(process.cwd(), "dist", "public");
  const templatePath = path.join(distDir, "index.html");

  if (!fs.existsSync(templatePath)) {
    console.error("dist/public/index.html not found! Run vite build first.");
    return;
  }

  const template = await fs.promises.readFile(templatePath, "utf-8");
  const routes: StaticRouteItem[] = [];

  const addRoute = (route: StaticRouteItem) => {
    routes.push(route);
  };

  // Core application routes for SPA static hosting
  addRoute({
    path: "/login",
    title: "Secretary Sign In — supersec",
    description: "Sign in to supersec class secretary management workspace.",
  });
  addRoute({
    path: "/app",
    title: "Secretary Desk — supersec",
    description: "supersec class secretary management workspace.",
  });
  addRoute({
    path: "/app/subjects",
    title: "Subject Desks — supersec",
    description: "Manage class subject desks, weekly rhythms, and student rosters.",
  });
  addRoute({
    path: "/app/reports",
    title: "Reports Desk — supersec",
    description: "View and export verified attendance records.",
  });
  addRoute({
    path: "/app/settings",
    title: "Workspace Settings — supersec",
    description: "Manage secretary profile, color mode, and preferences.",
  });
  addRoute({
    path: "/app/templates",
    title: "Message Snippets — supersec",
    description: "Fast messenger blast templates and snippets.",
  });
  addRoute({
    path: "/app/notes",
    title: "Notes Desk — supersec",
    description: "Rich-text notes and lecture references.",
  });
  addRoute({
    path: "/app/archive",
    title: "Archive — supersec",
    description: "Retained class items and past records.",
  });

  try {
    console.log("Fetching live published documents from Appwrite Cloud DB...");
    const [subsRes, sessRes, annRes, resRes, qaRes] = await Promise.all([
      db.listDocuments(dbId, "subjects", [Query.limit(100)]),
      db.listDocuments(dbId, "classSessions", [Query.limit(100)]),
      db.listDocuments(dbId, "announcements", [Query.limit(100)]),
      db.listDocuments(dbId, "resources", [Query.limit(100)]),
      db.listDocuments(dbId, "questionsAnswers", [Query.limit(100)]),
    ]);

    const subjectsMap = new Map<string, any>();
    for (const sub of subsRes.documents) {
      subjectsMap.set(sub.$id, sub);
      subjectsMap.set(sub.publicId, sub);
      subjectsMap.set(sub.code, sub);

      const subTitle = formatSocialTitle({
        type: "Subject",
        contentTitle: sub.name,
        subjectCode: sub.code,
        numberOrDate: sub.code,
        version: 1,
      });
      const subDesc = formatSocialDescription({
        type: "subject",
        subjectCode: sub.code,
        subjectName: sub.name,
        professorName: sub.professorName || "Ariel Casimiro",
      });
      const subJsonLd = {
        "@context": "https://schema.org",
        "@type": "Course",
        name: sub.name,
        courseCode: sub.code,
      };

      // Primary publicId route and case variations (e.g. gsI_ywvWRr6G <-> gsl_ywvWRr6G)
      const subVariants = getCaseVariations(sub.publicId);
      for (const variant of subVariants) {
        addRoute({
          path: `/s/${variant}`,
          title: subTitle,
          description: subDesc,
          ogImage: `https://supersec.mjbalubar.tech/og/subject-${variant}.jpg`,
          jsonLd: subJsonLd,
        });

        // Subject sub-hubs
        addRoute({
          path: `/s/${variant}/questions`,
          title: formatSocialTitle({ type: "Q&A", contentTitle: "Knowledgebase", numberOrDate: "Knowledgebase", version: 1, subjectCode: sub.code }),
          description: formatSocialDescription({ type: "qa_hub", subjectCode: sub.code, subjectName: sub.name }),
          ogImage: `https://supersec.mjbalubar.tech/og/qa-${variant}.jpg`,
          jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", name: `${sub.name} Class Q&A` },
        });

        addRoute({
          path: `/s/${variant}/resources`,
          title: formatSocialTitle({ type: "Resource", contentTitle: "Resources", numberOrDate: "Resources", version: 1, subjectCode: sub.code }),
          description: formatSocialDescription({ type: "resource", subjectCode: sub.code, subjectName: sub.name, category: "Resources" }),
          ogImage: `https://supersec.mjbalubar.tech/og/resource-${variant}.jpg`,
        });

        addRoute({
          path: `/s/${variant}/announcements`,
          title: formatSocialTitle({ type: "Announcement", contentTitle: "Announcements", numberOrDate: "Announcements", version: 1, subjectCode: sub.code }),
          description: formatSocialDescription({ type: "announcement", subjectCode: sub.code, subjectName: sub.name }),
          ogImage: `https://supersec.mjbalubar.tech/og/announcement-${variant}.jpg`,
        });
      }

      // Vanity code route
      addRoute({
        path: `/s/${sub.code}`,
        title: subTitle,
        description: subDesc,
        ogImage: `https://supersec.mjbalubar.tech/og/subject-${sub.code}.jpg`,
        jsonLd: subJsonLd,
      });
      addRoute({
        path: `/s/${sub.code}/questions`,
        title: formatSocialTitle({ type: "Q&A", contentTitle: "Knowledgebase", numberOrDate: "Knowledgebase", version: 1, subjectCode: sub.code }),
        description: formatSocialDescription({ type: "qa_hub", subjectCode: sub.code, subjectName: sub.name }),
        ogImage: `https://supersec.mjbalubar.tech/og/qa-${sub.code}.jpg`,
        jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", name: `${sub.name} Class Q&A` },
      });
      addRoute({
        path: `/s/${sub.code}/resources`,
        title: formatSocialTitle({ type: "Resource", contentTitle: "Resources", numberOrDate: "Resources", version: 1, subjectCode: sub.code }),
        description: formatSocialDescription({ type: "resource", subjectCode: sub.code, subjectName: sub.name, category: "Resources" }),
        ogImage: `https://supersec.mjbalubar.tech/og/resource-${sub.code}.jpg`,
      });
      addRoute({
        path: `/s/${sub.code}/announcements`,
        title: formatSocialTitle({ type: "Announcement", contentTitle: "Announcements", numberOrDate: "Announcements", version: 1, subjectCode: sub.code }),
        description: formatSocialDescription({ type: "announcement", subjectCode: sub.code, subjectName: sub.name }),
        ogImage: `https://supersec.mjbalubar.tech/og/announcement-${sub.code}.jpg`,
      });
    }

    // Sessions & Attendance
    for (const sess of sessRes.documents) {
      const sub = subjectsMap.get(sess.subjectId);
      const subCode = sub?.code || "OLCBTQM01";
      const dateShorthand = formatShorthandDate(sess.startsAt) || "Session";
      const attTitle = formatSocialTitle({
        type: "Attendance",
        numberOrDate: dateShorthand,
        version: sess.version || 1,
        subjectCode: subCode,
      });
      const desc = formatSocialDescription({
        type: "attendance",
        subjectCode: subCode,
        subjectName: sub?.name,
        date: sess.startsAt,
      });
      const sessVariants = getCaseVariations(sess.publicId);

      for (const variant of sessVariants) {
        const attImg = `https://supersec.mjbalubar.tech/og/attendance-${variant}.jpg`;

        addRoute({
          path: `/attendance/${variant}`,
          title: attTitle,
          description: desc,
          ogImage: attImg,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "EducationEvent",
            name: `${subCode} Class Session Attendance`,
            startDate: sess.startsAt,
          },
        });

        addRoute({
          path: `/attendance/${variant}/proof`,
          title: formatSocialTitle({ type: "Proof", subjectCode: subCode }),
          description: formatSocialDescription({ type: "proof", subjectCode: subCode, subjectName: sub?.name }),
          ogImage: `https://supersec.mjbalubar.tech/og/proof-${variant}.jpg`,
        });

        addRoute({
          path: `/attendance/${variant}/excuse`,
          title: formatSocialTitle({ type: "Excuse", subjectCode: subCode }),
          description: formatSocialDescription({ type: "excuse", subjectCode: subCode, subjectName: sub?.name }),
          ogImage: `https://supersec.mjbalubar.tech/og/excuse-${variant}.jpg`,
        });
      }
    }

    // Announcements
    for (const ann of annRes.documents) {
      if (ann.publishState !== "published" && ann.publishState !== "draft") continue;
      const sub = subjectsMap.get(ann.subjectId);
      const subCode = sub?.code || (ann.subjectId === "6a945a60001d23fe6d00" ? "SEC 401" : "OLCBTQM01");
      const dateShorthand = formatShorthandDate(ann.publishedAt || ann.$createdAt) || `#${ann.version || 1}`;
      const annTitle = formatSocialTitle({
        type: "Announcement",
        contentTitle: ann.title,
        numberOrDate: dateShorthand,
        version: ann.version || 1,
        subjectCode: subCode,
      });
      const annDesc = formatSocialDescription({
        type: "announcement",
        subjectCode: subCode,
        subjectName: sub?.name,
        contentTitle: ann.title,
        contentBody: ann.body,
        date: ann.publishedAt || ann.$createdAt,
        version: ann.version || 1,
      });
      const annVariants = getCaseVariations(ann.publicId);

      for (const variant of annVariants) {
        addRoute({
          path: `/a/${variant}`,
          title: annTitle,
          description: annDesc,
          ogImage: `https://supersec.mjbalubar.tech/og/announcement-${variant}.jpg`,
          ogType: "article",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: ann.title,
            datePublished: ann.publishedAt || ann.$createdAt,
          },
        });
      }
    }

    // Resources
    for (const resDoc of resRes.documents) {
      if (resDoc.publishState !== "published" && resDoc.publishState !== "draft") continue;
      const sub = subjectsMap.get(resDoc.subjectId);
      const subCode = sub?.code || "OLCBTQM01";
      const dateShorthand = formatShorthandDate(resDoc.publishedAt || resDoc.$createdAt) || `#${resDoc.version || 1}`;
      const resTitle = formatSocialTitle({
        type: "Resource",
        contentTitle: resDoc.title,
        numberOrDate: dateShorthand,
        version: resDoc.version || 1,
        subjectCode: subCode,
      });
      const resDesc = formatSocialDescription({
        type: "resource",
        subjectCode: subCode,
        subjectName: sub?.name,
        contentTitle: resDoc.title,
        contentBody: resDoc.description,
        category: resDoc.category,
        date: resDoc.publishedAt || resDoc.$createdAt,
        version: resDoc.version || 1,
      });
      const resVariants = getCaseVariations(resDoc.publicId);

      for (const variant of resVariants) {
        addRoute({
          path: `/r/${variant}`,
          title: resTitle,
          description: resDesc,
          ogImage: `https://supersec.mjbalubar.tech/og/resource-${variant}.jpg`,
          ogType: "article",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "LearningResource",
            name: resDoc.title,
            description: resDoc.description,
            url: resDoc.destinationUrl,
          },
        });
      }
    }

    // Questions & Answers (Q&A)
    for (const qa of qaRes.documents) {
      if (qa.publishState !== "published" && qa.publishState !== "draft") continue;
      const sub = subjectsMap.get(qa.subjectId);
      const subCode = sub?.code || (qa.subjectId === "6a945a60001d23fe6d00" ? "SEC 401" : "OLCBTQM01");
      const cleanQaTitle = (qa.question || "").replace(/^(Official|Unofficial)\s*answer\s*—\s*/i, "");
      const qaTitle = formatSocialTitle({
        type: "Q&A",
        contentTitle: cleanQaTitle,
        numberOrDate: "#1",
        version: qa.version || 1,
        subjectCode: subCode,
      });

      const qaDesc = formatSocialDescription({
        type: "question",
        subjectCode: subCode,
        subjectName: sub?.name,
        contentTitle: cleanQaTitle,
        contentBody: qa.answer,
        version: qa.version || 1,
      });
      const qaVariants = getCaseVariations(qa.publicId);

      for (const variant of qaVariants) {
        addRoute({
          path: `/q/${variant}`,
          title: qaTitle,
          description: qaDesc,
          ogImage: `https://supersec.mjbalubar.tech/og/qa-${variant}.jpg`,
          ogType: "article",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "QAPage",
            mainEntity: {
              "@type": "Question",
              name: qa.question,
              text: qa.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: qa.answer,
              },
            },
          },
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live Appwrite documents, relying on base routes:", err);
  }

  console.log(`🔨 Pre-rendering ${routes.length} static SEO routes with unique OG covers...`);

  for (const route of routes) {
    const html = injectMeta(template, {
      title: route.title,
      description: route.description,
      canonicalPath: route.path,
      ogImage: route.ogImage,
      ogType: route.ogType || "website",
      jsonLd: route.jsonLd,
    });

    const segments = route.path.split("/").filter(Boolean);
    const targetDir = path.join(distDir, ...segments);
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(path.join(targetDir, "index.html"), html, "utf-8");

    // Also write targetDir + ".html" (e.g. dist/public/s/gsI_ywvWRr6G.html)
    // so servers that resolve without trailing slash serve the pre-rendered page immediately
    if (segments.length > 0) {
      await fs.promises.writeFile(`${targetDir}.html`, html, "utf-8");
    }
  }

  // Generate 404.html as SPA fallback for static hosting providers like Appwrite Sites
  await fs.promises.writeFile(path.join(distDir, "404.html"), template, "utf-8");
  console.log(`  ✓ Generated dist/public/404.html SPA fallback`);

  console.log(`  ✓ Successfully built ${routes.length} static SEO routes`);

  // Sync all OG files (.jpg, .png, .svg) from client/public/og to dist/public/og and generate case alias files
  const srcOgDir = path.resolve(process.cwd(), "client", "public", "og");
  const destOgDir = path.resolve(process.cwd(), "dist", "public", "og");
  if (fs.existsSync(srcOgDir)) {
    await fs.promises.mkdir(destOgDir, { recursive: true });
    const ogFiles = await fs.promises.readdir(srcOgDir);
    for (const f of ogFiles) {
      if (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".svg")) {
        const srcFile = path.join(srcOgDir, f);
        await fs.promises.copyFile(srcFile, path.join(destOgDir, f));

        // Create case-variation alias files (e.g. subject-gsI_ywvWRr6G.jpg <-> subject-gsl_ywvWRr6G.jpg)
        const ext = path.extname(f);
        const baseName = path.basename(f, ext);
        const variations = getCaseVariations(baseName);
        for (const variant of variations) {
          if (variant !== baseName) {
            const aliasDest = path.join(destOgDir, `${variant}${ext}`);
            await fs.promises.copyFile(srcFile, aliasDest);
          }
        }
      }
    }
    console.log(`  ✓ Synced OG card images (.jpg, .png) and generated alias files into dist/public/og/`);
  }

  console.log("🎉 All static OpenGraph pages and JPEG covers successfully generated into dist/public!");
}

buildStaticSeoPages();
