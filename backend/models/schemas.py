from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class SegmentRequest(BaseModel):
    action: str = "analyze"


class OfferRequest(BaseModel):
    segment_id: str
    segment_name: str


class CampaignRequest(BaseModel):
    segment_id: str
    segment_name: str
    offer: str


class CustomerProfile(BaseModel):
    id: str
    name: str
    email: str
    channel_preference: str
    discount_sensitivity: float
    ltv: float
    days_since_purchase: int
    transaction_count: int
    avg_order_value: float
    engagement_score: float


class Segment(BaseModel):
    id: str
    name: str
    description: str
    count: int
    avg_ltv: float
    confidence: float
    reasoning: str
    customer_ids: List[str]


class SegmentResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    message: Optional[str] = None


class OfferResult(BaseModel):
    offer: str
    offer_type: str
    predicted_conversion: str
    reasoning: str
    confidence: float


class CampaignResult(BaseModel):
    channel: str
    best_time: str
    subject: Optional[str] = None
    message_body: str
    urgency: str
    reasoning: str


class WorkflowResult(BaseModel):
    success: bool
    segments: List[Segment] = []
    offer: Optional[OfferResult] = None
    campaign: Optional[CampaignResult] = None
    narrative: Optional[str] = None
    processing_time_ms: Optional[float] = None
