import "dotenv/config";
import fs from "fs";
import { execSync } from "child_process";

async function main() {
  const projectId = process.env.APPWRITE_PROJECT_ID || "supersec";
  const apiKey = process.env.APPWRITE_API_KEY;
  const endpoint = "https://sgp.cloud.appwrite.io/v1";

  if (!apiKey) {
    console.error("Missing APPWRITE_API_KEY");
    process.exit(1);
  }

  // 1. Prune unused / alias cards from client/public/og
  const ogDir = "client/public/og";
  if (fs.existsSync(ogDir)) {
    const keepPrefixes = [
      "subject-",
      "attendance-",
      "announcement-wZqXVKLoCRv_",
      "announcement-hHJ5_F2T9eNN",
      "announcement-KhXF3duS4hLw",
      "announcement-rpsH",
      "announcement-OLCB",
      "announcement-SEC",
      "announcement-gs",
      "resource-LbTUmb5QfHjT",
      "resource-kD146CSPbFZZ",
      "resource-1_ddWb5tiUuY",
      "resource-2M0",
      "resource-OLCB",
      "resource-SEC",
      "resource-gs",
      "qa-qMLs9Dku88",
      "qa-vdJGSv913ZrS",
      "qa-71_e9ukG",
      "qa-8sYDr-bqijKM",
      "qa-qxAjiTe-SGiG",
      "qa-OLCB",
      "qa-SEC",
      "qa-gs",
    ];
    const files = fs.readdirSync(ogDir);
    let removed = 0;
    for (const f of files) {
      if (f.endsWith(".png") || !keepPrefixes.some((p) => f.startsWith(p))) {
        fs.unlinkSync(`${ogDir}/${f}`);
        removed++;
      }
    }
    console.log(`Pruned ${removed} unused cards from ${ogDir}`);
  }

  // 2. Clean temporary tar/test files
  const tempFiles = [
    "code.tar.gz",
    "test-code.tar.gz",
    "test-size.tar.gz",
    "test-clean.tar.gz",
    "test-pack.tar.gz",
    "og-svgs.json",
    "scripts/render-runner.html",
    "client/public/render-cards.html",
  ];
  for (const tf of tempFiles) {
    if (fs.existsSync(tf)) {
      try {
        fs.unlinkSync(tf);
      } catch (e) {}
    }
  }

  console.log("3. Packaging codebase into code.tar.gz...");
  execSync(
    'tar -czf code.tar.gz --exclude="node_modules" --exclude="dist" --exclude=".git" --exclude=".agents" --exclude=".project" --exclude=".manus-logs" --exclude="scratch" --exclude="*.tar.gz" --exclude="og-svgs.json" --exclude="og-cards.json" --exclude="scripts/render-*.html" --exclude="client/public/render-cards.html" --exclude="client/public/og/*.png" --exclude="test-*" --exclude=".playwright-mcp" .',
    { stdio: "inherit" }
  );

  const stats = fs.statSync("code.tar.gz");
  console.log(`Package created (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  const fileBuffer = fs.readFileSync("code.tar.gz");

  async function uploadChunked(
    url: string,
    buffer: Buffer,
    filename: string,
    fieldName: string,
    extraFields: Record<string, string>,
    headers: Record<string, string>,
    chunkSize: number = 20 * 1024 * 1024 // Direct upload for packages under 20MB
  ) {
    const totalSize = buffer.length;
    if (totalSize <= chunkSize) {
      const form = new FormData();
      for (const [k, v] of Object.entries(extraFields)) {
        form.append(k, v);
      }
      const blob = new Blob([buffer], { type: "application/gzip" });
      form.append(fieldName, blob, filename);

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: form,
      });
      if (!res.ok) {
        throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
      }
      return await res.json();
    }

    let start = 0;
    let uploadId = "";
    let lastResponse: any = null;
    let chunkIndex = 0;
    const totalChunks = Math.ceil(totalSize / chunkSize);

    while (start < totalSize) {
      const end = Math.min(start + chunkSize, totalSize);
      const chunkBuffer = buffer.subarray(start, end);
      const chunkBlob = new Blob([chunkBuffer], { type: "application/gzip" });

      const form = new FormData();
      for (const [k, v] of Object.entries(extraFields)) {
        form.append(k, v);
      }
      form.append(fieldName, chunkBlob, filename);

      const chunkHeaders: Record<string, string> = {
        ...headers,
        "Content-Range": `bytes ${start}-${end - 1}/${totalSize}`,
      };
      if (uploadId) {
        chunkHeaders["x-appwrite-id"] = uploadId;
      }

      console.log(`  Uploading chunk ${chunkIndex + 1}/${totalChunks} (${((end - start) / 1024 / 1024).toFixed(2)} MB)...`);
      const res = await fetch(url, {
        method: "POST",
        headers: chunkHeaders,
        body: form,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Chunk ${chunkIndex + 1} upload failed (${res.status}): ${errText}`);
      }

      lastResponse = await res.json();
      if (lastResponse && lastResponse.$id && !uploadId) {
        uploadId = lastResponse.$id;
      }

      start = end;
      chunkIndex++;
    }

    return lastResponse;
  }

  try {
    console.log("2. Archiving code.tar.gz to Appwrite Storage bucket 'media-assets'...");
    const uploadJson = await uploadChunked(
      `${endpoint}/storage/buckets/media-assets/files`,
      fileBuffer,
      "code.tar.gz",
      "file",
      { fileId: "unique()", "permissions[]": 'read("any")' },
      {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      }
    );
    console.log(`Archived file ID: ${uploadJson?.$id}`);
  } catch (err) {
    console.warn("Storage archive skipped (non-critical error):", err);
  }

  console.log("3. Triggering Appwrite Sites deployment for site 'supersec'...");
  let deployJson: { $id: string; status: string };
  try {
    deployJson = await uploadChunked(
      `${endpoint}/sites/supersec/deployments`,
      fileBuffer,
      "code.tar.gz",
      "code",
      { activate: "true" },
      {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      }
    );
  } catch (err) {
    console.error("Deploy failed:", err);
    process.exit(1);
  }

  console.log(`Deployment created: ${deployJson.$id} (status: ${deployJson.status})`);

  console.log("4. Monitoring deployment progress...");
  let status = deployJson.status;
  while (status === "processing" || status === "building" || status === "waiting") {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    const statusRes = await fetch(
      `${endpoint}/sites/supersec/deployments/${deployJson.$id}`,
      {
        headers: {
          "X-Appwrite-Project": projectId,
          "X-Appwrite-Key": apiKey,
        },
      }
    );
    if (statusRes.ok) {
      const statusJson = (await statusRes.json()) as { $id: string; status: string; buildLogs?: string };
      status = statusJson.status;
      console.log(`  → Deployment ${deployJson.$id} status: ${status}`);
      if (status === "ready") {
        console.log("🚀 Deployment is LIVE and READY!");
        break;
      }
      if (status === "failed") {
        console.error("❌ Deployment failed!");
        console.error("Build logs:\n", statusJson.buildLogs);
        process.exit(1);
      }
    }
  }
}

main().catch(console.error);
