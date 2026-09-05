import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

export async function renderSvgToPng(svgString: string, outputPath: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; overflow: hidden; background: #0b0f19; }
    svg { display: block; width: 1200px; height: 630px; }
  </style>
</head>
<body>
  ${svgString}
</body>
</html>`;

  await page.setContent(html, { waitUntil: "networkidle" });
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await page.screenshot({ path: outputPath, type: "png" });
  await browser.close();
}
