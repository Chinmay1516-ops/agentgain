"""Central settings. Environment variables are loaded from .env for local development."""
import os
from functools import lru_cache
from urllib.parse import urlparse, parse_qsl, urlencode
from dotenv import load_dotenv

load_dotenv()


@lru_cache
def get_settings() -> dict:
    database_url = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./agentgain.db"
    ).strip()

    if not database_url:
        database_url = "sqlite+aiosqlite:///./agentgain.db"

    if database_url.startswith(("postgres://", "postgresql://")):
        database_url = (
            "postgresql+asyncpg://"
            + database_url.split("://", 1)[1]
        )

    if database_url.startswith("postgresql+asyncpg://"):
        base_url, _, query = database_url.partition("?")
        params = dict(parse_qsl(query))

        if "sslmode" in params:
            params["ssl"] = params.pop("sslmode")

        params.pop("channel_binding", None)

        database_url = base_url
        if params:
            database_url += "?" + urlencode(params)

    paypal_url = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com").rstrip("/")
    if paypal_url != "https://api-m.sandbox.paypal.com":
        raise RuntimeError("Only the PayPal SANDBOX API is allowed in this build.")

    ollama_url = os.getenv(
        "OLLAMA_BASE_URL", "http://127.0.0.1:11434"
    ).strip().rstrip("/")

    parsed = urlparse(ollama_url)
    remote_host = os.getenv("OLLAMA_REMOTE_HOST", "").strip().lower()

    local_allowed = (
        parsed.scheme == "http"
        and parsed.hostname in ("localhost", "127.0.0.1", "ollama")
    )

    remote_allowed = (
        parsed.scheme == "https"
        and bool(remote_host)
        and parsed.hostname == remote_host
        and bool(os.getenv("OLLAMA_PASSWORD", ""))
    )

    if not (local_allowed or remote_allowed):
        raise RuntimeError("Ollama address is not permitted")
    models = [
        name.strip()
        for name in os.getenv(
            "ALLOWED_OLLAMA_MODELS", "qwen2.5:7b-instruct"
        ).split(",")
        if name.strip()
    ]

    if not models:
        raise RuntimeError("Set ALLOWED_OLLAMA_MODELS to at least one model.")

    return {
        "DATABASE_URL": database_url,
        "PAYPAL_BASE_URL": paypal_url,
        "PAYPAL_CLIENT_ID": os.getenv("PAYPAL_CLIENT_ID", "").strip(),
        "PAYPAL_SECRET": os.getenv("PAYPAL_SECRET", "").strip(),
        "PAYPAL_WEBHOOK_ID": os.getenv("PAYPAL_WEBHOOK_ID", "").strip(),
        "FRONTEND_ORIGINS": [
            x.strip()
            for x in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:8000").split(",")
            if x.strip()
        ],
        "BUYER_ID": os.getenv("DEMO_BUYER_ID", "buyer_acme_ops").strip(),
        "SELLER_ID": os.getenv("DEMO_SELLER_ID", "seller_catalog_ai").strip(),
        "ADMIN_ID": os.getenv("DEMO_ADMIN_ID", "admin_controller").strip(),
        "BUYER_TOKEN": os.getenv("DEMO_BUYER_TOKEN", "buyer_sandbox_secret_token_1234567890abcdef"),
        "SELLER_TOKEN": os.getenv("DEMO_SELLER_TOKEN", "seller_sandbox_secret_token_1234567890abcdef"),
        "ADMIN_TOKEN": os.getenv("DEMO_ADMIN_TOKEN", "admin_sandbox_secret_token_1234567890abcdef"),
        "ALLOWED_OLLAMA_MODELS":models,
        "OLLAMA_BASE_URL": ollama_url,
        "MIN_EVAL_RECORDS": max(3, int(os.getenv("MIN_EVAL_RECORDS", "3"))),
        "PAYMENT_POLL_SECONDS": max(5, int(os.getenv("PAYMENT_POLL_SECONDS", "15"))),
        "PAYMENT_CONTROLLER_ENABLED": os.getenv("PAYMENT_CONTROLLER_ENABLED", "1") == "1",
        "MAX_JOB_RUNTIME_SECONDS": max(300, int(os.getenv("MAX_JOB_RUNTIME_SECONDS", "7200"))),

        # NEW: OneIntent + Elastic
        "ELASTICSEARCH_URL": os.getenv("ELASTICSEARCH_URL", "").strip(),
        "KIBANA_URL": os.getenv("KIBANA_URL", "").strip(),
        "ELASTIC_API_KEY": os.getenv("ELASTIC_API_KEY", "").strip(),
        "ELASTIC_AGENT_ID": os.getenv("ELASTIC_AGENT_ID", "").strip(),
        "ELASTIC_INTENTS_INDEX": os.getenv("ELASTIC_INTENTS_INDEX", "").strip(),
        "ONEINTENT_ENABLED": os.getenv("ONEINTENT_ENABLED", "1").strip() == "1",
    }
