import fs from "fs";
import path from "path";

const distDir = path.resolve("dist/public");
const indexFile = path.join(distDir, "index.html");

if (fs.existsSync(indexFile)) {
  const html = fs.readFileSync(indexFile, "utf-8");

  // 1. SPA fallback file for static hosts (Appwrite Sites, CDNs)
  fs.writeFileSync(path.join(distDir, "404.html"), html, "utf-8");
  console.log("✓ Generated dist/public/404.html");

  // 2. Pre-generate common core SPA entry routes
  const coreRoutes = [
    "login",
    "register",
    "auth",
    "app",
    "app/subjects",
    "app/reports",
    "app/settings",
    "app/templates",
    "app/notes",
    "app/archive",
    "404",
  ];

  for (const r of coreRoutes) {
    const dir = path.join(distDir, r);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
  }
  console.log(`✓ Pre-generated ${coreRoutes.length} core SPA route directories`);
}
