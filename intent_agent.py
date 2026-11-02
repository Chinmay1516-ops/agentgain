import json
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

class IntentAgentError(Exception):
    pass


def get_elastic_settings():
    keys = (
        "ELASTICSEARCH_URL",
        "KIBANA_URL",
        "ELASTIC_API_KEY",
        "ELASTIC_AGENT_ID",
        "ELASTIC_INTENTS_INDEX",
    )

    settings = {key: os.getenv(key, "").strip() for key in keys}

    if not all(settings.values()):
        raise IntentAgentError("Elastic settings are incomplete")

    if not settings["ELASTICSEARCH_URL"].startswith("https://"):
        raise IntentAgentError("Elasticsearch must use HTTPS")

    if not settings["KIBANA_URL"].startswith("https://"):
        raise IntentAgentError("Kibana must use HTTPS")

    return settings


def intent_metadata(intent):
    """Send only purchase metadata, not private skill instructions."""

    details = intent.scope_metadata_json or {}

    return {
        "id": intent.id,
        "buyer_id": intent.buyer_id,
        "purpose": intent.purpose[:500],
        "scope_key": intent.scope_key,
        "task_type": str(details.get("task_type", ""))[:100],
        "recipient": str(details.get("recipient", ""))[:100],
        "status": intent.status.value,
    }


async def index_intent(intent):
    """Save purchase metadata in the configured Elastic index."""

    settings = get_elastic_settings()

    url = (
        settings["ELASTICSEARCH_URL"].rstrip("/")
        + f"/{settings['ELASTIC_INTENTS_INDEX']}/_doc/{intent.id}"
    )

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            response = await client.put(
                url,
                params={"refresh": "wait_for"},
                headers={
                    "Authorization": f"ApiKey {settings['ELASTIC_API_KEY']}"
                },
                json=intent_metadata(intent),
            )

            response.raise_for_status()

        except httpx.HTTPError as exc:
            raise IntentAgentError(
                "Could not index purchase intent in Elastic"
            ) from exc


async def search_similar_intents(buyer_id: str,purpose: str,scope_key: str,) -> list[str]:
    """Search only the current buyer's indexed purchases."""

    settings = get_elastic_settings()

    query = {
        "size": 25,
        "_source": ["id"],
        "query": {
            "bool": {
                "filter": [
                    {"term": {"buyer_id": buyer_id}}
                ],
                "must": [
                    {
                        "multi_match": {
                            "query": f"{purpose} {scope_key}",
                            "fields": [
                                "purpose^2",
                                "scope_key",
                                "task_type",
                                "recipient",
                            ],
                        }
                    }
                ],
            }
        },
    }

    url = (
        settings["ELASTICSEARCH_URL"].rstrip("/")
        + f"/{settings['ELASTIC_INTENTS_INDEX']}/_search"
    )

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"ApiKey {settings['ELASTIC_API_KEY']}"
                },
                json=query,
            )

            response.raise_for_status()
            data = response.json()

        except (httpx.HTTPError, ValueError) as exc:
            raise IntentAgentError(
                "Elastic purchase search failed"
            ) from exc

    return [
        hit.get("_source", {}).get("id")
        for hit in data.get("hits", {}).get("hits", [])
    ]


async def review_purchase_overlap(intent, candidates: list) -> list[dict]:
    """Ask one Elastic Agent Builder agent to compare purchase purposes."""

    if not candidates:
        return []

    settings = get_elastic_settings()
    allowed_ids = {item.id for item in candidates}

    prompt = (
        "Compare this new purchase with existing purchases. "
        "Identify purchases that may fulfil the same underlying need, "
        "even if their skill names are different. "
        "Do not authorize, cancel, or charge anything. "
        "Return ONLY valid JSON in this exact shape: "
        '{"overlaps":[{"intent_id":"id","reason":"short explanation"}]}. '
        "Use only candidate IDs. When uncertain, flag for human review.\n"
        + json.dumps(
            {
                "new_purchase": intent_metadata(intent),
                "candidates": [
                    intent_metadata(item) for item in candidates
                ],
            },
            ensure_ascii=False,
        )
    )

    url = (
        settings["KIBANA_URL"].rstrip("/")
        + "/api/agent_builder/converse"
    )

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"ApiKey {settings['ELASTIC_API_KEY']}",
                    "kbn-xsrf": "true",
                },
                json={
                    "agent_id": settings["ELASTIC_AGENT_ID"],
                    "input": prompt,
                },
            )

            response.raise_for_status()
            data = response.json()

            if data.get("status") == "awaiting_prompt":
                raise IntentAgentError(
                    "Elastic agent requires manual confirmation"
                )

            result = json.loads(data["response"]["message"])
            overlaps = result["overlaps"]

            if not isinstance(overlaps, list):
                raise ValueError("Invalid overlap response")

            return [
                {
                    "intent_id": item["intent_id"],
                    "reason": str(item["reason"])[:300],
                }
                for item in overlaps
                if isinstance(item, dict)
                and item.get("intent_id") in allowed_ids
                and "reason" in item
            ][:25]

        except (httpx.HTTPError, KeyError, ValueError, TypeError) as exc:
            detail = type(exc).__name__

    if isinstance(exc, httpx.HTTPStatusError):
        detail += f" (HTTP {exc.response.status_code})"

    raise IntentAgentError(
        f"Elastic agent review failed: {detail}"
    ) from exc