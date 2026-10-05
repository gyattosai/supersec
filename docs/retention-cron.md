# 30-Day Proof Retention & Dispute Cleanup (Rule R4)

## Overview
Per **Rule R4** and **ADR-0008 / ADR-0011**, student dispute proofs (medical certificates, excuse letters, recitation screenshots) and stale pending requests are retained for exactly **30 days**.

After 30 days:
1. Physical files stored in Appwrite Storage bucket (`proofs`) are permanently deleted.
2. Metadata references (`proofStorageId`, `proofUrl`) on the `requests` collection records are cleared to `null`.
3. Any unresolved `pending` requests older than 30 days are automatically transitioned to `status: 'expired'`.

---

## Endpoint Specification

- **Path**: `POST /api/cron/cleanup`
- **Authentication**: Bearer Token via `Authorization: Bearer <CRON_SECRET>`
- **Response**:
  ```json
  {
    "success": true,
    "timestamp": "2026-10-05T19:20:00.000Z",
    "purgedProofsCount": 12,
    "expiredRequestsCount": 3,
    "failedDeletionsCount": 0
  }
  ```

---

## Appwrite Scheduled Function Setup

To run this cron automatically every day in production without exposing sensitive credentials:

1. **Create Function**:
   - In Appwrite Console, navigate to **Functions** ➔ **Create Function**.
   - Runtime: Node.js (or lightweight curl/cron runner).
   - Name: `supersec-retention-cron`.

2. **Schedule**:
   - Cron trigger: `0 0 * * *` (Daily at 00:00 UTC / 08:00 Manila time).

3. **Environment Variables**:
   - `TARGET_URL`: `https://your-domain.appwrite.network/api/cron/cleanup`
   - `CRON_SECRET`: High-entropy 32+ character secret matching the Next.js `CRON_SECRET`.

4. **Execution Script**:
   ```javascript
   export default async ({ req, res, log, error }) => {
     const url = process.env.TARGET_URL;
     const secret = process.env.CRON_SECRET;

     const response = await fetch(url, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${secret}`,
         'Content-Type': 'application/json',
       },
     });

     const data = await response.json();
     log(`Retention purge result: ${JSON.stringify(data)}`);
     return res.json(data);
   };
   ```

---

## Security & Privacy Guarantees
- **Zero Public Exposure**: The endpoint rejects any request without a valid matching Bearer token with `401 Unauthorized`.
- **Database Isolation**: Unit and integration tests run entirely in memory with mocked storage and payload clients.
- **Fail-Safe Purge**: Storage 404s or network anomalies are logged under `failedDeletionsCount` without blocking the request status progression.
