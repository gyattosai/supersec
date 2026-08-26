const { chromium } = require("/home/ubuntu/skills/playwright-skill/node_modules/playwright");

const routes = [
  "http://127.0.0.1:3000/",
  "http://127.0.0.1:3000/a/vHBJrX_4SKpS",
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const route of routes) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.keyboard.press("Tab");
      const result = await page.evaluate(() => {
        const element = document.activeElement;
        const style = element ? getComputedStyle(element) : null;
        return {
          tag: element?.tagName ?? null,
          text: element?.textContent?.trim().slice(0, 80) ?? null,
          outlineStyle: style?.outlineStyle ?? null,
          outlineWidth: style?.outlineWidth ?? null,
          outlineColor: style?.outlineColor ?? null,
          outlineOffset: style?.outlineOffset ?? null,
          boxShadow: style?.boxShadow ?? null,
        };
      });
      console.log(JSON.stringify({ route, ...result }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
