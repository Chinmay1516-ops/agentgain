# Resume instructions

Updated 2026-10-28. Pages 01–12 are verified complete. Await IMAGE 13. Do not recreate completed screens or invent later pages.

- Read all five FRONTEND_*.md files and inspect git status/log. Latest entries supersede historical notes.
- Work in agentgain/frontend on feature/agentgain-frontend. No backend integration, remote push or deployment authorized.
- Latest pages: /seller/register (Page 11, 58d5cb4 / page-11-verified) and /seller (Page 12, resolve page-12-verified). Landing Seller and legacy ?panel=seller enter the seller overview. Buyer and For Builder retain prior behavior.
- Registration validates text, version, public example, licence and USD price. The mock adapter computes actual SHA-256 over normalized local package bytes. Changed registered packages require a new version; identical registration is idempotent. This is not authenticated server publication or a safety certification.
- SellerWorkspaceProvider holds registrations and separate form drafts in React memory. Draft edits survive route changes. Reload clears them. Continue editing opens the product mapper draft; unknown draft IDs are rejected.
- Overview offers invoice buyer preview, real clipboard copying with manual fallback, local custom-package details and separate illustrative evaluation/payment/delivery statuses. Custom versions never reuse the invoice checkout. Localhost demo links are not publicly accessible.
- Buyer flow: /buyer/evaluations/new -> review/consent -> simulated authorization -> explicit evaluation steps -> results -> simulated capture request -> simulated completed capture -> delivered skill. Standard fixture is 60% baseline/90% skilled; Alternative is 60%/80% against 90% accuracy and 20-point gain. Uploaded examples remain inconclusive. Reload cannot restore payment or entitlement.
- Canonical landing USD 200 licence / USD 15 economic assumption remain unchanged. Invoice buyer pages use a separate illustrative USD 12 fixture. Seller custom prices are local examples, not live offers.
- Vite on port 5173 is the preview. Verify response before restarting; original retained session 34104. Dependencies and Chromium are installed.
- Verification: 38 unit/service tests and all 31 Chromium scenarios passed; six seller unit tests and all five seller browser scenarios rerun after final route guard changes. Typecheck/build passed. Four widths, Day/Night, clipboard and dialog states checked; zero axe violations in scanned states. Evidence in docs/verification/page-11 and page-12.
- Checkpoint tags page-01-verified through page-12-verified. No remote push.

Remaining screens require references. No real authentication, model run, payment, checkout publication or seller licence delivery exists. Do not mark the entire frontend goal complete.

## Current team handoff (supersedes earlier remote restrictions)
The user now authorizes frontend-only commits/push to Chinmay1516-ops/agentgain on feature/agentgain-frontend, plus a draft PR into main. Do not merge. This copy lives at frontend/ inside the team checkout; the original standalone repository remains preserved. Inspect git status, origin refs and existing PRs before any resumed push. Do not duplicate the branch or PR. Later UI development still awaits IMAGE 13. Source page tags are documented in docs/SOURCE_CHECKPOINTS.md and are not imported into the team repository namespace.
