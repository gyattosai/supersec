// Appwrite Storage helpers for Supersec Class Management
import { Client, Storage, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { ENV } from "./_core/env";

function getStorageClient(): { storage: Storage; client: Client } | null {
  if (!ENV.appwriteProjectId || !ENV.appwriteApiKey) {
    return null;
  }
  const client = new Client()
    .setEndpoint(ENV.appwriteEndpoint)
    .setProject(ENV.appwriteProjectId)
    .setKey(ENV.appwriteApiKey);
  return { storage: new Storage(client), client };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function determineBucketId(relKey: string): string {
  if (relKey.includes("proof") || relKey.includes("attendance-proof")) {
    return ENV.appwriteBucketProofs;
  }
  return ENV.appwriteBucketMedia;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
  customBucketId?: string
): Promise<{ key: string; url: string }> {
  const normKey = normalizeKey(relKey);
  const bucketId = customBucketId || determineBucketId(normKey);
  const appwriteStorage = getStorageClient();

  const fileName = normKey.split("/").pop() || "file.bin";

  // When Appwrite credentials are not provided (e.g. local offline testing), use dev fallback
  if (!appwriteStorage) {
    const devFileId = `dev_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}_${fileName}`;
    return {
      key: devFileId,
      url: `/api/storage/${bucketId}/${devFileId}`,
    };
  }

  try {
    let buffer: Buffer;
    if (typeof data === "string") {
      buffer = Buffer.from(data, "utf-8");
    } else if (Buffer.isBuffer(data)) {
      buffer = data;
    } else {
      buffer = Buffer.from(data);
    }

    const inputFile = InputFile.fromBuffer(buffer, fileName);
    const file = await appwriteStorage.storage.createFile(
      bucketId,
      ID.unique(),
      inputFile
    );

    const fileUrl = `${ENV.appwriteEndpoint}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${ENV.appwriteProjectId}`;

    return {
      key: file.$id,
      url: fileUrl,
    };
  } catch (error: any) {
    console.error(`[Appwrite Storage] Upload failed for ${fileName}:`, error);
    throw new Error(`Appwrite Storage upload failed: ${error?.message || error}`);
  }
}

export async function storageGet(
  relKey: string,
  customBucketId?: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const bucketId = customBucketId || determineBucketId(key);
  
  if (!ENV.appwriteProjectId) {
    return { key, url: `/api/storage/${bucketId}/${key}` };
  }

  const url = `${ENV.appwriteEndpoint}/storage/buckets/${bucketId}/files/${key}/view?project=${ENV.appwriteProjectId}`;
  return { key, url };
}

export async function storageGetSignedUrl(
  relKey: string,
  customBucketId?: string
): Promise<string> {
  const { url } = await storageGet(relKey, customBucketId);
  return url;
}

