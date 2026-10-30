"""Run from the AgentGain repository root: uvicorn integration_server:app --reload"""
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from main import app
from ui_routes import router as ui_router
app.include_router(ui_router)
from config import get_settings


@app.get("/api/frontend-config")
async def frontend_config():
    # Publish only the client ID; never publish secrets or demo access tokens.
    return {"paypal_client_id": get_settings()["PAYPAL_CLIENT_ID"], "environment": "SANDBOX"}


@app.get("/checkout/{skill_id}")
async def checkout_page(skill_id: str):
    from urllib.parse import urlencode
    return RedirectResponse("/app/integration.html?" + urlencode({"skill_id": skill_id}))


app.mount("/app", StaticFiles(directory=Path(__file__).parent / "frontend", html=True), name="frontend")

app.mount("/integration-examples", StaticFiles(directory=Path(__file__).parent / "examples"), name="integration-examples")
