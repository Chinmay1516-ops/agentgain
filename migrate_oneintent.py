"""Add the Verified Work and OneIntent schema to an existing PostgreSQL database.

Safe to re-run: creates missing tables/columns and a missing FK/index only.
Does not delete tables, rows, or existing payment records.

Run from the AgentGain project root:
    python migrate_oneintent.py --check
    python migrate_oneintent.py
"""

import argparse
import asyncio

from sqlalchemy import inspect, text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.ext.asyncio import create_async_engine

from config import get_settings
from models import Base, PurchaseIntent, IntentReservation, PurchaseMode


# Only schema changes introduced by VERIFIED_WORK and OneIntent.
NEW_CONTRACT_COLUMNS = {
    "purchase_mode": "purchasemode NOT NULL DEFAULT 'FULL_SKILL'",
    "unit_price_usd": "NUMERIC(10, 2)",
    "max_billable_records": "INTEGER",
    "accepted_record_count": "INTEGER",
    "payable_amount_usd": "NUMERIC(10, 2)",
    "intent_id": "VARCHAR(64)",
}


def migrate(connection, check_only=False):
    inspector = inspect(connection)
    if not inspector.has_table("evaluation_contracts"):
        raise RuntimeError("evaluation_contracts table is missing. Check DATABASE_URL; refusing to modify this database.")

    existing = {col["name"] for col in inspector.get_columns("evaluation_contracts")}
    missing = [name for name in NEW_CONTRACT_COLUMNS if name not in existing]
    new_tables = [
        name for name in ("purchase_intents", "intent_reservations")
        if not inspector.has_table(name)
    ]
    print("Missing contract columns:", ", ".join(missing) or "none")
    print("Missing OneIntent tables:", ", ".join(new_tables) or "none")

    if check_only:
        print("Check only — no database changes made.")
        return

    # The existing database may not have been migrated to VERIFIED_WORK yet.
    ENUM(*[mode.value for mode in PurchaseMode], name="purchasemode").create(
        connection, checkfirst=True
    )
    for name in missing:
        connection.execute(text(
            f"ALTER TABLE evaluation_contracts ADD COLUMN IF NOT EXISTS {name} {NEW_CONTRACT_COLUMNS[name]}"
        ))
        print("Added column:", name)

    # These are the exact SQLAlchemy tables from the current models.py.
    # SQLAlchemy also creates their declared unique and check constraints.
    Base.metadata.create_all(
        connection,
        tables=[PurchaseIntent.__table__, IntentReservation.__table__],
        checkfirst=True,
    )

    # Add the foreign key for the new column on the *existing* contract table.
    foreign_keys = inspect(connection).get_foreign_keys("evaluation_contracts")
    has_intent_fk = any(
        fk.get("constrained_columns") == ["intent_id"]
        and fk.get("referred_table") == "purchase_intents"
        for fk in foreign_keys
    )
    if not has_intent_fk:
        connection.execute(text(
            "ALTER TABLE evaluation_contracts "
            "ADD CONSTRAINT fk_evaluation_contracts_intent_id "
            "FOREIGN KEY (intent_id) REFERENCES purchase_intents(id)"
        ))
        print("Added contract-to-intent foreign key")

    # If an OneIntent table already existed, create its partial uniqueness index
    # only when it is missing. This prevents simultaneous conflicting checkouts.
    for index in IntentReservation.__table__.indexes:
        index.create(connection, checkfirst=True)

    required_intent = {c.name for c in PurchaseIntent.__table__.columns}
    required_reservation = {c.name for c in IntentReservation.__table__.columns}
    for table_name, expected in (
        ("purchase_intents", required_intent),
        ("intent_reservations", required_reservation),
    ):
        actual = {col["name"] for col in inspect(connection).get_columns(table_name)}
        if expected - actual:
            raise RuntimeError(f"{table_name} has a conflicting old schema: missing {sorted(expected - actual)}")

    print("Migration finished. Existing purchases were preserved; older rows default to FULL_SKILL if needed.")


async def main(check_only=False):
    url = get_settings()["DATABASE_URL"]
    if not url.startswith("postgresql+asyncpg://"):
        raise RuntimeError("This migration is only for PostgreSQL/Neon, using postgresql+asyncpg://")

    engine = create_async_engine(url, pool_pre_ping=True)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(migrate, check_only=check_only)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Non-destructive AgentGain schema migration")
    parser.add_argument("--check", action="store_true", help="Show missing tables/columns without changing database")
    args = parser.parse_args()
    asyncio.run(main(check_only=args.check))
