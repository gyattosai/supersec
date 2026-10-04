# 0008. Automated 30-Day Retention Purge for Excuse Proofs

To protect student privacy and minimize cloud storage liabilities, student medical notes, doctor receipts, and attendance dispute photos uploaded to the private Appwrite Storage bucket `proofs` have a strict 30-day retention window (Rule R4). A daily automated cron task (`/api/cron/cleanup`) purges physical image files from Appwrite Storage, removes corresponding proof records from MongoDB, and marks any unanswered pending requests older than 30 days as `expired`.
