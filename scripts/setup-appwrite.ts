import "dotenv/config";
import { Client, Databases, Storage, Permission, Role } from "node-appwrite";
import { ENV } from "../server/_core/env";

/**
 * Appwrite Cloud Provisioning Script
 * 
 * Automatically initializes:
 * 1. Database (default: supersec_db)
 * 2. All 17 collections with attributes & indexes
 * 3. Storage Buckets (media-assets, proof-uploads)
 */

async function setupAppwrite() {
  const endpoint = ENV.appwriteEndpoint;
  const projectId = ENV.appwriteProjectId;
  const apiKey = ENV.appwriteApiKey;
  const dbId = ENV.appwriteDatabaseId;

  if (!projectId || !apiKey) {
    console.error("❌ Missing required Appwrite credentials!");
    console.error("Please set APPWRITE_PROJECT_ID and APPWRITE_API_KEY in your .env file.");
    process.exit(1);
  }

  console.log(`\n🚀 Initializing Appwrite Cloud setup...`);
  console.log(`Endpoint:    ${endpoint}`);
  console.log(`Project ID:  ${projectId}`);
  console.log(`Database ID: ${dbId}\n`);

  const client = new Client();
  client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

  const databases = new Databases(client);
  const storage = new Storage(client);

  // 1. Ensure Database Exists
  try {
    await databases.get(dbId);
    console.log(`✅ Database "${dbId}" exists.`);
  } catch {
    console.log(`Creating database "${dbId}"...`);
    await databases.create(dbId, "Supersec Class Management");
    console.log(`✅ Database "${dbId}" created.`);
  }

  // Helper to ensure collection exists
  async function ensureCollection(collectionId: string, name: string, permissions: string[] = []) {
    try {
      await databases.getCollection(dbId, collectionId);
      console.log(`  ✓ Collection "${collectionId}" exists`);
    } catch {
      console.log(`  + Creating collection "${collectionId}"...`);
      await databases.createCollection(
        dbId,
        collectionId,
        name,
        permissions.length > 0 ? permissions : [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ]
      );
      console.log(`  ✓ Collection "${collectionId}" created`);
    }
  }

  // Helper to ensure string attribute
  async function ensureStringAttr(colId: string, key: string, size: number, required = false, defaultVal?: string) {
    try {
      await databases.getAttribute(dbId, colId, key);
    } catch {
      await databases.createStringAttribute(dbId, colId, key, size, required, defaultVal);
      console.log(`    + Attr "${key}" (string) added to ${colId}`);
    }
  }

  // Helper to ensure integer attribute
  async function ensureIntAttr(colId: string, key: string, required = false, defaultVal?: number) {
    try {
      await databases.getAttribute(dbId, colId, key);
    } catch {
      await databases.createIntegerAttribute(dbId, colId, key, required, undefined, undefined, defaultVal);
      console.log(`    + Attr "${key}" (integer) added to ${colId}`);
    }
  }

  // Helper to ensure boolean attribute
  async function ensureBoolAttr(colId: string, key: string, required = false, defaultVal?: boolean) {
    try {
      await databases.getAttribute(dbId, colId, key);
    } catch {
      await databases.createBooleanAttribute(dbId, colId, key, required, defaultVal);
      console.log(`    + Attr "${key}" (boolean) added to ${colId}`);
    }
  }

  // Helper to ensure datetime attribute
  async function ensureDatetimeAttr(colId: string, key: string, required = false) {
    try {
      await databases.getAttribute(dbId, colId, key);
    } catch {
      await databases.createDatetimeAttribute(dbId, colId, key, required);
      console.log(`    + Attr "${key}" (datetime) added to ${colId}`);
    }
  }

  // Helper to ensure index
  async function ensureIndex(colId: string, key: string, type: "key" | "unique" | "fulltext", attributes: string[]) {
    try {
      await databases.getIndex(dbId, colId, key);
    } catch {
      try {
        await databases.createIndex(dbId, colId, key, type as any, attributes);
        console.log(`    + Index "${key}" added to ${colId}`);
      } catch (err: any) {
        console.warn(`    ! Notice on index "${key}" in ${colId}: ${err?.message || err}`);
      }
    }
  }

  // 2. Setup Collections
  console.log("\n📦 Setting up Collections and Attributes...");

  // USERS
  await ensureCollection("users", "Users");
  await ensureStringAttr("users", "openId", 64, true);
  await ensureStringAttr("users", "name", 255, false);
  await ensureStringAttr("users", "email", 320, false);
  await ensureStringAttr("users", "loginMethod", 64, false);
  await ensureStringAttr("users", "role", 32, false, "user");
  await ensureDatetimeAttr("users", "lastSignedIn", false);

  // SUBJECTS
  await ensureCollection("subjects", "Subjects");
  await ensureStringAttr("subjects", "ownerId", 64, true);
  await ensureStringAttr("subjects", "publicId", 24, true);
  await ensureStringAttr("subjects", "name", 160, true);
  await ensureStringAttr("subjects", "code", 64, true);
  await ensureStringAttr("subjects", "viewOnlyShortMark", 16, false);
  await ensureStringAttr("subjects", "viewOnlyName", 80, false);
  await ensureStringAttr("subjects", "professorName", 160, true);
  await ensureStringAttr("subjects", "termName", 120, false);
  await ensureStringAttr("subjects", "status", 32, false, "active");
  await ensureStringAttr("subjects", "publishState", 32, false, "draft");
  await ensureDatetimeAttr("subjects", "archivedAt", false);

  // SUBJECT MEETING DAYS
  await ensureCollection("subjectMeetingDays", "Subject Meeting Days");
  await ensureStringAttr("subjectMeetingDays", "subjectId", 64, true);
  await ensureIntAttr("subjectMeetingDays", "weekday", true);
  await ensureStringAttr("subjectMeetingDays", "startTime", 10, false);
  await ensureStringAttr("subjectMeetingDays", "endTime", 10, false);
  await ensureIntAttr("subjectMeetingDays", "sortOrder", false, 0);

  // STUDENTS
  await ensureCollection("students", "Students");
  await ensureStringAttr("students", "ownerId", 64, true);
  await ensureStringAttr("students", "canonicalName", 255, true);
  await ensureStringAttr("students", "firstName", 120, false, "");
  await ensureStringAttr("students", "middleName", 120, false, "");
  await ensureStringAttr("students", "lastName", 120, false, "");
  await ensureStringAttr("students", "privateNotes", 10000, false);
  await ensureStringAttr("students", "aliasesText", 5000, false);

  // SUBJECT STUDENTS
  await ensureCollection("subjectStudents", "Subject Students");
  await ensureStringAttr("subjectStudents", "subjectId", 64, true);
  await ensureStringAttr("subjectStudents", "studentId", 64, true);
  await ensureStringAttr("subjectStudents", "membershipState", 32, false, "active");
  await ensureBoolAttr("subjectStudents", "hasScheduleConflict", false, false);
  await ensureIntAttr("subjectStudents", "displayOrder", false, 0);
  await ensureDatetimeAttr("subjectStudents", "removedAt", false);

  // CLASS SESSIONS
  await ensureCollection("classSessions", "Class Sessions");
  await ensureStringAttr("classSessions", "subjectId", 64, true);
  await ensureStringAttr("classSessions", "publicId", 24, true);
  await ensureDatetimeAttr("classSessions", "startsAt", true);
  await ensureStringAttr("classSessions", "sessionState", 32, false, "scheduled");
  await ensureStringAttr("classSessions", "noClassReason", 255, false);
  await ensureDatetimeAttr("classSessions", "captureAt", false);
  await ensureStringAttr("classSessions", "publishState", 32, false, "draft");

  // ZOOM IMPORTS
  await ensureCollection("zoomImports", "Zoom Imports");
  await ensureStringAttr("zoomImports", "classSessionId", 64, true);
  await ensureStringAttr("zoomImports", "rawNamesText", 65535, true);
  await ensureDatetimeAttr("zoomImports", "captureAt", true);
  await ensureStringAttr("zoomImports", "reviewState", 32, false, "draft");

  // ZOOM MATCH SUGGESTIONS
  await ensureCollection("zoomMatchSuggestions", "Zoom Match Suggestions");
  await ensureStringAttr("zoomMatchSuggestions", "zoomImportId", 64, true);
  await ensureStringAttr("zoomMatchSuggestions", "sourceName", 255, true);
  await ensureStringAttr("zoomMatchSuggestions", "suggestedSubjectStudentId", 64, false);
  await ensureStringAttr("zoomMatchSuggestions", "reviewState", 32, false, "needs_review");
  await ensureStringAttr("zoomMatchSuggestions", "confirmedByUserId", 64, false);
  await ensureDatetimeAttr("zoomMatchSuggestions", "confirmedAt", false);

  // ATTENDANCE RECORDS
  await ensureCollection("attendanceRecords", "Attendance Records");
  await ensureStringAttr("attendanceRecords", "classSessionId", 64, true);
  await ensureStringAttr("attendanceRecords", "subjectStudentId", 64, true);
  await ensureStringAttr("attendanceRecords", "attendanceStatus", 32, false, "NOT_SET");
  await ensureStringAttr("attendanceRecords", "excuseReason", 500, false);
  await ensureBoolAttr("attendanceRecords", "hasScheduleConflict", false, false);
  await ensureStringAttr("attendanceRecords", "publishState", 32, false, "draft");
  await ensureIntAttr("attendanceRecords", "publishedVersion", false, 0);

  // ATTENDANCE PROOF SUBMISSIONS
  await ensureCollection("attendanceProofSubmissions", "Attendance Proof Submissions");
  await ensureStringAttr("attendanceProofSubmissions", "classSessionId", 64, true);
  await ensureStringAttr("attendanceProofSubmissions", "submittedName", 255, true);
  await ensureStringAttr("attendanceProofSubmissions", "proofStorageKey", 512, true);
  await ensureStringAttr("attendanceProofSubmissions", "proofUrl", 768, true);
  await ensureStringAttr("attendanceProofSubmissions", "proofOriginalName", 255, true);
  await ensureStringAttr("attendanceProofSubmissions", "proofMimeType", 128, true);
  await ensureIntAttr("attendanceProofSubmissions", "proofByteSize", true);
  await ensureStringAttr("attendanceProofSubmissions", "reviewState", 32, false, "needs_review");
  await ensureStringAttr("attendanceProofSubmissions", "matchedSubjectStudentId", 64, false);
  await ensureStringAttr("attendanceProofSubmissions", "reviewSummary", 500, false);
  await ensureDatetimeAttr("attendanceProofSubmissions", "reviewedAt", false);

  // MEDIA ASSETS
  await ensureCollection("mediaAssets", "Media Assets");
  await ensureStringAttr("mediaAssets", "ownerId", 64, true);
  await ensureStringAttr("mediaAssets", "storageKey", 512, true);
  await ensureStringAttr("mediaAssets", "servedUrl", 768, true);
  await ensureStringAttr("mediaAssets", "originalName", 255, true);
  await ensureStringAttr("mediaAssets", "mimeType", 128, true);
  await ensureIntAttr("mediaAssets", "byteSize", true);
  await ensureStringAttr("mediaAssets", "altText", 280, false);
  await ensureBoolAttr("mediaAssets", "publicUse", false, false);

  // ANNOUNCEMENTS
  await ensureCollection("announcements", "Announcements");
  await ensureStringAttr("announcements", "subjectId", 64, true);
  await ensureStringAttr("announcements", "publicId", 24, true);
  await ensureStringAttr("announcements", "title", 220, true);
  await ensureStringAttr("announcements", "body", 65535, true);
  await ensureStringAttr("announcements", "mediaAssetId", 64, false);
  await ensureStringAttr("announcements", "socialPreviewMediaAssetId", 64, false);
  await ensureStringAttr("announcements", "publishState", 32, false, "draft");
  await ensureIntAttr("announcements", "version", false, 0);
  await ensureStringAttr("announcements", "publicChangeSummary", 280, false);
  await ensureDatetimeAttr("announcements", "publishedAt", false);

  // RESOURCES
  await ensureCollection("resources", "Resources");
  await ensureStringAttr("resources", "subjectId", 64, true);
  await ensureStringAttr("resources", "publicId", 24, true);
  await ensureStringAttr("resources", "title", 220, true);
  await ensureStringAttr("resources", "description", 65535, true);
  await ensureStringAttr("resources", "category", 80, true);
  await ensureStringAttr("resources", "resourceType", 80, true);
  await ensureStringAttr("resources", "sourceDomain", 255, true);
  await ensureStringAttr("resources", "destinationUrl", 2048, true);
  await ensureStringAttr("resources", "fallbackMediaAssetId", 64, false);
  await ensureStringAttr("resources", "socialPreviewMediaAssetId", 64, false);
  await ensureStringAttr("resources", "publishState", 32, false, "draft");
  await ensureIntAttr("resources", "version", false, 0);
  await ensureStringAttr("resources", "publicChangeSummary", 280, false);
  await ensureDatetimeAttr("resources", "publishedAt", false);

  // RESOURCE ATTACHMENTS
  await ensureCollection("resourceAttachments", "Resource Attachments");
  await ensureStringAttr("resourceAttachments", "resourceId", 64, true);
  await ensureStringAttr("resourceAttachments", "mediaAssetId", 64, true);
  await ensureIntAttr("resourceAttachments", "displayOrder", false, 0);

  // QUESTIONS ANSWERS
  await ensureCollection("questionsAnswers", "Questions Answers");
  await ensureStringAttr("questionsAnswers", "subjectId", 64, true);
  await ensureStringAttr("questionsAnswers", "publicId", 24, true);
  await ensureStringAttr("questionsAnswers", "question", 65535, true);
  await ensureStringAttr("questionsAnswers", "answer", 65535, true);
  await ensureStringAttr("questionsAnswers", "tagsText", 2000, false);
  await ensureBoolAttr("questionsAnswers", "isOfficial", false, false);
  await ensureStringAttr("questionsAnswers", "socialPreviewMediaAssetId", 64, false);
  await ensureStringAttr("questionsAnswers", "publishState", 32, false, "draft");
  await ensureIntAttr("questionsAnswers", "version", false, 0);
  await ensureStringAttr("questionsAnswers", "publicChangeSummary", 280, false);
  await ensureDatetimeAttr("questionsAnswers", "publishedAt", false);

  // REPORTS
  await ensureCollection("reports", "Reports");
  await ensureStringAttr("reports", "publicId", 24, true);
  await ensureStringAttr("reports", "ownerId", 64, true);
  await ensureStringAttr("reports", "reportType", 64, true);
  await ensureStringAttr("reports", "subjectId", 64, false);
  await ensureStringAttr("reports", "classSessionId", 64, false);
  await ensureStringAttr("reports", "publishState", 32, false, "draft");
  await ensureIntAttr("reports", "version", false, 0);
  await ensureDatetimeAttr("reports", "generatedAt", true);
  await ensureDatetimeAttr("reports", "publishedAt", false);

  // HISTORY ENTRIES
  await ensureCollection("historyEntries", "History Entries");
  await ensureStringAttr("historyEntries", "entityType", 64, true);
  await ensureStringAttr("historyEntries", "entityId", 64, true);
  await ensureIntAttr("historyEntries", "version", true);
  await ensureStringAttr("historyEntries", "action", 64, true);
  await ensureStringAttr("historyEntries", "publicChangeSummary", 280, true);
  await ensureStringAttr("historyEntries", "actorUserId", 64, true);

  // PUSH SUBSCRIPTIONS
  await ensureCollection("pushSubscriptions", "Push Subscriptions", [
    Permission.read(Role.any()),
    Permission.create(Role.any()),
    Permission.update(Role.any()),
    Permission.delete(Role.users()),
  ]);
  await ensureStringAttr("pushSubscriptions", "subjectPublicId", 36, true);
  await ensureStringAttr("pushSubscriptions", "endpoint", 1024, true);
  await ensureStringAttr("pushSubscriptions", "p256dhKey", 256, false);
  await ensureStringAttr("pushSubscriptions", "authKey", 128, false);
  await ensureStringAttr("pushSubscriptions", "fcmToken", 512, false);
  await ensureStringAttr("pushSubscriptions", "firebaseUid", 128, false);
  await ensureBoolAttr("pushSubscriptions", "allowAnnouncements", false, true);
  await ensureBoolAttr("pushSubscriptions", "allowAttendance", false, true);
  await ensureBoolAttr("pushSubscriptions", "allowResources", false, true);
  await ensureBoolAttr("pushSubscriptions", "allowQa", false, true);
  await ensureBoolAttr("pushSubscriptions", "active", false, true);


  // 3. Setup Storage Buckets
  console.log("\n🗄️ Setting up Storage Buckets...");
  const buckets = [
    { id: ENV.appwriteBucketMedia, name: "Media Assets", public: true },
    { id: ENV.appwriteBucketProofs, name: "Attendance Proofs", public: false },
  ];

  for (const b of buckets) {
    try {
      await storage.getBucket(b.id);
      console.log(`  ✓ Bucket "${b.id}" exists`);
    } catch {
      console.log(`  + Creating bucket "${b.id}"...`);
      await storage.createBucket(
        b.id,
        b.name,
        b.public ? [Permission.read(Role.any()), Permission.create(Role.users())] : [Permission.create(Role.any()), Permission.read(Role.users())],
        false, // fileSecurity
        true, // enabled
        50 * 1024 * 1024 // 50MB max file size
      );
      console.log(`  ✓ Bucket "${b.id}" created`);
    }
  }

  console.log("\n🎉 Appwrite Cloud initialization complete! All collections, attributes, and storage buckets are ready.\n");
}

setupAppwrite().catch((err) => {
  console.error("Error setting up Appwrite:", err);
  process.exit(1);
});
