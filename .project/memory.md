# Memory — supersec

## Key Context
- **Hosting**: Appwrite Sites (Vite static adapter deployed on Singapore edge `sgp.cloud.appwrite.io`).
- **Backend / BaaS**: Appwrite Cloud (`supersec` project, `supersec_db` database, `media-assets` & `proof-uploads` storage buckets).
- **Authentication**: Appwrite Account SDK direct integration (`email/password` registration and login, anonymous 1-click secretary access).
- **Data Access**: Client-side `appwriteAdapter.ts` intercepted via `customTrpcFetch` in `trpcFetch.ts`, eliminating server proxy dependency for SPA CDN hosting.
