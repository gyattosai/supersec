# Change ART-08 — Attendance proof submissions

- **Operation:** artifact-registration
- **Target file(s):** `.project/artifacts.md`
- **Summary:** Register the cross-cutting public attendance-proof feature source and database migration.
- **Content:**
  ```markdown
  ## ART-08 — Attendance proof submissions
  - **Path/URL:** `drizzle/schema.ts`, `drizzle/0009_motionless_black_bird.sql`, `server/routers/attendanceProof.ts`, `server/routers.ts`, `client/src/pages/AttendanceProofPage.tsx`, `client/src/pages/AttendancePage.tsx`, `client/src/pages/PublicPages.tsx`, `client/src/App.tsx`, `server/attendance.proof.test.ts`, `server/attendance.proof.submit.test.ts`
  - **Type:** code
  - **Purpose:** Lets classmates submit a Zoom attendance proof on a separate public page, applies AI-assisted review with a safe automatic Present update, and retains a secretary-only fallback review path.
  - **Created:** 2026-08-27 | **Last updated:** 2026-08-27
  - **Format:** `.ts`, `.tsx`, `.sql`
  - **Notes:** Proof image paths and matching details are never returned by the public interface. The automatic path accepts only AI-approved active-roster membership IDs; unclear cases stay in private review. The migration uses `attendance_proof_student_fk` due MySQL’s identifier-length limit. Apply after ART-01 creates the artifact registry.
  ```
- **Reason:** Makes the new public-to-private attendance-correction system discoverable without registering transient browser artifacts.
- **Source task:** Current public attendance-proof submission feature.
- **Follow-up:** Apply after ART-01 creates the artifact registry.
- **Status:** applied
