"""
Tool functions available to the Groq Customer Strategy Agent.
Each function queries Neon DB and returns structured data.
The Groq agent decides which tools to call and in what order.
"""
import json
from typing import Any


# ─── Tool Definitions (for Groq function-calling) ──────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_customer_profile",
            "description": "Returns the full profile for a customer: RFM scores, ML predictions (purchase_intent, churn_probability, CLV), value tier, and preferred channel.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "The user_id of the customer"}
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_purchase_history",
            "description": "Returns the customer's recent order statistics: frequency, avg basket size, top department, reorder rate, and purchase interval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "The user_id of the customer"}
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_discount_response",
            "description": "Returns the customer's historical discount response rate (0–1) and campaign click-through rate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "The user_id of the customer"}
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_best_channel",
            "description": "Returns the customer's preferred communication channel and response rates per channel.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "The user_id of the customer"}
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_best_time",
            "description": "Returns the customer's preferred shopping day and hour based on historical order patterns.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "The user_id of the customer"}
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_campaign",
            "description": "Assembles and stores the final campaign plan in the database. Call this LAST after determining segment, offer, channel, and timing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id":   {"type": "string"},
                    "segment":       {"type": "string", "description": "The customer segment, e.g. 'high_value_at_risk'"},
                    "priority":      {"type": "string", "enum": ["high", "medium", "low"]},
                    "offer":         {"type": "string", "description": "The specific offer text, e.g. '10% comeback discount'"},
                    "channel":       {"type": "string", "enum": ["WhatsApp", "Email", "SMS", "Push"]},
                    "timing":        {"type": "string", "description": "Best time to send, e.g. 'Friday evening'"},
                    "message":       {"type": "string", "description": "Short personalised message under 160 chars"},
                    "expected_goal": {"type": "string", "description": "What this campaign aims to achieve, e.g. 'reactivate customer'"},
                    "agent_reasoning": {"type": "string", "description": "Your internal logic: why did you choose this exact segment, offer, and timing based on the data?"}
                },
                "required": ["customer_id", "segment", "priority", "offer", "channel", "timing", "message", "expected_goal", "agent_reasoning"]
            }
        }
    },
]


# ─── Tool Executor ──────────────────────────────────────────────────────────

async def execute_tool(name: str, arguments: dict, pool, campaign_store: list) -> str:
    """Routes a Groq tool call to the appropriate async DB function."""
    try:
        if name == "get_customer_profile":
            return await _get_customer_profile(arguments["customer_id"], pool)
        elif name == "get_purchase_history":
            return await _get_purchase_history(arguments["customer_id"], pool)
        elif name == "get_discount_response":
            return await _get_discount_response(arguments["customer_id"], pool)
        elif name == "get_best_channel":
            return await _get_best_channel(arguments["customer_id"], pool)
        elif name == "get_best_time":
            return await _get_best_time(arguments["customer_id"], pool)
        elif name == "generate_campaign":
            return await _generate_campaign(arguments, pool, campaign_store)
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ─── Tool Implementations ────────────────────────────────────────────────────

async def _get_customer_profile(customer_id: str, pool) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM customer_features WHERE user_id = $1", customer_id
        )
    if not row:
        return json.dumps({"error": "Customer not found"})
    data = dict(row)
    return json.dumps({
        "customer_id":        data["user_id"],
        "recency_days":       data["recency_days"],
        "frequency":          data["frequency"],
        "monetary_value":     float(data["monetary_value"] or 0),
        "avg_order_value":    float(data["avg_order_value"] or 0),
        "purchase_interval":  float(data["purchase_interval_days"] or 14),
        "purchase_intent":    float(data["purchase_intent"] or 0),
        "churn_probability":  float(data["churn_probability"] or 0),
        "clv":                float(data["clv"] or 0),
        "value_tier":         data["value_tier"],
        "preferred_channel":  data["preferred_channel"],
    })


async def _get_purchase_history(customer_id: str, pool) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT frequency, avg_basket_size, avg_order_value,
                      reorder_rate, top_department, purchase_interval_days
               FROM customer_features WHERE user_id = $1""",
            customer_id
        )
    if not row:
        return json.dumps({"error": "Customer not found"})
    return json.dumps({
        "total_orders":          dict(row)["frequency"],
        "avg_basket_size":       round(float(dict(row)["avg_basket_size"] or 0), 1),
        "avg_order_value":       float(dict(row)["avg_order_value"] or 0),
        "reorder_rate":          round(float(dict(row)["reorder_rate"] or 0), 3),
        "top_department":        dict(row)["top_department"],
        "avg_days_between_orders": round(float(dict(row)["purchase_interval_days"] or 14), 1),
    })


async def _get_discount_response(customer_id: str, pool) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT discount_response_rate, campaigns_received,
                      campaigns_clicked, email_open_rate
               FROM customer_features WHERE user_id = $1""",
            customer_id
        )
    if not row:
        return json.dumps({"discount_response_rate": 0.5, "ctr": 0.1})
    d = dict(row)
    ctr = (d["campaigns_clicked"] or 0) / max(d["campaigns_received"] or 1, 1)
    return json.dumps({
        "discount_response_rate": round(float(d["discount_response_rate"] or 0.5), 3),
        "campaigns_ctr":          round(ctr, 3),
        "email_open_rate":        round(float(d["email_open_rate"] or 0.3), 3),
    })


async def _get_best_channel(customer_id: str, pool) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT preferred_channel, email_open_rate,
                      whatsapp_response_rate, sms_response_rate
               FROM customer_features WHERE user_id = $1""",
            customer_id
        )
    if not row:
        return json.dumps({"preferred_channel": "email"})
    d = dict(row)
    return json.dumps({
        "preferred_channel":      d["preferred_channel"],
        "email_open_rate":        round(float(d["email_open_rate"] or 0.3), 3),
        "whatsapp_response_rate": round(float(d["whatsapp_response_rate"] or 0.3), 3),
        "sms_response_rate":      round(float(d["sms_response_rate"] or 0.2), 3),
    })


async def _get_best_time(customer_id: str, pool) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT preferred_day, preferred_hour FROM customer_features WHERE user_id = $1",
            customer_id
        )
    if not row:
        return json.dumps({"preferred_day": "Saturday", "preferred_hour": 10})
    d = dict(row)
    hour = d["preferred_hour"] or 10
    period = "AM" if hour < 12 else "PM"
    display = hour if hour <= 12 else hour - 12
    return json.dumps({
        "preferred_day":   d["preferred_day"],
        "preferred_hour":  hour,
        "formatted_time":  f"{display}:00 {period}",
    })


async def _generate_campaign(args: dict, pool, campaign_store: list) -> str:
    """Save campaign plan to Neon and append to in-memory store."""
    import json as _json
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO campaign_plans
               (customer_id, segment, priority, offer, channel, timing, message, expected_goal)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               ON CONFLICT DO NOTHING""",
            str(args["customer_id"]), args["segment"], args["priority"],
            args["offer"], args["channel"], args["timing"],
            args["message"], args["expected_goal"],
        )
    result = {k: args[k] for k in ["customer_id", "segment", "priority", "offer",
                                     "channel", "timing", "message", "expected_goal"]}
    campaign_store.append(result)
    return _json.dumps({"status": "campaign_saved", **result})
