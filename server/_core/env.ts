export const ENV = {
  appwriteEndpoint:
    process.env.APPWRITE_ENDPOINT ||
    process.env.VITE_APPWRITE_ENDPOINT ||
    "https://sgp.cloud.appwrite.io/v1",
  appwriteProjectId:
    process.env.APPWRITE_PROJECT_ID ||
    process.env.VITE_APPWRITE_PROJECT_ID ||
    "",
  appwriteApiKey: process.env.APPWRITE_API_KEY || "",
  appwriteDatabaseId:
    process.env.APPWRITE_DATABASE_ID ||
    process.env.VITE_APPWRITE_DATABASE_ID ||
    "supersec_db",
  appwriteDatabaseHistoryId:
    process.env.APPWRITE_DATABASE_HISTORY_ID ||
    "supersec_history_db",
  appwriteBucketMedia: process.env.APPWRITE_BUCKET_MEDIA || "media-assets",
  appwriteBucketProofs: process.env.APPWRITE_BUCKET_PROOFS || "proof-uploads",
  cookieSecret: process.env.JWT_SECRET || "supersec-dev-secret-key-32-chars-long-12345",
  ownerOpenId: process.env.OWNER_OPEN_ID || "dev-secretary",
  isProduction: process.env.NODE_ENV === "production",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  forgeApiKey: process.env.BUILTIN_FORGE_API_KEY || "",
  forgeApiUrl: process.env.BUILTIN_FORGE_API_URL || "",
};


