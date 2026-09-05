import fs from "node:fs";
import path from "node:path";

async function unpack() {
  const possiblePaths = [
    path.resolve(process.env.LOCALAPPDATA || "", "Programs", "antigravity", ".playwright-mcp", "og-cards.json"),
    path.resolve(process.env.LOCALAPPDATA || "", "Programs", "antigravity", "og-cards.json"),
    path.resolve(process.cwd(), "og-cards.json"),
    path.resolve(process.cwd(), ".playwright-mcp", "og-cards.json")
  ];

  let rawData = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`Found og-cards.json at: ${p}`);
      rawData = fs.readFileSync(p, "utf-8");
      break;
    }
  }

  if (!rawData) {
    console.error("Could not find og-cards.json!");
    return;
  }

  const parsed = JSON.parse(rawData);
  // It might be double-stringified if JSON.stringify was passed
  const pngs = typeof parsed === "string" ? JSON.parse(parsed) : parsed;

  const targetDir = path.resolve(process.cwd(), "client", "public", "og");
  await fs.promises.mkdir(targetDir, { recursive: true });

  const distTargetDir = path.resolve(process.cwd(), "dist", "public", "og");
  await fs.promises.mkdir(distTargetDir, { recursive: true });

  for (const [filename, dataUrl] of Object.entries(pngs)) {
    const base64Data = (dataUrl as string).replace(/^data:image\/(png|jpeg);base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    const clientPath = path.join(targetDir, filename);
    await fs.promises.writeFile(clientPath, buffer);

    const distPath = path.join(distTargetDir, filename);
    await fs.promises.writeFile(distPath, buffer);

    console.log(`  ✓ Saved ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  console.log("✨ All OpenGraph card PNGs unpacked successfully!");
}

unpack();
