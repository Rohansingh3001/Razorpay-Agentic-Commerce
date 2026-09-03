"""
Agent Orchestrator
------------------
Runs the full multi-agent pipeline:
  Segmentation → Offer → Campaign
Then calls Groq to synthesise a merchant-facing narrative.
"""
import json
import time
from .base_agent import BaseAgent
from .segmentation_agent import SegmentationAgent
from .offer_agent import OfferAgent
from .campaign_agent import CampaignAgent
from models.schemas import WorkflowResult, Segment, OfferResult, CampaignResult


NARRATIVE_SYSTEM = """You are a senior growth advisor summarising AI agent findings for a merchant.
Write a concise, confident 2-3 sentence narrative in plain English explaining:
- Which customer segment was identified and why they matter
- What offer was chosen and the reasoning
- How and when to reach them
Speak directly to the merchant. Be specific, use numbers where available.
Respond ONLY with JSON: {"narrative": "<your text>"}"""


class Orchestrator(BaseAgent):

    async def run(self) -> WorkflowResult:
        start = time.monotonic()

        # --- Stage 1: Segmentation ---
        seg_agent = SegmentationAgent(self.pool)
        segments = await seg_agent.run()

        if not segments:
            return WorkflowResult(success=False)

        # Focus on the highest-confidence segment
        primary_segment: Segment = max(segments, key=lambda s: s.confidence)

        # --- Stage 2: Offer Selection ---
        offer_agent = OfferAgent(self.pool)
        offer: OfferResult = await offer_agent.run(segment=primary_segment)

        # --- Stage 3: Campaign Planning ---
        camp_agent = CampaignAgent(self.pool)
        campaign: CampaignResult = await camp_agent.run(segment=primary_segment, offer=offer)

        # --- Stage 4: Merchant Narrative ---
        narrative = await self._generate_narrative(primary_segment, offer, campaign)

        elapsed_ms = round((time.monotonic() - start) * 1000, 1)

        return WorkflowResult(
            success=True,
            segments=segments,
            offer=offer,
            campaign=campaign,
            narrative=narrative,
            processing_time_ms=elapsed_ms,
        )

    async def _generate_narrative(self, segment: Segment, offer: OfferResult, campaign: CampaignResult) -> str:
        user_prompt = f"""Segment: {segment.name} ({segment.count} customers, avg LTV ₹{segment.avg_ltv:.0f})
Offer: {offer.offer} (predicted conversion: {offer.predicted_conversion})
Channel: {campaign.channel} at {campaign.best_time}
Message: "{campaign.message_body}" """

        try:
            raw = await self.call_groq(NARRATIVE_SYSTEM, user_prompt, json_mode=True)
            return json.loads(raw).get("narrative", "")
        except Exception:
            return (
                f"Your {segment.name} segment of {segment.count} customers is ready to re-engage. "
                f"The AI recommends '{offer.offer}' delivered via {campaign.channel} at {campaign.best_time}."
            )
