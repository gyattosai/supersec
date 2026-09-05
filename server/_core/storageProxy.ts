import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  // Direct Appwrite bucket/file endpoint proxy
  app.get("/api/storage/:bucketId/:fileId", (req, res) => {
    const { bucketId, fileId } = req.params;
    if (!fileId) {
      res.status(400).send("Missing file ID");
      return;
    }

    if (!ENV.appwriteProjectId) {
      res.status(200).send("Dev storage fallback active");
      return;
    }

    const appwriteUrl = `${ENV.appwriteEndpoint}/storage/buckets/${bucketId || ENV.appwriteBucketMedia}/files/${fileId}/view?project=${ENV.appwriteProjectId}`;
    res.set("Cache-Control", "public, max-age=3600");
    res.redirect(307, appwriteUrl);
  });

  // Legacy proxy route redirecting to Appwrite media bucket
  app.get("/manus-storage/*", (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.appwriteProjectId) {
      res.status(200).send("Dev storage fallback active");
      return;
    }

    const bucketId = key.includes("proof") ? ENV.appwriteBucketProofs : ENV.appwriteBucketMedia;
    const appwriteUrl = `${ENV.appwriteEndpoint}/storage/buckets/${bucketId}/files/${key}/view?project=${ENV.appwriteProjectId}`;
    res.set("Cache-Control", "public, max-age=3600");
    res.redirect(307, appwriteUrl);
  });
}

