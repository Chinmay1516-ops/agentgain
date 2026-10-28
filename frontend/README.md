# AgentGain frontend

React 19, TypeScript and Vite implementation of the 12 supplied AgentGain screens. This directory is independent of the team backend at the repository root. All service adapters currently use local demo data; no backend, authentication, model or PayPal API is called.

## Run

Use Node 24 (verified with 24.21.0) and npm. From the team repository:

```powershell
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Open http://127.0.0.1:5173/. This loopback URL is local, not a public share link. No environment file or payment credentials are needed.

## Verify

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Playwright starts a frontend-only Vite server or reuses port 5173. Ensure any existing server on that port is this frontend. Browser reports, dependencies and build outputs are ignored; historical reviewed screenshots are preserved under docs/verification.

## Implemented screens and routes

| Screens | Route |
| --- | --- |
| Landing | / |
| Buyer overview | /buyer |
| Explore skills | /buyer/skills |
| Invoice skill detail | /buyer/skills/invoice-field-extractor |
| Evaluation setup | /buyer/evaluations/new |
| Review agreement | /buyer/evaluations/review |
| Evaluation progress | /buyer/evaluations/progress |
| Passed / failed results | /buyer/evaluations/results |
| Delivered skill | /buyer/my-skills/invoice-field-extractor |
| Seller registration | /seller/register |
| Seller overview | /seller |

Results and delivery require an approved in-memory demo workflow; direct URLs after reload do not grant entitlement. Other catalogue skills display honest availability feedback. For Builder and later screens await design references.

## Demo workflow

Start with Buyer, explore the invoice skill, and set up a test. The Standard synthetic example compares 60% baseline with 90% skilled accuracy. The Alternative example reaches 80% and fails the default 90% requirement. Uploaded checked examples receive no invented model scores. Approval, simulated authorization, evaluation advancement, capture request and completed capture are separate actions. Only completed simulated capture unlocks a labelled text sample.

Seller registration validates instruction-only packages, version and price, calculates a local SHA-256 and preserves a fixed local package. Form drafts survive navigation; registrations reset on reload. Custom registrations do not create live checkout links. No commercial licence or real payment is represented by this demo.

The landing USD 200 licence / USD 15 economic assumption is a separate canonical fixture from the USD 12 invoice workflow. Confidence intervals on the landing are illustrative fixtures, not independently verified statistics.

## Backend handoff and checkpoints

Read FRONTEND_INTEGRATION_GUIDE.md for typed adapter boundaries and server responsibilities. The backend must supply authenticated identities, authoritative version/hash/licence and price, frozen evaluation contracts, actual model outputs, deterministic verification, idempotent payment reconciliation and capture-gated delivery. Frontend guards and hashes are demonstration behavior, not security boundaries.

FRONTEND_PROGRESS.md and FRONTEND_NEXT_STEPS.md describe current scope and recovery. docs/SOURCE_CHECKPOINTS.md records the original local commit history and page tags; those original hashes belong to the preserved source repository, not the team branch history. The team branch contains a frontend-only import based on current main. Later screens remain unfinished, so the pull request is a draft. No merge or live deployment is authorized.
