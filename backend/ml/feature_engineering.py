"""
Feature Engineering Pipeline
-----------------------------
Transforms raw Instacart data → per-user RFM features + ML scores.

Outputs a DataFrame with one row per user:
  user_id, recency_days, frequency, monetary_value, avg_order_value,
  avg_basket_size, purchase_interval_days, preferred_day, preferred_hour,
  reorder_rate, top_department, purchase_intent, churn_probability,
  clv, value_tier
"""
import numpy as np
import pandas as pd
import os
import zipfile

# Synthetic price per basket item by department_id
DEPT_PRICE_MAP = {
    1: 3.5, 2: 8.0, 3: 6.0, 4: 5.5, 5: 10.0,
    6: 4.0, 7: 7.0, 8: 6.0, 9: 5.0, 10: 7.5,
    11: 6.5, 12: 9.0, 13: 5.0, 14: 6.0, 15: 8.5,
    16: 7.0, 17: 8.0, 18: 6.0, 19: 5.5, 20: 6.0, 21: 4.5,
}
DEFAULT_PRICE = 6.0

DOW_MAP = {0: "Saturday", 1: "Sunday", 2: "Monday", 3: "Tuesday",
           4: "Wednesday", 5: "Thursday", 6: "Friday"}


def _read_zip(path: str) -> pd.DataFrame:
    try:
        with zipfile.ZipFile(path, "r") as z:
            with z.open(z.namelist()[0]) as f:
                return pd.read_csv(f)
    except zipfile.BadZipFile:
        return pd.read_csv(path)


def build_features(cache_base: str, engagement_path: str | None = None) -> pd.DataFrame:
    """
    Main pipeline. Returns a DataFrame of per-user features + ML scores.
    Only uses 'prior' orders (the large historical split).
    Caps at 50k users for performance.
    """
    print("📂 Loading Instacart files...")
    orders        = _read_zip(os.path.join(cache_base, "orders.csv"))
    op_prior      = _read_zip(os.path.join(cache_base, "order_products__prior.csv"))
    products      = _read_zip(os.path.join(cache_base, "products.csv"))
    departments   = _read_zip(os.path.join(cache_base, "departments.csv"))

    # ── Filter to prior orders only ─────────────────────────────────────────
    prior_orders = orders[orders["eval_set"] == "prior"].copy()

    # Cap at 50k users
    top_users = prior_orders["user_id"].unique()[:50_000]
    prior_orders = prior_orders[prior_orders["user_id"].isin(top_users)]
    op_prior = op_prior[op_prior["order_id"].isin(prior_orders["order_id"])]

    print(f"  Using {len(top_users):,} users, {len(prior_orders):,} orders, {len(op_prior):,} order-products")

    # ── Enrich products with department price ─────────────────────────────────
    products = products.merge(departments, on="department_id", how="left")
    products["unit_price"] = products["department_id"].map(DEPT_PRICE_MAP).fillna(DEFAULT_PRICE)

    # ── Order-level basket value ───────────────────────────────────────────────
    op_enriched = op_prior.merge(
        products[["product_id", "department_id", "department", "unit_price"]],
        on="product_id", how="left"
    )
    op_enriched["item_value"] = op_enriched["unit_price"]

    basket = op_enriched.groupby("order_id").agg(
        basket_size=("product_id", "count"),
        basket_value=("item_value", "sum"),
        reorder_count=("reordered", "sum"),
        top_department=("department", lambda x: x.mode().iloc[0] if len(x) > 0 else "unknown"),
    ).reset_index()

    # ── Merge back to orders ──────────────────────────────────────────────────
    orders_rich = prior_orders.merge(basket, on="order_id", how="left")

    # ── Per-user aggregates ──────────────────────────────────────────────────
    print("  Computing RFM features...")
    rfm = orders_rich.groupby("user_id").agg(
        frequency            = ("order_id", "count"),
        monetary_value       = ("basket_value", "sum"),
        avg_basket_size      = ("basket_size", "mean"),
        avg_order_value      = ("basket_value", "mean"),
        reorder_rate         = ("reorder_count", lambda x: x.sum() / max(x.count(), 1)),
        preferred_hour       = ("order_hour_of_day", lambda x: x.mode().iloc[0]),
        preferred_dow        = ("order_dow", lambda x: x.mode().iloc[0]),
        avg_interval         = ("days_since_prior_order", "mean"),
        last_interval        = ("days_since_prior_order", "last"),
    ).reset_index()

    rfm["preferred_day"]            = rfm["preferred_dow"].map(DOW_MAP)
    rfm["purchase_interval_days"]   = rfm["avg_interval"].fillna(14).clip(1, 90)
    rfm["recency_days"]             = rfm["last_interval"].fillna(rfm["purchase_interval_days"])
    rfm["monetary_value"]           = rfm["monetary_value"].round(2)
    rfm["avg_order_value"]          = rfm["avg_order_value"].round(2)

    # Top department
    top_dept = orders_rich.groupby("user_id")["top_department"].agg(
        lambda x: x.mode().iloc[0] if len(x) > 0 else "unknown"
    ).reset_index().rename(columns={"top_department": "top_department"})
    rfm = rfm.merge(top_dept, on="user_id", how="left")

    # ── ML Scoring ───────────────────────────────────────────────────────────
    print("  Computing ML scores...")
    rfm = _compute_scores(rfm)

    # ── Merge engagement data ────────────────────────────────────────────────
    if engagement_path and os.path.exists(engagement_path):
        eng = pd.read_parquet(engagement_path)
        rfm = rfm.merge(eng, on="user_id", how="left")
        # Fill missing (users not in engagement data)
        rfm["preferred_channel"]      = rfm["preferred_channel"].fillna("email")
        rfm["discount_response_rate"] = rfm["discount_response_rate"].fillna(0.5)
        rfm["email_open_rate"]        = rfm["email_open_rate"].fillna(0.3)
        rfm["whatsapp_response_rate"] = rfm["whatsapp_response_rate"].fillna(0.3)

    print(f"✅ Features built for {len(rfm):,} users.")
    return rfm


def _compute_scores(rfm: pd.DataFrame) -> pd.DataFrame:
    """
    Deterministic ML scores — no black box.

    purchase_intent:   How likely is this customer to buy soon?
    churn_probability: How likely are they to never return?
    clv:               Estimated 12-month value.
    value_tier:        high / medium / low (RFM percentile).
    """
    r = rfm.copy()

    # ── Recency ratio: how far past their normal interval are they? ──────────
    r["recency_ratio"] = (r["recency_days"] / r["purchase_interval_days"]).clip(0, 3)

    # ── Purchase Intent (0–1) ─────────────────────────────────────────────────
    # High if: customer is near their expected reorder window (recency_ratio ≈ 1)
    # We use a bell-curve peaking at ratio=1.0
    r["purchase_intent"] = np.exp(-2.0 * (r["recency_ratio"] - 1.0) ** 2)
    # Boost by high reorder rate (habitual buyers are predictable)
    r["purchase_intent"] = (
        r["purchase_intent"] * 0.7 + r["reorder_rate"].clip(0, 1) * 0.3
    ).clip(0, 1).round(4)

    # ── Churn Probability (0–1) ───────────────────────────────────────────────
    # Rises sharply when recency_ratio > 2 (twice past normal interval)
    r["churn_probability"] = (1 / (1 + np.exp(-4 * (r["recency_ratio"] - 1.5)))).round(4)

    # ── CLV — 12-month estimate ───────────────────────────────────────────────
    # Expected orders per year × avg order value
    expected_orders_per_year = (365 / r["purchase_interval_days"].clip(1, 365)).clip(0, 52)
    r["clv"] = (expected_orders_per_year * r["avg_order_value"]).round(2)

    # ── Value Tier (percentile ranks) ─────────────────────────────────────────
    clv_pct = r["clv"].rank(pct=True)
    r["value_tier"] = pd.cut(
        clv_pct,
        bins=[0, 0.33, 0.66, 1.0],
        labels=["low", "medium", "high"],
    ).astype(str)

    return r.drop(columns=["recency_ratio", "preferred_dow", "avg_interval", "last_interval"])


if __name__ == "__main__":
    from data.loader import CACHE_BASE
    eng_path = os.path.join(os.path.dirname(__file__), "..", "data", "engagement.parquet")
    df = build_features(CACHE_BASE, eng_path)
    print(df[["user_id", "recency_days", "frequency", "monetary_value",
              "purchase_intent", "churn_probability", "clv", "value_tier"]].head(10))
    out = os.path.join(os.path.dirname(__file__), "features.parquet")
    df.to_parquet(out, index=False)
    print(f"\nSaved: {out}")
