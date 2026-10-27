import os
from dotenv import load_dotenv

load_dotenv()

def get_settings() -> dict:
    return {
        "DB_URL": os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./agentgain.db"),
        "PAYPAL_BASE_URL": os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com").rstrip("/"),
        "PAYPAL_CLIENT_ID": os.getenv("PAYPAL_CLIENT_ID", ""),
        "PAYPAL_SECRET": os.getenv("PAYPAL_SECRET", ""),
        "PAYPAL_WEBHOOK_ID": os.getenv("PAYPAL_WEBHOOK_ID", ""),
    }