import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import superjson from "superjson";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { buildSsrPrefetch } from "./ssrCaller";
import type { HeadMeta } from "../../client/src/ssr/prefetch";

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const defaultOrigin = process.env.CANONICAL_ORIGIN || "https://supersec.mjbalubar.tech";
const siteName = process.env.SITE_NAME ?? "supersec";

function headTags(head: HeadMeta, reqOrigin?: string) {
  const origin = reqOrigin || defaultOrigin;
  const title = escapeHtml(head.title.slice(0, 70));
  const description = escapeHtml(head.description.replace(/\s+/g, " ").slice(0, 200));
  const canonical = head.canonicalPath ? (head.canonicalPath.startsWith("http") ? head.canonicalPath : `${origin}${head.canonicalPath}`) : "";
  const rawImage = head.ogImage || "/api/og?type=subject&title=supersec";
  const image = rawImage.startsWith("/") ? `${origin}${rawImage}` : rawImage;
  const isJpg = image.includes(".jpg") || image.includes(".jpeg");
  const isPng = image.includes(".png");
  const isWebp = image.includes(".webp");
  const imageMime = isJpg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:type" content="${head.ogType ?? "website"}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" />` : "",
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : "",
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:type" content="${imageMime}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtml(head.ogImageAlt || title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:image:width" content="1200" />`,
    `<meta name="twitter:image:height" content="630" />`,
    head.publishedTime ? `<meta property="article:published_time" content="${escapeHtml(head.publishedTime)}" />` : "",
    head.noindex || head.notFound ? `<meta name="robots" content="noindex, follow" />` : "",
    head.jsonLd ? `<script type="application/ld+json" id="page-jsonld">${JSON.stringify(head.jsonLd).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n");
}

function composeHtml(template: string, html: string, head: HeadMeta, state: unknown, reqOrigin?: string) {
  const serialized = JSON.stringify(superjson.serialize(state)).replace(/</g, "\\u003c");
  let cleanTemplate = template
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:(?:title|description|image|image:secure_url|image:width|image:height|image:type|image:alt|site_name|type|url|locale)["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:(?:card|title|description|image|image:width|image:height|image:alt|site|creator|url)["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");

  return cleanTemplate
    .replace("</body>", () => `<script>window.__RQ_STATE__=${serialized}</script></body>`)
    .replace("<!--app-head-->", () => headTags(head, reqOrigin))
    .replace("<!--app-html-->", () => html);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({ ...viteConfig, configFile: false, server: { middlewareMode: true, hmr: { server }, allowedHosts: true as const }, appType: "custom" });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const reqOrigin = `${req.protocol}://${req.get("host")}`;
    try {
      const clientTemplate = path.resolve(import.meta.dirname, "../..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/entry-client.tsx"`, `src="/src/entry-client.tsx?v=${nanoid()}"`);
      template = await vite.transformIndexHtml(url, template);
      template = template.replace("</head>", `<link rel="stylesheet" href="/src/index.css?direct" data-ssr-dev-css></head>`);
      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const prefetch = await buildSsrPrefetch(req, res);
      const output = await render(url, prefetch);
      res.status(output.head.notFound ? 404 : 200).set("Cache-Control", "no-cache").type("html").end(composeHtml(template, output.html, output.head, output.dehydratedState, reqOrigin));
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = process.env.NODE_ENV === "development" ? path.resolve(import.meta.dirname, "../..", "dist", "public") : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) console.error("Could not find the build directory: " + distPath);
  app.use((req, res, next) => {
    if (req.path === "/index.html") return res.redirect(301, "/");
    if (req.path !== "/" && /\/+$/.test(req.path)) return res.redirect(301, req.path.replace(/\/+$/, "") + req.originalUrl.slice(req.path.length));
    next();
  });
  app.use(express.static(distPath, { index: false, redirect: false }));
  app.use("*", async (req, res) => {
    const cleanReqPath = req.path.replace(/^\/+/, "");
    if (cleanReqPath) {
      const possibleStaticFiles = [
        path.resolve(distPath, cleanReqPath, "index.html"),
        path.resolve(distPath, `${cleanReqPath}.html`),
      ];
      for (const file of possibleStaticFiles) {
        if (fs.existsSync(file) && fs.statSync(file).isFile()) {
          return res.sendFile(file);
        }
      }
    }

    const template = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
    const reqOrigin = `${req.protocol}://${req.get("host")}`;
    try {
      const entryPath = path.resolve(import.meta.dirname, "server-ssr", "entry-server.js");
      const { render } = await import(entryPath);
      const output = await render(req.originalUrl, await buildSsrPrefetch(req, res));
      res.status(output.head.notFound ? 404 : 200).set("Cache-Control", "no-cache").type("html").end(composeHtml(template, output.html, output.head, output.dehydratedState, reqOrigin));
    } catch (error) {
      console.error("[SSR] render failed, serving shell:", error);
      let fallbackTitle = `${siteName} — Class Secretary Management System`;
      let fallbackDesc = "A class secretary management system for private class operations and published class updates.";
      if (req.path.startsWith("/a/")) {
        fallbackTitle = `Class Announcement · ${siteName}`;
        fallbackDesc = "Official class announcement and updates on supersec.";
      } else if (req.path.startsWith("/r/")) {
        fallbackTitle = `Class Resource · ${siteName}`;
        fallbackDesc = "Official course resource and study materials on supersec.";
      } else if (req.path.startsWith("/q/")) {
        fallbackTitle = `Class Q&A · ${siteName}`;
        fallbackDesc = "Frequently asked class question and verified answer on supersec.";
      } else if (req.path.startsWith("/s/")) {
        fallbackTitle = `Class Portal · ${siteName}`;
        fallbackDesc = "Official student desk and class portal on supersec.";
      } else if (req.path.startsWith("/attendance/")) {
        fallbackTitle = `Class Attendance · ${siteName}`;
        fallbackDesc = "Official class session attendance roll call on supersec.";
      }
      res.status(200).set("Cache-Control", "no-cache").type("html").end(template.replace("<!--app-head-->", () => headTags({ title: fallbackTitle, description: fallbackDesc, canonicalPath: req.path }, reqOrigin)).replace("<!--app-html-->", () => ""));
    }
  });
}
