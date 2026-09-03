"""
Segmentation Agent
------------------
Stage 1: SQL RFM scoring against Neon DB
Stage 2: Groq llama-3.3-70b confirms/refines segment label with confidence score
"""
import json
import uuid
from typing import List
from .base_agent import BaseAgent
from models.schemas import Segment


SYSTEM_PROMPT = """You are an expert customer segmentation analyst for an e-commerce merchant.
Given a customer's RFM (Recency, Frequency, Monetary) profile and engagement data,
classify them into exactly ONE of these segments:
- "Inactive High Intent": No purchase in 30+ days but high recent engagement (browsing, wishlisting).
- "Loyal Deal Seekers": Frequent buyers (5+ purchases) who respond strongly to discounts.
- "High Value at Risk": High LTV customers (LTV > 2000) showing reduced purchase frequency recently.

Respond ONLY with valid JSON in this exact format:
{
  "segment": "<segment name>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<one concise sentence explaining why>"
}"""


class SegmentationAgent(BaseAgent):

    async def run(self) -> List[Segment]:
        """
        1. Pull all customer RFM data from Neon DB.
        2. For each customer, call Groq to classify into a segment.
        3. Group customers by segment and return summary objects.
        """
        rows = await self._fetch_rfm_profiles()

        segment_map: dict[str, dict] = {}

        for row in rows:
            profile = dict(row)
            classification = await self._classify_customer(profile)

            seg_name = classification.get("segment", "Inactive High Intent")
            confidence = float(classification.get("confidence", 0.5))
            reasoning = classification.get("reasoning", "")

            if seg_name not in segment_map:
                segment_map[seg_name] = {
                    "id": f"seg_{len(segment_map)+1}",
                    "name": seg_name,
                    "customer_ids": [],
                    "ltv_sum": 0.0,
                    "confidence_sum": 0.0,
                    "reasoning": reasoning,
                }

            segment_map[seg_name]["customer_ids"].append(str(profile["id"]))
            segment_map[seg_name]["ltv_sum"] += float(profile["ltv"] or 0)
            segment_map[seg_name]["confidence_sum"] += confidence

        segments = []
        descriptions = {
            "Inactive High Intent": "Customers who haven't purchased in 30+ days but show high browsing and wishlist activity.",
            "Loyal Deal Seekers": "Frequent buyers who respond strongly to discounts and promotions.",
            "High Value at Risk": "High LTV customers showing signs of churn — act before they leave.",
        }
        for name, data in segment_map.items():
            count = len(data["customer_ids"])
            segments.append(Segment(
                id=data["id"],
                name=name,
                description=descriptions.get(name, ""),
                count=count,
                avg_ltv=round(data["ltv_sum"] / count, 2),
                confidence=round(data["confidence_sum"] / count, 3),
                reasoning=data["reasoning"],
                customer_ids=data["customer_ids"],
            ))

        return segments

    async def _fetch_rfm_profiles(self):
        async with self.pool.acquire() as conn:
            return await conn.fetch("""
                SELECT
                    c.id,
                    c.name,
                    c.channel_preference,
                    c.discount_sensitivity,
                    c.ltv,
                    COALESCE(EXTRACT(DAY FROM now() - MAX(t.created_at)), 999)::int AS days_since_purchase,
                    COUNT(DISTINCT t.id)::int                                         AS transaction_count,
                    COALESCE(AVG(t.amount), 0)::float                                 AS avg_order_value,
                    COALESCE(AVG(e.score), 0)::float                                  AS avg_engagement_score
                FROM customers c
                LEFT JOIN transactions t ON t.customer_id = c.id
                LEFT JOIN engagement_logs e ON e.customer_id = c.id
                    AND e.created_at > now() - INTERVAL '30 days'
                GROUP BY c.id
            """)

    async def _classify_customer(self, profile: dict) -> dict:
        user_prompt = f"""Customer profile:
- Days since last purchase: {profile['days_since_purchase']}
- Total transactions: {profile['transaction_count']}
- Average order value: ₹{profile['avg_order_value']:.0f}
- LTV: ₹{profile['ltv']}
- Discount sensitivity (0-1): {profile['discount_sensitivity']}
- Recent engagement score (0-1): {profile['avg_engagement_score']:.3f}
- Preferred channel: {profile['channel_preference']}

Classify this customer into the correct segment."""

        try:
            raw = await self.call_groq(SYSTEM_PROMPT, user_prompt, json_mode=True)
            return json.loads(raw)
        except Exception:
            # Fallback to rule-based
            if profile["days_since_purchase"] > 30 and profile["avg_engagement_score"] > 0.4:
                return {"segment": "Inactive High Intent", "confidence": 0.7, "reasoning": "Rule-based fallback."}
            elif profile["transaction_count"] >= 5:
                return {"segment": "Loyal Deal Seekers", "confidence": 0.7, "reasoning": "Rule-based fallback."}
            else:
                return {"segment": "High Value at Risk", "confidence": 0.6, "reasoning": "Rule-based fallback."}
