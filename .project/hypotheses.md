# Hypotheses Log — class-management-system

<!-- Newest session blocks at top. Each session = exactly one ## section with ### per hypothesis. Every hypothesis must reach an outcome. -->

## Session 2026-08-28 — Published class-secretary access
- **Summary:** The first owner-guard correction was insufficient; the published API still returned 403 for the authenticated account.

### Published session is authenticated as a different Manus principal than the displayed account
- **Observation:** The published `auth.me` response displayed Matthew Balubar with openId `GA3v6HRSc6RDqiKEy2i3SY` and role `user`; the published `subjects.list` endpoint still returned `FORBIDDEN` after the normalized owner guard was deployed. The local configured owner openId matched `GA3v6HRSc6RDqiKEy2i3SY` by SHA-256, and the configured owner name was Matthew Balubar.
- **Hypothesis:** The published runtime may be using a different `OWNER_OPEN_ID` value or a different deployment secret set than the local runtime, so the browser account name/email can look correct while the owner guard receives an identity that is not the configured owner.
- **Prediction:** A safe comparison of owner identity values inside the deployed runtime, or a request-time diagnostic that logs only equality/length/hash metadata, will show the published configured owner differs from the session openId. If both match, this hypothesis is refuted and the remaining cause is likely stale deployment/runtime configuration or data-plane separation.
- **Test:** Add a non-sensitive owner-identity comparison helper/test and inspect the post-deployment published `auth.me` plus `subjects.list` responses and runtime logs without exposing secret values or changing class data.
- **Outcome:** inconclusive
- **Result notes:** The published API confirmed authentication but continued to return 403 after the first guard correction. Local configuration metadata matched the stored user openId, but the deployed runtime’s owner value was not directly observable. Further runtime-safe diagnostics or configuration review is needed.
- **Related:** `errors.md` — Published access post-deployment check; `attempts.md` — Published secretary-access correction.
