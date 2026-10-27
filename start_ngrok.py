"""Start an ngrok tunnel for AgentGain's PayPal Sandbox webhook.

Run this after starting FastAPI locally. No separate ngrok.exe is needed.
The official ngrok Python SDK is installed into this Python environment if missing.
"""

import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen


def require_module(module_name: str, pip_name: str):
    try:
        return importlib.import_module(module_name)
    except ModuleNotFoundError:
        print(f"Installing Python package '{pip_name}' (first run only)...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name])
        return importlib.import_module(module_name)


dotenv = require_module("dotenv", "python-dotenv")
dotenv.load_dotenv(Path(__file__).resolve().parent / ".env")

if not os.getenv("NGROK_AUTHTOKEN"):
    raise SystemExit("Missing NGROK_AUTHTOKEN in agentgain/.env")

port = int(os.getenv("AGENTGAIN_PORT", "8000"))
try:
    with urlopen(f"http://127.0.0.1:{port}/openapi.json", timeout=5) as response:
        paths = json.load(response).get("paths", {})
    if "post" not in paths.get("/payments/webhook", {}):
        raise SystemExit("FastAPI is running, but POST /payments/webhook is missing.")
except (URLError, TimeoutError) as exc:
    raise SystemExit(f"Start your AgentGain FastAPI backend on port {port} first: {exc}")

ngrok = require_module("ngrok", "ngrok")
listener = ngrok.forward(f"127.0.0.1:{port}", authtoken_from_env=True)
webhook_url = listener.url().rstrip("/") + "/payments/webhook"

print("\n" + "=" * 60)
print("COPY THIS URL INTO PAYPAL SANDBOX WEBHOOKS:\n")
print(webhook_url)
print("\nSave PayPal's Webhook ID as PAYPAL_WEBHOOK_ID in .env.")
print("WARNING: This tunnel exposes your entire local FastAPI app.")
print("Use only for brief sandbox tests with other routes secured.")
print("Press Ctrl+C to close the tunnel.")
print("=" * 60 + "\n")

try:
    while True:
        time.sleep(2)
except KeyboardInterrupt:
    print("Closing ngrok tunnel...")
finally:
    ngrok.disconnect(listener.url())
