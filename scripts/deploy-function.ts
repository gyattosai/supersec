import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  const projectId = process.env.APPWRITE_PROJECT_ID || "supersec";
  const apiKey =
    process.env.APPWRITE_DEPLOY_KEY ||
    "standard_405aa70c8e70ab958325569cd5d3f23d170c284864daf8d2e52e5b35ae03a03ccaaa9c5b8b24b8586f654fe74d6c2dc82babb0f810a3e9236fb5a6e5924fccf465e58a83d1944e9af98dfde498ce341747b2f0f88c006dd3d7e4a05dd4da6aed0912db8120febfa89c2a6a0d34bfb72b486d40f2bffa70f26764a879c892b717";
  const endpoint = "https://sgp.cloud.appwrite.io/v1";
  const functionId = "og-router";

  if (!apiKey) {
    console.error("Missing APPWRITE_API_KEY");
    process.exit(1);
  }

  const funcDir = path.resolve("functions/og-router");
  const tarPath = path.resolve("og-router.tar.gz");

  if (fs.existsSync(tarPath)) {
    fs.unlinkSync(tarPath);
  }

  console.log("1. Packaging functions/og-router into og-router.tar.gz...");
  execSync(`tar -czf "${tarPath}" -C "${funcDir}" package.json src`, { stdio: "inherit" });

  const stats = fs.statSync(tarPath);
  console.log(`Package size: ${(stats.size / 1024).toFixed(2)} KB`);

  const fileBuffer = fs.readFileSync(tarPath);

  console.log(`2. Uploading deployment to function '${functionId}'...`);
  const form = new FormData();
  form.append("entrypoint", "src/main.js");
  form.append("commands", "npm install");
  form.append("activate", "true");
  const blob = new Blob([fileBuffer], { type: "application/gzip" });
  form.append("code", blob, "og-router.tar.gz");

  const deployRes = await fetch(`${endpoint}/functions/${functionId}/deployments`, {
    method: "POST",
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
    },
    body: form,
  });

  if (!deployRes.ok) {
    const errText = await deployRes.text();
    throw new Error(`Deployment upload failed (${deployRes.status}): ${errText}`);
  }

  const deployJson: any = await deployRes.json();
  console.log(`Deployment created: ${deployJson.$id} (Status: ${deployJson.status})`);

  console.log("3. Polling build status...");
  let status = deployJson.status;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const statusRes = await fetch(`${endpoint}/functions/${functionId}/deployments/${deployJson.$id}`, {
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
    });

    if (statusRes.ok) {
      const current: any = await statusRes.json();
      status = current.status;
      console.log(`   Attempt ${attempt + 1}: status = ${status}`);
      if (status === "ready") {
        console.log(`✅ Build succeeded and deployment is active!`);
        console.log(`Function endpoint: https://${functionId}.${projectId}.appwrite.global or via Appwrite Cloud Functions`);
        if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
        return;
      }
      if (status === "failed") {
        console.error(`❌ Build failed:`, current.buildStderr || current.errors);
        process.exit(1);
      }
    }
  }

  console.warn(`Deployment build still processing (${status}).`);
  if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
