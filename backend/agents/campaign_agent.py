"""
Campaign Agent
--------------
Reads channel preference and peak engagement hours from Neon,
then uses Groq to write personalised message copy per segment tone.
"""
import json
from .base_agent import BaseAgent
from models.schemas import Segment, OfferResult, CampaignResult


SYSTEM_PROMPT = """You are an expert CRM campaign strategist for a merchant platform.
Given a customer segment and the selected offer, determine:
1. The best delivery channel (must match preference)
2. Optimal send time (based on engagement patterns)
3. Personalised message copy adapted to the segment's tone

Tone guidelines:
- "Inactive High Intent": Use urgency and personalisation ("We miss you!")
- "Loyal Deal Seekers": Use exclusivity and reward language ("As a top customer...")
- "High Value at Risk": Use premium, low-pressure language ("Your exclusive access...")

Respond ONLY with valid JSON:
{
  "channel": "<Email | SMS | WhatsApp | Push>",
  "best_time": "<e.g. '6:30 PM'>",
  "subject": "<email subject line, null if not email>",
  "message_body": "<personalised short message, under 160 chars for SMS/WhatsApp>",
  "urgency": "<e.g. 'Offer expires in 48 hours'>",
  "reasoning": "<1-2 sentences>"
}"""


class CampaignAgent(BaseAgent):

    async def run(self, segment: Segment, offer: OfferResult) -> CampaignResult:
        timing_data = await self._fetch_engagement_timing(segment.customer_ids)
        channel_pref = await self._fetch_dominant_channel(segment.customer_ids)
        result = await self._plan_campaign(segment, offer, timing_data, channel_pref)
        return result

    async def _fetch_dominant_channel(self, customer_ids: list[str]) -> str:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT MODE() WITHIN GROUP (ORDER BY channel_preference) AS dominant_channel
                FROM customers
                WHERE id = ANY($1::uuid[])
            """, customer_ids)
            return row["dominant_channel"] if row else "email"

    async def _fetch_engagement_timing(self, customer_ids: list[str]) -> dict:
        """Find the hour of day with the highest average engagement score."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT
                    EXTRACT(HOUR FROM created_at)::int AS peak_hour,
                    AVG(score)::float                  AS avg_score
                FROM engagement_logs
                WHERE customer_id = ANY($1::uuid[])
                GROUP BY peak_hour
                ORDER BY avg_score DESC
                LIMIT 1
            """, customer_ids)
            if row:
                hour = row["peak_hour"]
                period = "AM" if hour < 12 else "PM"
                display_hour = hour if hour <= 12 else hour - 12
                if display_hour == 0:
                    display_hour = 12
                return {"peak_time": f"{display_hour}:{30 if hour % 2 else 0:02d} {period}", "peak_hour": hour}
            return {"peak_time": "10:00 AM", "peak_hour": 10}

    async def _plan_campaign(self, segment: Segment, offer: OfferResult,
                              timing: dict, channel_pref: str) -> CampaignResult:
        user_prompt = f"""Segment: "{segment.name}"
Description: {segment.description}
Customer count: {segment.count}
Average LTV: ₹{segment.avg_ltv:.0f}
Dominant preferred channel: {channel_pref}
Peak engagement time: {timing.get('peak_time', '10:00 AM')}
Selected offer: "{offer.offer}"
Offer type: {offer.offer_type}

Generate the optimal campaign plan with personalised message copy."""

        try:
            raw = await self.call_groq(SYSTEM_PROMPT, user_prompt, json_mode=True)
            data = json.loads(raw)
            return CampaignResult(
                channel=data["channel"],
                best_time=data["best_time"],
                subject=data.get("subject"),
                message_body=data["message_body"],
                urgency=data.get("urgency", "Limited time offer"),
                reasoning=data["reasoning"],
            )
        except Exception:
            channel_map = {"email": "Email", "sms": "SMS", "whatsapp": "WhatsApp", "push": "Push"}
            return CampaignResult(
                channel=channel_map.get(channel_pref, "Email"),
                best_time=timing.get("peak_time", "10:00 AM"),
                message_body=f"Hey! {offer.offer} — just for you. Don't miss out!",
                urgency="Expires in 48 hours",
                reasoning="Fallback campaign plan based on channel preference.",
            )
