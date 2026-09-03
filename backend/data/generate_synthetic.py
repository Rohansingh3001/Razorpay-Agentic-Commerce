"""
Synthetic engagement & campaign data generator.

Instacart has no price or engagement data, so we synthesize:
  - Monetary value: based on basket size × department price tier
  - Email/WhatsApp response rates
  - Preferred channel
  - Discount response rate
  - Past campaign history

Output: backend/data/engagement.parquet (fast, typed, no encoding issues)
"""
import numpy as np
import pandas as pd
import os

# Synthetic price per item by department (approximate median grocery price)
DEPT_PRICE_MAP = {
    1:  3.5,   # frozen
    2:  8.0,   # other
    3:  6.0,   # bakery
    4:  5.5,   # produce
    5:  10.0,  # alcohol
    6:  4.0,   # international
    7:  7.0,   # beverages
    8:  6.0,   # pets
    9:  5.0,   # dry goods
    10: 7.5,   # bulk
    11: 6.5,   # personal care
    12: 9.0,   # meat seafood
    13: 5.0,   # pantry
    14: 6.0,   # breakfast
    15: 8.5,   # canned goods
    16: 7.0,   # dairy eggs
    17: 8.0,   # household
    18: 6.0,   # babies
    19: 5.5,   # snacks
    20: 6.0,   # deli
    21: 4.5,   # missing/other
}

CHANNELS = ["email", "whatsapp", "sms", "push"]

np.random.seed(42)


def generate_engagement(user_ids: np.ndarray, output_path: str):
    n = len(user_ids)
    rng = np.random.default_rng(42)

    # Channels weighted toward email/whatsapp
    channel_probs = [0.35, 0.30, 0.20, 0.15]
    preferred_channel = rng.choice(CHANNELS, size=n, p=channel_probs)

    df = pd.DataFrame({
        "user_id": user_ids,
        "email_open_rate":           rng.uniform(0.05, 0.65, n).round(3),
        "whatsapp_response_rate":    rng.uniform(0.10, 0.80, n).round(3),
        "sms_response_rate":         rng.uniform(0.05, 0.50, n).round(3),
        "campaigns_received":        rng.integers(0, 20, n),
        "campaigns_clicked":         rng.integers(0, 10, n),
        "discount_response_rate":    rng.uniform(0.10, 0.90, n).round(3),
        "preferred_channel":         preferred_channel,
        "last_campaign_days_ago":    rng.integers(0, 90, n),
    })

    # Ensure clicks <= received
    df["campaigns_clicked"] = df[["campaigns_received", "campaigns_clicked"]].min(axis=1)

    df.to_parquet(output_path, index=False)
    print(f"✅ Saved engagement data: {output_path}  ({n} users)")
    return df


if __name__ == "__main__":
    # Load user IDs from orders
    import zipfile
    from data.loader import CACHE_BASE

    orders_path = os.path.join(CACHE_BASE, "orders.csv")
    with zipfile.ZipFile(orders_path, "r") as z:
        with z.open(z.namelist()[0]) as f:
            user_ids = pd.read_csv(f, usecols=["user_id"])["user_id"].unique()

    out = os.path.join(os.path.dirname(__file__), "engagement.parquet")
    generate_engagement(user_ids, out)
