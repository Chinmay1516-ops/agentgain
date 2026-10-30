# Install the connected AgentGain frontend

This package connects your existing visual frontend to your backend and the no-PayPal demo evaluator. It preserves the cinematic landing page, images, fonts and existing visual stylesheet. Workspace screens now call the backend rather than generating scores or simulated payment states in the browser.

## 1. Back up your project

Save all files. Stop the backend and worker using Ctrl+C in their terminals. Copy your existing AgentGain folder in Windows File Explorer and rename the copy AgentGain-backup-before-connected-ui.

## 2. Copy these files

Extract this ZIP. Open its Agentgain-connected folder. Copy its CONTENTS into your existing AgentGain root, the same folder as main.py. Merge folders and accept replacement for the included files. Do not nest Agentgain-connected inside AgentGain.

- frontend/ replaces your frontend files and includes all original assets plus the readable connected.js and connected.css integration layer.
- demo_core.py, demo_worker.py, demo_server.py and ui_routes.py go beside main.py.
- database.py includes the shared models.Base fix and driver-specific connection settings.
- requirements.txt includes SQLAlchemy[asyncio] so greenlet is installed.
- examples/ keeps the earlier integration page example files available.

Keep your existing main.py, models.py, contracts.py, auth.py, worker.py, config.py, payments.py, analytics.py, verifier.py and package_guard.py. Keep your current .env values; this ZIP does not contain credentials.

## 3. Check prerequisites

Keep Docker Desktop and Ollama running. Your configured model should appear in:

```powershell
ollama list
```

Keep the three distinct generated demo tokens in your .env. PayPal credentials are unnecessary for this mode.

In a terminal in the AgentGain root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
docker compose up -d postgres
```

## 4. Start the connected app

In one VS Code terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn demo_server:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
.\.venv\Scripts\python.exe demo_worker.py
```

Use demo_server and demo_worker for this flow. The old worker.py consumes the PayPal-authorized queue, whereas demo_worker.py consumes the separate no-payment queue.

## 5. Open your designed frontend

Open http://127.0.0.1:8000/ in your browser. Hard refresh with Ctrl+F5 if the old interface is cached.

The original landing page appears. The bottom bar says Local demo — no payment processed and reports API connection status. Enter Buyer or Seller workspace using the page navigation. Direct URLs also work:

- http://127.0.0.1:8000/seller
- http://127.0.0.1:8000/seller/register
- http://127.0.0.1:8000/buyer
- http://127.0.0.1:8000/buyer/skills

Do not use Live Server or open index.html as a file. FastAPI serves both frontend and API. The dedicated /app/integration.html and /app/demo.html pages remain available for debugging.

## 6. Connect demo access

Click Connect demo access in the bottom bar. Copy the values after DEMO_BUYER_TOKEN= and DEMO_SELLER_TOKEN= from .env into the corresponding fields. You may enter one role or both. Click Verify and connect. Tokens are checked against /api/me and kept only in page memory; enter them again after reloading. No admin token belongs in this interface.

This remains your backend's limited one-buyer/one-seller demo authentication, not public sign-up or login.

## 7. Register a skill or use an existing skill

Open Seller workspace. Existing registered PostgreSQL skills appear in My listings.

For a fresh invoice example, click Register a skill, review/edit the prefilled package and submit Register this version. A successful response includes the backend skill ID, exact package hash and checkout link. The package is not registered only in the browser; it persists on the backend.

If that exact version is already registered, the API returns 409. Use the existing listing, or deliberately change the version and package if you intend to publish a new one. Do not repeatedly submit.

My listings offers Buyer view, Copy checkout link and View actual activity. Activity shows actual backend payment counters separately from demo evaluation totals. Localhost links work only on your computer. Buyer test records remain private from the seller activity view.

## 8. Prepare an evaluation

Open Buyer workspace, then Explore skills. Choose View skill for the invoice example, then Prepare a real evaluation.

The form loads the configured model list. Review the baseline prompt, holdout records, output schema and pass requirements. The invoice sample consists of sample INPUT records with checked answers; it is not a record of past model performance.

Two record formats are supported:

```json
[{"input":{"text":"Invoice No: INV-1. Total: USD 100.00"},"checked_answer":{"invoiceNumber":"INV-1","total":"100.00","currency":"USD"}}]
```

or the existing frontend invoice format:

```json
[{"id":"Invoice001","input":"Invoice No: INV-1. Total: USD 100.00","expected":{"invoiceNumber":"INV-1","total":"100.00","currency":"USD"}}]
```

Supply at least the backend's required number of records. JSON files can be uploaded; you can also edit the records and schema in the form. For a quantity/catalogue skill, change the prompt, schema and checked answers to that task. The invoice dataset is not suitable for every skill.

Click Prepare dataset and review contract. The browser first stores a validated dataset through the API, then creates a FULL_SKILL contract. A contract creation failure may leave a valid uploaded dataset; it does not approve terms or start evaluation.

## 9. Approve and evaluate

Read the contract returned by the backend, including price, exact skill version/hash, dataset/baseline hashes, model and rules. Check I have reviewed and approve these displayed terms, then click Approve these terms.

The approved contract becomes FROZEN. Click Run demo evaluation — no payment. Progress polls the separate demo job and shows completed record pairs. The worker uses the actual Ollama model; both configurations process the same records and alternate execution order.

Click Open results to see recorded correctness, token counts, execution time, regressions and verdict. PASS, FAIL, INCONCLUSIVE and TECHNICAL_ERROR are all possible. Easy examples may already pass without the skill, producing no improvement. Do not change or label a failed evaluation as success.

## 10. Resume after reload

The frontend saves only selected resource IDs in sessionStorage, not tokens or private datasets. After reloading, reconnect the buyer token. Evaluation history queries the backend and lets you reopen saved contracts/runs. Contract and run ID fields also allow manual resume.

## Expected limits

- Payment endpoints and the automatic payment controller are disabled in demo_server. No money is authorized, captured, cancelled or reported as revenue.
- Demo evaluations are stored in agentgain_demo_runs and do not modify paid purchase evidence/payment state.
- Skilled output text, paid skill package delivery, receipts and original-task purchase retry remain gated. The results table shows real check/resource evidence without revealing unpaid instructions or skill outputs.
- The original backend verifier and model execution behavior are reused. Its significance rule and hard resource-limit enforcement still require review against the architecture. A demo PASS is not certification of production readiness.
- There is no new account system, file package executor, free-alternative benchmark, agent recommendation model or real PayPal integration in this patch.
- The compiled marketing landing page and informational panels retain their illustrative content. The connected buyer/seller workspace routes supply the actual working flow; their metrics come from APIs.
- Only one demo run is created per contract. Use a new approved contract for a new test. A crashed worker times out after the configured MAX_JOB_RUNTIME_SECONDS; it is not silently retried.

## Files for future development

frontend/connected.js is the readable React/API integration source. frontend/connected.css supplies workspace additions. frontend/app.bundle.js contains the original compiled React app, with explicit route-component wiring added near the end. Future source builds should move these components into the original React source repository if the team has it. No original React source project/package.json was provided here.

Backend UI routes are in ui_routes.py. demo_server.py supplies browser-history fallback routes, root /assets and /style.css paths, and protected demo endpoints. Existing API prefixes remain unchanged.
