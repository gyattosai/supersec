import { Client, Account, Databases, Storage, ID, Query, Permission, Role } from "appwrite";

const endpoint =
  import.meta.env.VITE_APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || "supersec";

export const appwriteClient = new Client();

if (projectId) {
  appwriteClient.setEndpoint(endpoint).setProject(projectId);
}

export const appwriteAccount = new Account(appwriteClient);
export const appwriteDatabases = new Databases(appwriteClient);
export const appwriteStorage = new Storage(appwriteClient);

export { ID, Query, Permission, Role };
