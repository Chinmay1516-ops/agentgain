# AgentGain frontend/backend integration

This package is an overlay for the backend files you uploaded on 29 October 2026. It adds a plain JavaScript integration console and reusable API adapter. Your screenshot shows HTML/CSS; your architecture proposes React. React is optional for connecting these endpoints. The adapter can be imported from either frontend.

Your current frontend/index.html, style.css and assets were not uploaded. This package therefore connects a separate console and preserves your existing screen. Upload those frontend files to connect the actual buttons and screens next.

## 1. Copy the integration files into your repository

First commit or back up your current work. Extract this package. Copy its contents into your AgentGain repository root, merging folders.

- Add integration_server.py and examples/.
- Add frontend/api.js, frontend/paypal.js, frontend/integration.html and frontend/integration.js.
- Replace database.py and payments.py with the included versions, after reviewing the changes below.
- Use .env.example to configure .env. If .env already exists, merge the settings rather than overwriting credentials.
- Keep your existing main.py, config.py, auth.py, contracts.py, models.py, analytics.py, worker.py, verifier.py, package_guard.py, requirements.txt and docker-compose.yml.

The database.py change chooses asyncpg connection arguments for PostgreSQL and SQLite arguments for SQLite. The payments.py change adds os and replaces the two hardcoded /docs return URLs with PUBLIC_APP_URL plus the integration page and contract ID. All other uploaded payment logic is retained.

integration_server imports your existing FastAPI app, keeps its routers and lifespan, exposes a public client-ID-only config endpoint, mounts frontend at /app, and routes generated /checkout/{skill_id} links into the console. Start this entry point instead of main:app.

## 2. Prepare Python on Windows in VS Code

Open the AgentGain folder. Run these commands in its terminal. Python 3.11 or 3.12 is a conservative choice for this project.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

If you use another installed Python version, adjust the first command. No virtual environment activation is needed for these commands.

## 3. Start PostgreSQL

With Docker Desktop running, use a terminal in AgentGain:

```powershell
docker compose up -d postgres
docker compose ps
```

The uploaded compose file uses database agentgain, user agentgain, password agentgain_local_password, and port 5432. The provided .env.example matches these values. A port conflict means another PostgreSQL is using 5432; change both the published port and DATABASE_URL consistently.

The app creates missing tables at startup; it does not migrate existing tables. If an older database is incompatible, use a separate new development database or a reviewed migration. Do not delete existing data to fix a schema mismatch.

## 4. Configure .env

Copy .env.example to .env if you have no existing .env:

```powershell
Copy-Item .env.example .env
```

Fill in PAYPAL_CLIENT_ID and PAYPAL_SECRET from the same PayPal sandbox REST app. Generate three distinct random tokens by running the following command three times and placing the outputs into DEMO_BUYER_TOKEN, DEMO_SELLER_TOKEN and DEMO_ADMIN_TOKEN:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

The uploaded auth.py maps those tokens to one demo buyer, seller and administrator. There is no registration/login endpoint or multi-user account system. Enter only the token needed for the current console action. The console keeps it in memory; enter it again after reloading. Never put an admin token or PayPal secret into frontend source. The PayPal client ID is public.

Keep PUBLIC_APP_URL=http://127.0.0.1:8000 for this local flow. Restart the API after .env changes because settings are cached.

## 5. Start Ollama and install the configured model

Install/start Ollama on your machine. In another terminal:

```powershell
ollama pull qwen2.5:7b-instruct
ollama list
```

If you choose a different local model, update ALLOWED_OLLAMA_MODELS and the console model field to the same exact name. Your backend accepts only allowlisted models and a local Ollama URL. If Ollama is not running, start it with ollama serve (only one server is needed).

## 6. Start the API

In the AgentGain repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn integration_server:app --reload --host 127.0.0.1 --port 8000
```

Open:

- http://127.0.0.1:8000/health — should return ok and SANDBOX.
- http://127.0.0.1:8000/docs — your actual API schemas.
- http://127.0.0.1:8000/app/integration.html — the integration console.

Use this HTTP URL, rather than opening the HTML file directly. Serving frontend and API together avoids CORS during initial integration. The default API adapter uses the current origin.

## 7. Start the evaluation worker

Open a second terminal in AgentGain:

```powershell
.\.venv\Scripts\python.exe worker.py
```

Leave it running alongside the API. Confirmed authorization queues a database job; the browser does not start the worker. The API lifespan starts the separate payment-controller loop when PAYMENT_CONTROLLER_ENABLED=1. That controller settles and reconciles payments after evaluations.

For strict worker credential isolation, run it as a separate process/container with only database and Ollama configuration, without mounting the API .env or supplying PayPal credentials. Running both from the same local folder loads the same .env via config.py; it is convenient for a local demo but does not implement that architectural isolation.

## 8. Set up the PayPal sandbox webhook

Your uploaded start_ngrok.py can expose port 8000. Set NGROK_AUTHTOKEN in .env and then run in a third terminal:

```powershell
.\.venv\Scripts\python.exe start_ngrok.py
```

In your PayPal sandbox app, register the printed HTTPS URL ending in /payments/webhook for relevant authorization, capture and void events. Put its webhook ID in PAYPAL_WEBHOOK_ID and restart the API. Keep the tunnel running. The application verifies webhook signatures server-side. Register the URL with PayPal; opening it in a browser sends GET, while the route accepts POST.

If the tunnel URL changes, update the webhook registration. Your local checkout can remain on 127.0.0.1; only webhooks require the public tunnel for this setup. If you intentionally browse the whole app through HTTPS, set PUBLIC_APP_URL to that origin and use that same origin throughout the checkout.

## 9. Execute the frontend flow

1. Open /app/integration.html. Enter your seller token. Click Check API.
2. Review the preloaded skill JSON. Register it. Save the returned skill ID. Registration returns a checkout link; use Load checkout to display authoritative price, hash and policy.
3. Switch to the buyer token. Optionally attempt the original task. If it fails and matches a skill task type, the API returns failure_id and a recommendation. If it succeeds, that is a real success; do not fabricate a failure. You can still enter checkout directly.
4. Review the dataset JSON. Its holdout inputs differ from the original input. Click Prepare dataset and save the dataset ID.
5. Create the FULL_SKILL contract. Review all returned terms, price, model, dataset hash, baseline hash, scoring and failure policy. Check the approval box and approve these exact terms. Approval submits the displayed version and hash.
6. Click Prepare PayPal button and then the PayPal button. Approve with a sandbox personal buyer account distinct from the merchant. SDK onApprove calls the backend authorize route. This confirms the authorization and queues evaluation. It does not capture immediately.
7. Click Watch status. The worker performs both configurations. The server computes the verdict and settles according to its rules. The frontend reads payment status and evidence every five seconds.
8. On CAPTURE_COMPLETED, request the receipt and tested package. On VOIDED, show the cancellation. A pending payment remains pending; stopping polling does not cancel funds. PAYMENT_ERROR requires operator investigation.
9. If you used a failed original task in the current page session and the skill was paid for, click Retry recorded original task. Its output is independent from evaluation evidence.
10. Switch to the seller token to view funnel and outcome records.

PayPal redirect recovery: enter the buyer token again, load the contract whose ID is populated in the return URL, and use Confirm authorization after PayPal return only after PayPal approval. Server checks remain authoritative. For any uncertain authorization response, inspect backend/PayPal status and reconcile before another payment action. The browser never marks a purchase paid from query parameters.

The sample skill and evaluation records are wiring examples, not evidence that the skill will improve the model. The baseline may already solve them. The default contract requires statistical significance; ten records with little improvement can legitimately produce INCONCLUSIVE. Keep actual results and use representative, independently checked holdout data for your demo.

## 10. Map your real screens to these exact routes

All protected requests use Authorization: Bearer <appropriate demo token>. JSON posts use Content-Type: application/json. The API prefixes are intentionally mixed in your uploaded backend; /api/contracts does not exist.

| Screen/action | Method and route | Role | Next data |
|---|---|---|---|
| Health | GET /health | Public | ok |
| Public SDK config (added) | GET /api/frontend-config | Public | paypal_client_id |
| Register skill | POST /api/skills/register | Seller | skill_id, checkout_link |
| Checkout metadata | GET /api/checkout/{skill_id} | Public | version, price_usd, seller_eval_policy |
| Original task | POST /api/buyer/attempt-task | Buyer | failure_id, recommended_skill |
| Holdout dataset | POST /api/datasets/prepare | Buyer | dataset_id, dataset_sha256 |
| Create contract | POST /contracts/ | Buyer | terms, terms_hash, contract_version |
| Resume contract | GET /contracts/{contract_id} | Buyer | terms and states |
| Approve terms | POST /contracts/{contract_id}/approve | Buyer | FROZEN |
| PayPal order | POST /payments/{contract_id}/order | Buyer | paypal_order_id |
| Authorize approved order | POST /payments/{contract_id}/authorize | Buyer | AUTHORIZED; job queued |
| Poll payment | GET /payments/{contract_id}/status | Buyer | payment_state, eval_verdict |
| Evidence | GET /analytics/contracts/{contract_id}/evidence | Buyer | ag_grid_rows and summary |
| Delivery | GET /payments/{contract_id}/receipt | Buyer | receipt and package/accepted outputs |
| Original task retry | POST /api/buyer/retry-original-task | Buyer | output, remaining_errors |
| Seller funnel | GET /analytics/seller/{skill_id}/funnel | Seller | backend counters |
| Seller outcomes | GET /analytics/seller/{skill_id}/outcomes | Seller | recorded outcomes |
| PayPal notifications | POST /payments/webhook | Provider signature | server verification |

Admin worker, settle and reconcile routes are operational routes and should not be called from the buyer UI. The automatic worker/controller already perform the normal flow.

## 11. Connect your existing HTML or React

In your existing frontend module:

```javascript
import { AgentGainAPI } from './api.js';
const api = new AgentGainAPI({getToken: () => buyerTokenFromYourDemoSession});
const skill = await api.checkout(skillId);
priceElement.textContent = skill.currency + ' ' + skill.price_usd;
const evidence = await api.evidence(contractId);
// With AG Grid Community, pass evidence.ag_grid_rows as rowData.
// Use baseline_accuracy_pct, skilled_accuracy_pct and net_lift_pct from the response.
```

Use textContent or React text rendering for API data. Do not put seller instructions or model outputs into innerHTML. In React, import api.js and paypal.js into your source tree, keep the API instance stable, and abort watchers in useEffect cleanup. The console uses a basic table; AG Grid is not installed or bundled. The existing backend already returns rows named ag_grid_rows for a future Community grid.

If running React separately on port 5173:

```javascript
const api = new AgentGainAPI({
  baseURL: 'http://127.0.0.1:8000',
  getToken: () => buyerTokenFromYourDemoSession
});
```

Ensure its exact origin is in FRONTEND_ORIGINS. Configure your React router to handle /checkout/:skillId and the PayPal return route when replacing this console. Do not expose the backend .env as frontend environment variables.

## 12. Architecture differences and limits to track

- Your backend uses static demo tokens, one seller, USD, local models and PayPal SANDBOX. This is not a public marketplace account system.
- Checkout requires a known skill ID; there is no public skill listing endpoint in these files.
- Recommendations currently choose the first skill with a matching supported_tasks value. They do not use Qwen to recommend or explain compatibility.
- Before capture, analytics deliberately returns null skilled_output/skilled_error. Show locked outputs plus actual correctness/resource evidence. After capture, reload to show unlocked results. Your architecture's unrestricted side-by-side pre-capture outputs are not implemented.
- The current failure policy permits zero technical retries. Do not promise automatic retries in the interface.
- VERIFIED_WORK exists in the backend in addition to FULL_SKILL. It authorizes a maximum and bills accepted records, delivers accepted outputs, and forbids original-task retry with the skill. This console deliberately selects FULL_SKILL to match the supplied 17-step architecture.
- Skill records contain the immutable package version/hash; the generated checkout link includes version but GET /api/checkout/{id} does not validate a version query parameter. Always display the returned version and frozen contract terms.
- The console preserves a contract ID in the return URL, but keeps tokens and the current original failure ID in page memory. A complete product UI should provide authenticated history/resume screens.
- The guard detects certain text patterns; it is not proof that a hostile model cannot leak instructions. Avoid treating it as a complete isolation boundary.
- Cross-cutting payment recovery and worker crash handling still need integration testing. An early worker initialization failure can complete a job without setting a nonpending verdict, leaving the automatic settlement selector unable to settle it. Investigate worker logs and reconcile server state rather than treating a stuck job as a pass.

## 13. Troubleshooting and verification

| Symptom | Check |
|---|---|
| 401 | Enter the token from the active .env; restart API after changing it. |
| 403 | Buyer vs seller role, ownership, or unpaid delivery gate. |
| 422 | Expand API detail; use /docs schema, valid record count/model and seller policy. |
| 409 | Reload contract/status; do not repeat payment actions blindly. |
| PayPal 503 | Sandbox credentials missing in API environment. |
| PayPal button missing | SDK network load, client ID, browser eligibility and approved contract. |
| AUTHORIZED never advances | Worker running? Same database? Ollama model installed? Worker logs? |
| PASS but pending payment | Payment controller enabled? API logs/provider reconciliation? |
| Skilled output is null | Expected before confirmed capture. |
| Import/module errors | Use the same .venv python and repository root in all terminals. |
| Database connection argument error | Apply database.py from this overlay. |

Validation performed here: Python syntax compilation and JavaScript syntax checks. Backend runtime dependencies are absent in this workspace; PostgreSQL, Ollama execution, PayPal approval, webhook verification and actual capture/void have not been exercised. Run one successful evaluation and one failed/inconclusive evaluation with your sandbox setup; verify the receipt gate, capture/void state and seller counters against recorded backend results. Never label sandbox captures as real revenue.

PayPal SDK reference checked: https://developer.paypal.com/sdk/js/set-up/ (29 October 2026). This integration uses SDK v6 createInstance with clientId, eligibility checking, one-time sessions, and an order promise resolving to {orderId}. Capture authority stays in your existing backend.
