import asyncio
import os

# Use local SQLite file if PostgreSQL container isn't running yet during quick test
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./agentgain_dev1_test.db"

from database import init_db
from verifier import DeterministicVerifier

def test_deterministic_verifier():
    schema = {
        "type": "object",
        "properties": {
            "sku": {"type": "string"},
            "total_units": {"type": "integer"}
        },
        "required": ["sku", "total_units"]
    }
    checked = {"sku": "COFFEE-POD-24", "total_units": 48}

    # Baseline gets "2 boxes of 2 dozen" wrong (outputs 24 instead of 48)
    base_passed, base_err = DeterministicVerifier.check_single_output(
        {"sku": "COFFEE-POD-24", "total_units": 24}, checked, schema
    )
    # Skilled gets it right (48)
    skill_passed, skill_err = DeterministicVerifier.check_single_output(
        {"sku": "COFFEE-POD-24", "total_units": 48}, checked, schema
    )

    status, diff = DeterministicVerifier.classify_record_pair(base_passed, skill_passed)
    print(f"1. Single Record Check -> Status: {status.value} | Baseline Error: {base_err}")

    verdict_summary = DeterministicVerifier.compute_contract_verdict(
        record_results=[
            {
                "baseline_passed": False, "skilled_passed": True,
                "comparison_status": status,
                "baseline_tokens": 210, "skilled_tokens": 265,
                "baseline_ms": 420, "skilled_ms": 460,
                "baseline_infra_error": False, "skilled_infra_error": False
            },
            {
                "baseline_passed": True, "skilled_passed": True,
                "comparison_status": status,
                "baseline_tokens": 190, "skilled_tokens": 240,
                "baseline_ms": 390, "skilled_ms": 430,
                "baseline_infra_error": False, "skilled_infra_error": False
            },
            {
                "baseline_passed": False, "skilled_passed": True,
                "comparison_status": status,
                "baseline_tokens": 205, "skilled_tokens": 255,
                "baseline_ms": 410, "skilled_ms": 450,
                "baseline_infra_error": False, "skilled_infra_error": False
            }
        ],
        scoring_rules={"min_records": 3, "min_lift_pct": 20.0, "max_regressions": 0, "max_tokens_per_record": 1000}
    )
    print(f"2. Contract Verdict -> {verdict_summary['verdict'].value}: {verdict_summary['reason']}")

async def main():
    await init_db()
    print("Database tables initialized successfully!")
    test_deterministic_verifier()

if __name__ == "__main__":
    asyncio.run(main())