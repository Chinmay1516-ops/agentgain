# AgentGain compact frontend

All 12 implemented screens, routes, forms, mock services and payment/evaluation demonstrations now live in four main files. The appearance, responsive layouts, Day/Auto/Night themes and working Buyer/Seller flows are preserved.

```text
frontend/
  index.html       HTML entry and React mounting
  app.jsx          Pages, routing, shared UI, state, mock services, checked JSDoc contracts
  styles.css       Complete cascade, local font declarations, reset and component styles
  package.json     Dependencies and run/build/test commands
  assets/          8 original images, favicon, 8 local font files
  package-lock.json
  .gitignore
  README.md
  tests/           Original component/browser tests, test configuration, visual report
```

There is no runtime src/ tree, public/ copy, Vite configuration file, Tailwind compiler or external font request. Runtime dependencies are React, React DOM, React Router and Lucide React. The original artwork and font bytes are unchanged. Font and reset licence notices are included at the start of styles.css and preserved in the production stylesheet.

## Why auxiliary files remain

Four main application files do not replace verification and reproducibility:
- package-lock.json pins the tested dependency graph; .gitignore excludes secrets, dependencies and generated results.
- The 14 original test source files remain, preserving all 38 component/service tests and 31 browser scenarios.
- tests/vitest.config.mjs supplies jsdom and setup hooks; tests/playwright.config.ts supplies the Chromium production-preview server; tests/tsconfig.json enables strict checking of app.jsx and the TypeScript tests without a runtime configuration file.
- tests/visual-comparison.json records the 69-image before/after comparison; this README contains the current handoff/checkpoint information.

## Run and verify

Use Node 24 (verified 24.21.0) and npm, from frontend/:

```powershell
npm ci
npm run dev -- --port 5173 --strictPort
```

If the preserved original frontend is running on 5173, use another free port, for example 5175. Localhost is not a public sharing link. No credentials or backend server are needed.

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Type checking uses TypeScript checkJs with strict mode for app.jsx and the full test suite. Original domain contracts were converted to 32 checked JSDoc typedefs; no blanket type-check suppression was added. Test imports target app.jsx; assertions are retained. One screenshot now explicitly waits for the Overview tab content to avoid capturing a previous tab's document height.

Browser tests build the app and start a production preview on 127.0.0.1:5174. That port must be free; the test runner deliberately does not reuse an unrelated server. Generated screenshots go to ignored docs/verification/, with reports in ignored playwright-report/ and test-results/.

The build may report upstream module-level "use client" directive warnings from React Router/Lucide after removing the React build plugin. This is a browser-only SPA, not a server-component application. Production browser tests pass; no directive warning is suppressed.

## Preserved routes

| Screens | Route |
| --- | --- |
| Landing | / |
| Buyer overview | /buyer |
| Explore skills | /buyer/skills |
| Invoice detail, tabs and deep links | /buyer/skills/invoice-field-extractor |
| Test setup | /buyer/evaluations/new |
| Review agreement | /buyer/evaluations/review |
| Evaluation progress | /buyer/evaluations/progress |
| Passed / failed / inconclusive results | /buyer/evaluations/results |
| Delivered demo skill | /buyer/my-skills/invoice-field-extractor |
| Seller registration and draft editing | /seller/register |
| Seller overview, listing/activity anchors | /seller |

Legacy Buyer/Seller query entry, catalogue search/filter state, shared navigation, profile/evidence/receipt dialogs, keyboard/focus behavior, error/retry states, clipboard fallback and text-sample download are preserved. Other skill details and For Builder still give honest availability feedback; no unprovided screens were invented.

## Demo and backend boundaries

All service adapters remain isolated sections in app.jsx. No backend, PayPal, database, authentication or model API is connected. Uploaded checked examples are validated but do not receive fabricated execution scores. Baseline/skill comparisons use the same synthetic fixtures as before.

The buyer explicitly approves an agreement, simulates authorization, advances evaluation, requests simulated capture and confirms its completion. PASS alone cannot unlock delivery. Failed/inconclusive outcomes cannot capture; direct URLs/reload cannot restore entitlement. Delivered instructions are a labelled demo text sample.

Seller packages remain instruction-only. Price, version, public examples and licence terms are validated; normalized local package bytes produce a real SHA-256. Same-name/version changes require a new version. Per-form drafts survive navigation; reload resets registrations. Custom packages never reuse the USD 12 invoice preview checkout. Historical seller activity is synthetic and contains no private buyer records.

The canonical landing fixture remains USD 200 for the licence and USD 15 as an economic-model assumption, not another checkout charge. The USD 12 invoice workflow is a separate demo. Confidence intervals remain illustrative, not independently statistically verified.

Real integration remains a separate team task: authenticated identity, authoritative offer/version/hash/licence, frozen evaluation contract, worker execution, deterministic scoring, verified/idempotent PayPal reconciliation and capture-gated delivery. Client guards and hashes are not security boundaries. Do not modify the backend while integrating frontend adapters without separate authorization.

## Refactor checkpoint and visual evidence

Base: feature/agentgain-frontend at 9cb454c7ad5e2edd212429844d5434a53b27e488. New branch: refactor/agentgain-compact-frontend. The original 192-file feature branch, its complete history and draft PR #1 are preserved. The new PR targets that feature branch, not main; neither PR is merged.

Before any old file was removed, an isolated compact candidate passed a production build, strict JSDoc/TypeScript checks, all 38 unit/service tests and all 31 browser scenarios. A fresh original run also passed all 31 scenarios. All 69 currently generated screenshots were compared without masks: dimensions match throughout; 65 are pixel-identical, two differ by 3–7 raster pixels, and two differ only inside the capture button's hover transition (maximum channel delta 12/255). No pixel differs by more than 20/255. The obsolete setup-dialog screenshot predates the current navigation behavior and is not part of the current test run. The invoice night screenshot race was fixed with an explicit content-ready assertion and recaptured on both versions.

Superseded modular sources, duplicate public assets, old configuration and historical reference/capture documents were removed only after these checks. Historical design references, source checkpoints and architecture remain recoverable on the unchanged feature branch, for example:

```powershell
git show feature/agentgain-frontend:frontend/FRONTEND_INTEGRATION_GUIDE.md
git show feature/agentgain-frontend:frontend/docs/agentgain-architecture.md
```

The final compact tree is retested after promotion. Only frontend/ paths may differ from the feature branch; all existing backend/root blobs must remain identical. Inspect the remote branch and any existing PR before resuming to avoid duplicate commits or PRs. Later design pages remain pending; this refactor does not claim new screen functionality.

Final promoted-tree verification: production build and strict type checks passed, all 38 component/service tests passed, and all 31 Chromium browser scenarios passed. The tracked frontend contains 42 files: four main files, 17 assets, 18 test/verification files and three auxiliary files.
