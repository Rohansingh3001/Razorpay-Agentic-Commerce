"""
Offer Agent
-----------
Queries customer DB stats, then uses Groq to score 4 offer types
via chain-of-thought reasoning, picking the best predicted conversion.
"""
import json
from .base_agent import BaseAgent
from models.schemas import Segment, OfferResult


SYSTEM_PROMPT = """You are an expert growth marketing analyst for an e-commerce platform.
Given a customer segment's profile, evaluate these 4 offer types and select the BEST one
that will maximise conversion:

1. Flat Discount (e.g., "15% off next purchase")
2. BOGO (Buy One Get One)
3. Free Shipping (no minimum)
4. Cashback (e.g., "₹200 cashback on orders above ₹1000")

Think step-by-step for each offer type, then select the winner.

Respond ONLY with valid JSON:
{
  "offer": "<exact offer text, e.g. '15% Off Your Next Purchase'>",
  "offer_type": "<Flat Discount | BOGO | Free Shipping | Cashback>",
  "predicted_conversion": "<e.g. '8.5%'>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<2-3 sentences explaining the selection>"
}"""


class OfferAgent(BaseAgent):

    async def run(self, segment: Segment) -> OfferResult:
        """
        1. Fetch aggregate stats for customers in this segment from Neon.
        2. Call Groq to score and pick the best offer.
        """
        stats = await self._fetch_segment_stats(segment.customer_ids)
        result = await self._select_offer(segment, stats)
        return result

    async def _fetch_segment_stats(self, customer_ids: list[str]) -> dict:
        if not customer_ids:
            return {}

        # Convert to UUID list for asyncpg
        id_params = [f"${i+1}" for i in range(len(customer_ids))]
        query = f"""
            SELECT
                AVG(c.discount_sensitivity)::float   AS avg_discount_sensitivity,
                AVG(c.ltv)::float                    AS avg_ltv,
                AVG(t.amount)::float                 AS avg_order_value,
                COUNT(DISTINCT t.id)::float / NULLIF(COUNT(DISTINCT c.id), 0) AS avg_tx_per_customer,
                MODE() WITHIN GROUP (ORDER BY t.category) AS top_category
            FROM customers c
            LEFT JOIN transactions t ON t.customer_id = c.id
            WHERE c.id = ANY($1::uuid[])
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, customer_ids)
            return dict(row) if row else {}

    async def _select_offer(self, segment: Segment, stats: dict) -> OfferResult:
        user_prompt = f"""Segment: "{segment.name}"
Segment description: {segment.description}
Number of customers: {segment.count}
Average LTV: ₹{segment.avg_ltv:.0f}
Average order value: ₹{stats.get('avg_order_value') or 0:.0f}
Average discount sensitivity (0-1): {stats.get('avg_discount_sensitivity') or 0.5:.2f}
Average transactions per customer: {stats.get('avg_tx_per_customer') or 1:.1f}
Top purchase category: {stats.get('top_category') or 'General'}

Which offer type will drive the highest conversion for this segment? Think through each option."""

        try:
            raw = await self.call_groq(SYSTEM_PROMPT, user_prompt, json_mode=True)
            data = json.loads(raw)
            return OfferResult(
                offer=data["offer"],
                offer_type=data["offer_type"],
                predicted_conversion=data["predicted_conversion"],
                confidence=float(data.get("confidence", 0.75)),
                reasoning=data["reasoning"],
            )
        except Exception as e:
            # Fallback
            disc = stats.get("avg_discount_sensitivity", 0.5) or 0.5
            if disc > 0.6:
                return OfferResult(offer="20% Off Your Next Purchase", offer_type="Flat Discount",
                                   predicted_conversion="9.2%", confidence=0.65, reasoning="High discount sensitivity detected.")
            else:
                return OfferResult(offer="Free Shipping on Your Next Order", offer_type="Free Shipping",
                                   predicted_conversion="7.1%", confidence=0.60, reasoning="Low discount sensitivity — value-add preferred.")
