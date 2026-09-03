"""
Seed script — loads processed Instacart features + synthetic engagement data into Neon DB.
Run once after: python -m ml.feature_engineering

Usage: python -m db.seed
"""
import asyncio
import os
import pandas as pd
import asyncpg
from dotenv import load_dotenv

load_dotenv()

FEATURES_PATH   = os.path.join(os.path.dirname(__file__), "..", "ml", "features.parquet")
ENGAGEMENT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "engagement.parquet")


async def seed():
    print("Connecting to Neon DB...")
    conn = await asyncpg.connect(dsn=os.getenv("DATABASE_URL"), statement_cache_size=0)

    print("Creating tables...")
    await conn.execute("""
        DROP TABLE IF EXISTS campaign_plans CASCADE;
        DROP TABLE IF EXISTS customer_features CASCADE;

        CREATE TABLE customer_features (
            user_id                 TEXT PRIMARY KEY,
            recency_days            FLOAT,
            frequency               INT,
            monetary_value          NUMERIC,
            avg_basket_size         FLOAT,
            avg_order_value         NUMERIC,
            purchase_interval_days  FLOAT,
            preferred_day           TEXT,
            preferred_hour          INT,
            reorder_rate            FLOAT,
            top_department          TEXT,
            purchase_intent         FLOAT,
            churn_probability       FLOAT,
            clv                     NUMERIC,
            value_tier              TEXT,
            email_open_rate         FLOAT DEFAULT 0.3,
            whatsapp_response_rate  FLOAT DEFAULT 0.3,
            sms_response_rate       FLOAT DEFAULT 0.2,
            campaigns_received      INT   DEFAULT 0,
            campaigns_clicked       INT   DEFAULT 0,
            discount_response_rate  FLOAT DEFAULT 0.5,
            preferred_channel       TEXT  DEFAULT 'email',
            last_updated            TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE campaign_plans (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_id   TEXT,
            segment       TEXT,
            priority      TEXT,
            offer         TEXT,
            channel       TEXT,
            timing        TEXT,
            message       TEXT,
            expected_goal TEXT,
            agent_reasoning JSONB,
            created_at    TIMESTAMPTZ DEFAULT now()
        );
    """)
    print("Tables created.")

    # ── Load features ────────────────────────────────────────────────────────
    if not os.path.exists(FEATURES_PATH):
        raise FileNotFoundError(f"Features not found at {FEATURES_PATH}. Run: python -m ml.feature_engineering")

    print("Loading features parquet...")
    df = pd.read_parquet(FEATURES_PATH)

    # Merge engagement if available
    if os.path.exists(ENGAGEMENT_PATH):
        eng = pd.read_parquet(ENGAGEMENT_PATH)
        df = df.merge(eng, on="user_id", how="left")
        print(f"  Merged engagement data for {len(eng)} users")

    # Fill engagement defaults
    for col, default in [
        ("email_open_rate", 0.3), ("whatsapp_response_rate", 0.3),
        ("sms_response_rate", 0.2), ("campaigns_received", 0),
        ("campaigns_clicked", 0), ("discount_response_rate", 0.5),
        ("preferred_channel", "email"),
    ]:
        if col not in df.columns:
            df[col] = default
        else:
            df[col] = df[col].fillna(default)

    # Cap to 50k rows
    df = df.head(50_000)
    print(f"  Inserting {len(df):,} customer records...")

    # Batch insert
    COLS = [
        "user_id", "recency_days", "frequency", "monetary_value",
        "avg_basket_size", "avg_order_value", "purchase_interval_days",
        "preferred_day", "preferred_hour", "reorder_rate", "top_department",
        "purchase_intent", "churn_probability", "clv", "value_tier",
        "email_open_rate", "whatsapp_response_rate", "sms_response_rate",
        "campaigns_received", "campaigns_clicked", "discount_response_rate",
        "preferred_channel",
    ]

    # Ensure all columns exist
    for col in COLS:
        if col not in df.columns:
            df[col] = None

    records = []
    for _, row in df[COLS].iterrows():
        records.append(tuple(
            None if pd.isna(v) else (str(v) if col == "user_id" else v)
            for col, v in zip(COLS, row)
        ))

    placeholders = ", ".join(f"${i+1}" for i in range(len(COLS)))
    col_names = ", ".join(COLS)
    query = f"INSERT INTO customer_features ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"

    BATCH = 500
    for i in range(0, len(records), BATCH):
        await conn.executemany(query, records[i:i+BATCH])
        if i % 5000 == 0:
            print(f"  ... {i:,}/{len(records):,}")

    count = await conn.fetchval("SELECT COUNT(*) FROM customer_features")
    print(f"\nSeed complete! {count:,} customers in Neon DB.")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
