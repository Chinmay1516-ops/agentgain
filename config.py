"""Central settings. Environment variables are loaded from .env for local development."""
import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


@lru_cache
def get_settings() -> dict:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL must be configured (PostgreSQL recommended).")

    paypal_url = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com").rstrip("/")
    # This submission is sandbox-only. Production credentials must never be used accidentally.
    if paypal_url != "https://api-m.sandbox.paypal.com":
        raise RuntimeError("Only the PayPal SANDBOX API is allowed in this build.")

    from urllib.parse import urlparse
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    parsed = urlparse(ollama_url)
    if parsed.scheme != "http" or parsed.hostname not in ("localhost", "127.0.0.1", "ollama"):
        raise RuntimeError("OLLAMA_BASE_URL must point to the local Ollama service")
    models = [x.strip() for x in os.getenv("ALLOWED_OLLAMA_MODELS", "qwen2.5:7b-instruct").split(",") if x.strip()]
    if not models:
        raise RuntimeError("Set ALLOWED_OLLAMA_MODELS to at least one locally installed model.")
    return {
        "DATABASE_URL": database_url,
        "PAYPAL_BASE_URL": paypal_url,
        "PAYPAL_CLIENT_ID": os.getenv("PAYPAL_CLIENT_ID", ""),
        "PAYPAL_SECRET": os.getenv("PAYPAL_SECRET", ""),
        "PAYPAL_WEBHOOK_ID": os.getenv("PAYPAL_WEBHOOK_ID", ""),
        "FRONTEND_ORIGINS": [x.strip() for x in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",") if x.strip()],
        "BUYER_ID": os.getenv("DEMO_BUYER_ID", "").strip(),
        "SELLER_ID": os.getenv("DEMO_SELLER_ID", "").strip(),
        "ADMIN_ID": os.getenv("DEMO_ADMIN_ID", "").strip(),
        "BUYER_TOKEN": os.getenv("DEMO_BUYER_TOKEN", ""),
        "SELLER_TOKEN": os.getenv("DEMO_SELLER_TOKEN", ""),
        "ADMIN_TOKEN": os.getenv("DEMO_ADMIN_TOKEN", ""),
        "ALLOWED_OLLAMA_MODELS": models,
        "OLLAMA_BASE_URL": ollama_url,
        "MIN_EVAL_RECORDS": max(10, int(os.getenv("MIN_EVAL_RECORDS", "20"))),
        "PAYMENT_POLL_SECONDS": max(5, int(os.getenv("PAYMENT_POLL_SECONDS", "15"))),
        "PAYMENT_CONTROLLER_ENABLED": os.getenv("PAYMENT_CONTROLLER_ENABLED", "1") == "1",
        "MAX_JOB_RUNTIME_SECONDS": max(300, int(os.getenv("MAX_JOB_RUNTIME_SECONDS", "7200"))),
    }
