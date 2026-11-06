<div align="center">
  <img src="frontend/assets/favicon-BzRlZ162.svg" width="76" alt="AgentGain logo" />
  <h1>AgentGain</h1>
  <p><strong>Proof before payment.</strong></p>
  <p><em>An AI-skill marketplace where buyers can test a capability on their own data before paying for the value it delivers.</em></p>
  <p><strong>PayPal AI Hackathon 2026 · Working Sandbox MVP</strong></p>
  <p>
    <a href="#what-agentgain-does">Features</a> ·
    <a href="#how-it-works">How it works</a> ·
    <a href="#quick-start">Quick start</a> ·
    <a href="#demo-walkthrough">Demo</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#deployment-readiness">Deployment</a>
  </p>
</div>

---

## The problem

AI agents can discover tools and specialized instructions, but purchasing them still raises difficult questions:

- **Will this skill actually improve my agent?** A polished listing is not evidence.
- **Why should I pay for failed outputs?** A flat fee does not reflect accepted work.
- **What happens if two agents buy for the same need?** Overlapping purchases can create avoidable spending.

**AgentGain moves the decision from “trust the listing” to “verify the result.”** The seller supplies a versioned skill, the buyer supplies independently checked test cases, and the system ties payment to the outcome of a frozen evaluation agreement.

## What AgentGain does

| Capability | What the buyer gets |
| --- | --- |
| **Skill marketplace** | Discover a registered skill, review its description and purchase terms, and select a payment model. |
| **Full Skill** | Test the complete reusable skill against a baseline agent. Capture the agreed fixed price **only if** the evaluation passes; release the tested skill after confirmed capture. |
| **Verified Work** | Authorize a maximum upfront, then pay a fixed rate **per accepted output**. Receive accepted results, **not** the seller's reusable instructions. |
| **Independent evaluation** | Run the same allowlisted Ollama model without and with the seller's skill, then check the answers against buyer-provided ground truth and a JSON Schema. |
| **Frozen contracts** | Record the skill version/hash, dataset hash, model, scoring rules, price and approval in a tamper-evident SHA-256 terms snapshot. |
| **OneIntent** | Compare proposed purchases from different requesting agents; use Elastic for possible semantic overlap and PostgreSQL for scope and reservation safeguards. The buyer decides how to proceed. |
| **Evidence and analytics** | Inspect baseline-versus-skilled performance, record-level verdicts, settlement state, seller outcomes and purchase-request evidence. |

> **Important distinction:** “Verified Work” does **not** split a skill into purchasable fragments. It buys the *successful output of the skill* without granting ownership of the skill package.

## How it works

### Flow 1 — Marketplace, verification and payment

```mermaid
flowchart TD
    S[Seller registers versioned skill] --> B[Buyer selects skill]
    B --> M{Purchase model}
    M -->|Full Skill| F[Fixed licence price]
    M -->|Verified Work| V[Price per accepted record]
    F --> D[Buyer prepares checked dataset and evaluation rules]
    V --> D
    D --> C[Buyer reviews and freezes contract]
    C --> A[PayPal Sandbox authorizes maximum amount]
    A --> E[Ollama runs baseline and skill-assisted evaluations]
    E --> G[Deterministic verification against checked answers]
    G --> P{Eligible outcome?}
    P -->|Full Skill PASS| FC[Capture full price; deliver tested skill]
    P -->|Verified Work accepted records| VC[Capture accepted-work amount; deliver accepted outputs]
    P -->|Not eligible| X[Void authorization; do not deliver paid content]
    FC --> R[Receipt, evidence and seller analytics]
    VC --> R
    X --> R
```

The two runs use the **same underlying model**. The baseline receives the buyer's task and baseline configuration. The skill-assisted run additionally receives the seller's instructions and examples. Both are verified against the buyer's checked answers; the browser does not invent a PASS or instruct PayPal to capture.

**Full Skill:** The evaluator applies the contract's accuracy floor, minimum improvement in percentage points, regression limit, token limits and, when enabled, paired statistical-significance check. A technically unsuccessful or insufficient evaluation does not qualify for payment.

**Verified Work:** Each skilled output must meet the checked-answer/schema requirements and token cap. The payable amount is:

```text
accepted_record_count × agreed_unit_price_usd
```

For example, at **$4 per accepted record**, a five-record batch authorizes **up to $20**; if three records qualify, the eligible capture is **$12**. These figures are illustrative; actual results and settlement are determined by the backend and PayPal.

### Flow 2 — OneIntent (separate demonstration)

```mermaid
flowchart TD
    A[Agent A requests capability for Batch X] --> PA[Purchase purpose recorded]
    B[Agent B requests similar capability for Batch X] --> PB[Second purpose recorded]
    PA --> O[OneIntent overlap review]
    PB --> O
    O --> EL[Elastic search and Agent Builder review]
    O --> EX[Exact-scope cross-check]
    EL --> UI[AG Grid evidence for buyer]
    EX --> UI
    UI --> DEC{Buyer decision}
    DEC -->|Continue Existing| CE[Cancel new request; reuse existing purchase]
    DEC -->|Buy Both| BB[Explicitly approve separate purchases]
    DEC -->|Cancel New| CA[Cancel request]
```

Agent A and Agent B are **requesting-agent identities entered manually in the current demo**, not an assertion that two autonomous agents are independently shopping. The database records both requests; Elastic helps flag similarities, and exact-scope safeguards apply independently. The frontend provides an AG Grid view of purchase records and overlap evidence.

**Presentation vs. enforcement:** We demonstrate OneIntent separately from the payments storyline, but when `ONEINTENT_ENABLED=1`, the backend requires a cleared intent before contract creation and a reservation before checkout. The demo presentation does not bypass that safeguard.

## Architecture

```mermaid
flowchart LR
    UI[Web frontend\nBuyer / Seller / OneIntent] --> API[FastAPI\ncheckout_server.py]
    API <--> DB[(PostgreSQL / Neon)]
    API --> PP[PayPal Sandbox\nAuthorize · Capture · Void]
    API --> ES[Elastic + Kibana Agent Builder\nPurchase overlap review]
    DB <--> W[Evaluation worker\nworker.py]
    W --> L[Ollama\nQwen 2.5]
    W --> VR[Deterministic verifier\nverifier.py]
    VR --> DB
    API --> AG[AG Grid\nEvidence presentation]
```

| Layer | Implementation |
| --- | --- |
| Frontend | Browser SPA in `frontend/index.html` + compiled `frontend/app.js`, with original assets in `frontend/assets/` |
| API and orchestration | Python, FastAPI, Pydantic, SQLAlchemy asyncio |
| Data persistence | PostgreSQL (including hosted Neon); optional SQLite for limited local testing |
| Model evaluation | Ollama with allowlisted models, default `qwen2.5:7b-instruct` |
| Verification | `jsonschema` and the deterministic checks in `verifier.py` |
| Payment | PayPal **Sandbox** Orders/Authorization/Capture/Void APIs and server-side webhook handling |
| Purchase intelligence | Elasticsearch, Kibana Agent Builder, PostgreSQL scope reservations |
| Evidence interface | AG Grid / frontend reporting |

The backend does **not** run uploaded executable skill files. Skills are validated structured instructions/examples. Model calls and payment settlement happen server-side.

## Quick start

### Prerequisites

- Python **3.11 or 3.12** (recommended)
- PostgreSQL (local via Docker or hosted Neon)
- [Ollama](https://ollama.com/) with an installed allowlisted model
- A PayPal **Sandbox** REST app, merchant account and separate personal buyer account
- Elasticsearch and Kibana Agent Builder configuration **if OneIntent is enabled**

### 1. Install Python dependencies

From the repository root, on **Windows PowerShell**:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

On macOS/Linux:

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
```

There is no Node/Vite build step required for the checked-in compiled frontend.

### 2. Configure the environment

Create a local `.env` file at the repository root. **Do not commit it.**

```dotenv
# PostgreSQL; replace with your Neon URL if using hosted Postgres.
DATABASE_URL=postgresql+asyncpg://agentgain:agentgain_local_password@localhost:5432/agentgain

# Sandbox only. The current backend rejects the live PayPal API URL.
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=replace_with_sandbox_client_id
PAYPAL_SECRET=replace_with_sandbox_secret
PAYPAL_WEBHOOK_ID=replace_with_sandbox_webhook_id
PUBLIC_APP_URL=http://127.0.0.1:8000

# Generate three different, strong random strings. Never reuse these examples.
DEMO_BUYER_TOKEN=replace_with_random_buyer_token
DEMO_SELLER_TOKEN=replace_with_random_seller_token
DEMO_ADMIN_TOKEN=replace_with_random_admin_token

OLLAMA_BASE_URL=http://127.0.0.1:11434
ALLOWED_OLLAMA_MODELS=qwen2.5:7b-instruct
MIN_EVAL_RECORDS=3
PAYMENT_CONTROLLER_ENABLED=1

# Set to 1 only after completing all Elastic configuration below.
ONEINTENT_ENABLED=0
ELASTICSEARCH_URL=https://your-deployment.es.region.elastic.cloud
KIBANA_URL=https://your-deployment.kb.region.elastic.cloud
ELASTIC_API_KEY=replace_with_elastic_api_key
ELASTIC_AGENT_ID=replace_with_agent_id
ELASTIC_INTENTS_INDEX=replace_with_index_name
```

Generate three distinct demo tokens with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Run the command **three times**. The project has development fallback tokens in `config.py`; explicitly replacing them in `.env` is essential before hosting the sandbox demo anywhere others can access it.

For a hosted database, use a compatible `postgresql+asyncpg://` URL. Avoid committing database credentials or copying the `.env` into any frontend asset.

### 3. Start the database and model

If using **local PostgreSQL** (skip this when `DATABASE_URL` points to Neon):

```bash
docker compose up -d postgres
```

Install and start the configured Ollama model:

```bash
ollama pull qwen2.5:7b-instruct
ollama list
```

Start Ollama with `ollama serve` only if it is not already running.

**Schema note:** A fresh database gets missing tables on API startup. For an *existing PostgreSQL database*, check the Verified Work/OneIntent migration **after backing up the database**:

```bash
python migrate_oneintent.py --check
python migrate_oneintent.py    # only if migration is needed
```

Do not run the migration blindly against another database. `--check` needs the existing `evaluation_contracts` table and does not modify data.

### 4. Run the application and evaluation worker

Open **two terminals**, in the repository root:

**Terminal A — API and frontend**

```bash
python -m uvicorn checkout_server:app --reload --host 127.0.0.1 --port 8000
```

**Terminal B — paid evaluation worker**

```bash
python worker.py
```

> **Use `checkout_server:app` for the designed frontend and paid sandbox flow.** `main:app` exposes the core API but does not serve the homepage at `/`. Do not run `demo_worker.py` in place of `worker.py` for PayPal-authorized evaluations.

Open:

| URL | Purpose |
| --- | --- |
| `http://127.0.0.1:8000/` | AgentGain homepage |
| `http://127.0.0.1:8000/seller` | Seller workspace |
| `http://127.0.0.1:8000/seller/register` | Register a skill |
| `http://127.0.0.1:8000/buyer` | Buyer workspace |
| `http://127.0.0.1:8000/buyer/skills` | Explore skills |
| `http://127.0.0.1:8000/?view=oneintent` | OneIntent purchase control centre |
| `http://127.0.0.1:8000/health` | API health check |
| `http://127.0.0.1:8000/docs` | Interactive FastAPI documentation |

Use the buyer/seller demo tokens through the frontend access panel. The browser and API should be served from the **same origin** for the simplest local setup.

### 5. PayPal webhooks

Configure a PayPal **Sandbox** webhook to reach:

```text
https://your-public-https-host/payments/webhook
```

Use the corresponding Sandbox webhook ID in `PAYPAL_WEBHOOK_ID`. Local development can use a secure tunnel (the repository includes `start_ngrok.py`). Set `PUBLIC_APP_URL` to the origin users actually visit so PayPal return URLs resolve correctly. Restart the API after changing environment values.

## Demo walkthrough

**Record two separate stories.** OneIntent remains a backend checkout safeguard when enabled, but its dedicated feature demo need not interrupt the payment narrative.

### Story A — Prove the skill, then pay

1. **Seller:** Register a versioned skill with instructions, examples, supported task and a Full Skill price. Optionally enable per-accepted-record pricing.
2. **Buyer:** Explore the marketplace, open the skill and choose **Full Skill** or **Verified Work**.
3. **Test setup:** Upload a JSON dataset with task inputs and *independently checked answers*, choose a model and review the verification criteria.
4. **Contract:** Approve the exact frozen terms; the backend verifies the terms hash.
5. **PayPal:** Approve the Sandbox authorization. **`AUTHORIZED` is not `CAPTURE_COMPLETED`.**
6. **Evaluation:** The worker runs baseline and skilled evaluations. The verifier checks actual results and records the verdict.
7. **Settlement:** Full Skill captures only after an eligible PASS. Verified Work captures only the payable accepted-record amount. Ineligible outcomes trigger void handling.
8. **Evidence:** Show the final payment state, record-level results and receipt/delivery; finish with seller activity.

**Upload format (evaluation records):**

```json
[
  {
    "input": { "text": "INVOICE=INV-4000 | TOTAL=10.20 | CURRENCY_CODE=NX-P41" },
    "checked_answer": { "invoiceNumber": "INV-4000", "total": "10.20", "currency": "USD" }
  }
]
```

This is a **format example only**, not a complete evaluation dataset; the actual backend minimum is controlled by `MIN_EVAL_RECORDS` and the seller/contract rules. The buyer's output JSON Schema must match the expected answer. For specialist-code tests, the seller's registered skill must contain the codebook while the baseline should not. A test cannot be guaranteed to PASS: use recorded, reproducible model results rather than mock scores.

### Story B — OneIntent: prevent overlapping purchases

1. Manually create **Agent A**'s purchase request for an invoice batch, check and clear it, then reserve the linked approved contract.
2. Manually create **Agent B**'s request for the **same buyer and purchase scope**, with a differently worded purpose.
3. Run the overlap check. Show Elastic's review, the exact-scope cross-check and both requests in the AG Grid evidence view.
4. Choose **Continue Existing** to cancel Agent B's new request; the earlier purchase must already be **RESERVED** or **COMPLETED**. Alternatively demonstrate the explicit **Buy Both** or **Cancel New** decision.

**Agent A/B are manually entered request identifiers in the demo**, not externally authenticated autonomous agents. The protection applies to purchases routed through AgentGain; it does not intercept arbitrary payments made elsewhere.

## Key API routes

| Action | Endpoint |
| --- | --- |
| Service health | `GET /health` |
| Public skill catalogue | `GET /api/skills` |
| Seller registration | `POST /api/skills/register` |
| Buyer dataset preparation | `POST /api/datasets/prepare` |
| Create and approve contract | `POST /contracts/` · `POST /contracts/{id}/approve` |
| Create and authorize PayPal order | `POST /payments/{id}/order` · `POST /payments/{id}/authorize` |
| Payment status and receipt | `GET /payments/{id}/status` · `GET /payments/{id}/receipt` |
| Evaluation evidence | `GET /analytics/contracts/{id}/evidence` |
| Seller funnel and outcomes | `GET /analytics/seller/{skill_id}/funnel` · `GET /analytics/seller/{skill_id}/outcomes` |
| OneIntent create/check/resolve/reserve | `POST /intents` · `POST /intents/{id}/check` · `POST /intents/{id}/resolve` · `POST /intents/{id}/reserve` |
| List purchase intents | `GET /intents` |
| Verified PayPal webhook | `POST /payments/webhook` |

Role-restricted endpoints require `Authorization: Bearer <demo-token>`. API request/response shapes are documented at `/docs`.

## Project structure

```text
agentgain/
├── frontend/
│   ├── index.html           # Designed frontend and styles
│   ├── app.js               # Compiled browser application
│   └── assets/              # Homepage animation, images, fonts, favicon
├── checkout_server.py      # Frontend-serving PayPal Sandbox entry point
├── main.py                 # Core FastAPI app and API routers
├── ui_routes.py            # Frontend-facing listing and summary endpoints
├── models.py               # Database entities and purchase lifecycle
├── database.py             # Async DB engine and sessions
├── config.py               # Environment configuration
├── auth.py                 # Demo bearer-token authentication
├── contracts.py            # Contract validation, hashes and approval
├── payments.py             # PayPal orders, authorization, settlement, receipts
├── worker.py               # Actual paid evaluation worker using Ollama
├── verifier.py             # Deterministic grading and work acceptance
├── intent_guard.py         # OneIntent request decisions and reservations
├── intent_agent.py         # Elastic/Kibana integration
├── analytics.py            # Buyer evidence and seller metrics
├── package_guard.py        # Skill/package input checks
├── migrate_oneintent.py    # Existing-Postgres migration/check
├── demo_server.py          # Optional no-payment evaluation mode
├── demo_worker.py          # Worker for that separate demo mode
├── docker-compose.yml      # Local PostgreSQL
└── requirements.txt
```

The repository includes older integration/demo utilities as well. For the current paid walkthrough, **`checkout_server.py` + `worker.py` are the relevant entry points**.

## Deployment readiness

The current build is a **working, limited-access hackathon MVP**, not a production-ready public marketplace. Before making it reachable on the internet:

- [ ] **Keep payments in Sandbox.** `config.py` explicitly rejects a live PayPal API base URL. Do not claim real-money payment support or attempt to enable it by changing configuration alone.
- [ ] **Replace demo-token authentication** with actual account identity, session management, buyer/seller authorization, rate limits and safe account recovery before a public release. Explicitly set strong non-default demo tokens for a restricted showcase.
- [ ] **Deploy PostgreSQL** for OneIntent. Its concurrency checks use PostgreSQL advisory locks; SQLite is insufficient for that flow. Back up and migrate an existing database rather than relying on table creation to add columns.
- [ ] **Run the API, payment controller, evaluation worker and Ollama with stable connectivity.** The code permits a local Ollama endpoint (`localhost`, `127.0.0.1`, or `ollama`); remote model hosting requires deliberate engineering changes.
- [ ] **Set a public HTTPS origin** in `PUBLIC_APP_URL`; configure and verify PayPal Sandbox callbacks and webhook signatures.
- [ ] **Configure Elastic completely** (`ELASTICSEARCH_URL`, `KIBANA_URL`, API key, agent ID and index). Confirm semantic review and network-failure behavior before switching `ONEINTENT_ENABLED=1`.
- [ ] **Protect secrets and data.** Do not ship `.env`, private buyer datasets, API keys, worker credentials or PayPal secrets in the frontend or public repository. Use a secrets manager on the host.
- [ ] **Test the whole payment state machine.** Confirm authorized → captured, authorized → voided, partial Verified Work capture, duplicate webhook delivery, worker failure, restart/reconciliation and idempotent retries. Never infer payment success solely from a browser redirect.
- [ ] **Check runtime dependencies.** Confirm the exact deployed `frontend/app.js` and `frontend/index.html` match the intended final UI, all assets are served, and any external AG Grid dependencies load or have a usable fallback.
- [ ] **Add production operations.** Structured logs, health/readiness checks, database backups, request limits, error monitoring and a reviewed migration/rollback plan.
- [ ] **Review licensing and disclosure.** No project licence is declared in this snapshot; add one deliberately if open-sourcing. Do not imply endorsement by PayPal, Elastic or AG Grid.

For a **restricted, sandbox-only showcase**, a process manager can run the following separately, with the correct environment and network access:

```bash
python -m uvicorn checkout_server:app --host 0.0.0.0 --port 8000
python worker.py
```

Do **not** use `--reload` outside local development. Both processes must use the same database; Ollama and, if enabled, Elastic must be reachable. Restrict who can use the deployment until authentication is upgraded.

## Troubleshooting

| Symptom | First check |
| --- | --- |
| `/` returns 404 | Start `checkout_server:app`, **not** `main:app`. |
| `401` / `403` | Correct buyer/seller bearer token and ownership; reset access after browser refresh. |
| `422` on dataset | Required `input` + `checked_answer`, schema validity, record minimum, model allowlist. |
| Full Skill FAIL despite correct outputs | Baseline also succeeded; review lift, regressions, token limit and significance. A PASS is not guaranteed. |
| PayPal order remains AUTHORIZED | Paid `worker.py`, Ollama, shared database and payment controller are running; examine logs before retrying. |
| Receipt unavailable | Only `PASS` plus **confirmed** `CAPTURE_COMPLETED` unlocks paid delivery. |
| OneIntent unavailable or check fails | `ONEINTENT_ENABLED`, PostgreSQL and complete Elastic/Kibana settings; review returned error. |
| Buyer sees overlapping request but cannot Continue Existing | Earlier intent must be `RESERVED` or `COMPLETED`. |
| Frontend loads but some components do not | Verify latest `app.js`, `index.html`, assets and external CDN availability. |

## Current scope and limitations

- Payments operate in **PayPal Sandbox only**, in **USD**, with a configured demo merchant.
- Authentication is intentionally limited to fixed buyer/seller/admin demo identities; this is **not** public multi-tenant onboarding.
- Buyer-provided checked answers are essential: AgentGain measures test correctness, **not** whether a skill is universally reliable in every real-world situation.
- OneIntent reviews purchase requests entered/routed through this system. It does not autonomously control or discover every external agent purchase.
- The codebase demonstrates **PayPal, Elastic and AG Grid** integration. Other hackathon partner services should not be represented as implemented integrations unless added and verified.
- Actual model verdicts can be `PASS`, `FAIL`, `INCONCLUSIVE` or `TECHNICAL_ERROR`. An unsuccessful outcome is part of the protection, not automatically an application defect.

---

<div align="center">

**AgentGain — Test it. Verify it. Then pay for it.**

*Built for the PayPal AI Hackathon 2026.*

</div>
