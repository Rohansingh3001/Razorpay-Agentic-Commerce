"""
FastAPI entry point for the AI Growth Assistant backend.
"""
from contextlib import asynccontextmanager
import os
import math
import json
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from db.connection import create_pool, close_pool, get_pool
from agents.customer_strategy_agent import CustomerStrategyAgent
from agents.checkout_agent import CheckoutAgent
import razorpay

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_pool()
    async with get_pool().acquire() as conn:
        await conn.execute("ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS payment_link TEXT")
        await conn.execute("ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS shipping_address TEXT")
        await conn.execute("ALTER TABLE carts ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0")
        await conn.execute("ALTER TABLE carts ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0")
        await conn.execute("ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0")
        await conn.execute("ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS discount_percent NUMERIC NOT NULL DEFAULT 0")
        await conn.execute("ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0")
        await conn.execute("ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb")
    print("Neon DB pool opened.")
    yield
    await close_pool()
    print("Neon DB pool closed.")


app = FastAPI(
    title="Razorpay AI Growth Assistant",
    description="Agentic commerce intelligence: ML scoring + Groq tool-calling agents + Neon DB",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ──────────────────────────────────────────────────────────────────

class WorkflowRequest(BaseModel):
    customer_id: Optional[str] = None  # If None, picks a random at-risk customer

class ExecuteRequest(BaseModel):
    customer_id: str
    campaign: dict

class NewCustomerRequest(BaseModel):
    user_id: str
    recency_days: float
    purchase_interval_days: float
    reorder_rate: float
    avg_order_value: float
    frequency: int
    monetary_value: float
    preferred_channel: str = "email"

class ChatRequest(BaseModel):
    session_id: str
    messages: list[dict]

# In-memory store for session carts
# (In a real app, use Redis or Postgres)
SESSION_CARTS = {}


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    pool = get_pool()
    db_ok = False
    customer_count = 0
    try:
        async with pool.acquire() as conn:
            customer_count = await conn.fetchval("SELECT COUNT(*) FROM customer_features")
        db_ok = True
    except Exception as e:
        pass

    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "ok" if db_ok and groq_ok else "degraded",
        "db": "ok" if db_ok else "error",
        "groq": "ok" if groq_ok else "missing key",
        "customers_in_db": customer_count,
    }


# ─── Workflow ─────────────────────────────────────────────────────────────────

@app.post("/api/workflow/run", tags=["Workflow"])
async def run_workflow(req: WorkflowRequest):
    """
    Full agentic pipeline for a customer:
    Groq calls tools → fetches data → reasons → generates campaign.
    """
    pool = get_pool()

    try:
        customer_id = req.customer_id

        # Pick a random high-value at-risk customer if none provided
        if not customer_id:
            async with pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT user_id FROM customer_features
                    WHERE churn_probability > 0.55 AND value_tier = 'high'
                    ORDER BY churn_probability DESC
                    LIMIT 1
                """)
            if not row:
                async with pool.acquire() as conn:
                    row = await conn.fetchrow("SELECT user_id FROM customer_features LIMIT 1")
            customer_id = str(row["user_id"])

        agent = CustomerStrategyAgent(pool)
        result = await agent.run(customer_id=customer_id)

        return {
            "success": True,
            "customer_id": customer_id,
            **result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", tags=["Workflow"])
async def chat_with_agent(req: ChatRequest):
    """
    Conversational endpoint for the AI Buyer Agent.
    """
    try:
        session_id = req.session_id
        
        # Reconstruct valid OpenAI history
        clean_messages = []
        for msg in req.messages:
            if "tool_calls" in msg and msg["tool_calls"]:
                openai_tool_calls = []
                tool_results = []
                for i, tc in enumerate(msg["tool_calls"]):
                    t_id = f"call_{len(clean_messages)}_{i}"
                    openai_tool_calls.append({
                        "id": t_id,
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc.get("args", {}))
                        }
                    })
                    tool_results.append({
                        "tool_call_id": t_id,
                        "role": "tool",
                        "name": tc["name"],
                        "content": json.dumps(tc.get("result", {}))
                    })
                clean_messages.append({
                    "role": msg["role"],
                    "content": msg.get("content") or "",
                    "tool_calls": openai_tool_calls
                })
                clean_messages.extend(tool_results)
            else:
                clean_messages.append({
                    "role": msg["role"],
                    "content": msg.get("content") or ""
                })
                
        agent = CheckoutAgent(user_id=f"demo_user_{session_id}")
        result = await agent.run(clean_messages, session_id)
        
        tool_calls = []
        purchase_request_id = None
        for item in result["audit_trail"]:
            call = {
                "name": item["tool"],
                "args": item["args"],
                "result": item.get("result", {})
            }
            tool_calls.append(call)
            if item["tool"] == "request_purchase" and call["result"].get("purchase_request_id"):
                purchase_request_id = call["result"]["purchase_request_id"]
        
        return {
            "success": True,
            "reply": result["content"],
            "tool_calls": tool_calls,
            "purchase_request_id": purchase_request_id,
            "audit_trail": result["audit_trail"],
            "cart_id": result["cart_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ApprovePurchaseRequest(BaseModel):
    purchase_request_id: str
    session_id: str

@app.get("/api/purchase/status/{purchase_request_id}", tags=["Commerce"])
async def purchase_status(purchase_request_id: str, session_id: str):
    """Return a buyer's request state and reveal the payment link only after approval."""
    pool = get_pool()
    buyer_user_id = f"demo_user_{session_id}"
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT pr.id, pr.approval_status, pr.policy_decision, pr.reason,
                       pr.proposed_total, po.razorpay_order_id, po.status,
                       po.payment_link
                FROM purchase_requests pr
                LEFT JOIN payment_orders po ON po.purchase_request_id = pr.id
                WHERE pr.id = $1 AND pr.user_id = $2
            """, purchase_request_id, buyer_user_id)
        if not row:
            raise HTTPException(status_code=404, detail="Purchase request not found.")
            
        payment_status = row["status"]
        if row["razorpay_order_id"] and payment_status != "paid":
            try:
                client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))
                link_status = client.payment_link.fetch(row["razorpay_order_id"])
                fetched_status = link_status.get("status")
                
                if fetched_status and fetched_status != payment_status:
                    payment_status = fetched_status
                    async with pool.acquire() as update_conn:
                        await update_conn.execute("UPDATE payment_orders SET status = $1 WHERE razorpay_order_id = $2", payment_status, row["razorpay_order_id"])
            except Exception as e:
                print(f"Failed to fetch Razorpay status: {e}")

        return {
            "success": True,
            "purchase_request_id": row["id"],
            "approval_status": row["approval_status"],
            "policy_decision": row["policy_decision"],
            "reason": row["reason"],
            "amount": float(row["proposed_total"]),
            "payment_link_id": row["razorpay_order_id"],
            "payment_link": row["payment_link"],
            "payment_status": payment_status,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to load purchase status: {str(e)}")

@app.post("/api/purchase/approve", tags=["Commerce"])
async def approve_purchase(req: ApprovePurchaseRequest):
    """
    Final Trust Layer endpoint. Human has approved the purchase request.
    Verifies state and generates Razorpay Order.
    """
    pool = get_pool()
    try:
        if req.session_id != "merchant_portal":
            raise HTTPException(status_code=403, detail="Only the merchant portal can approve purchase requests.")

        async with pool.acquire() as conn:
            # 1. Fetch Purchase Request
            pr = await conn.fetchrow(
                """SELECT cart_id, user_id, proposed_total, subtotal, discount_percent,
                          discount_amount, policy_decision, approval_status
                   FROM purchase_requests WHERE id = $1""",
                req.purchase_request_id,
            )
            if not pr:
                raise HTTPException(status_code=404, detail="Purchase request not found.")
            
            if pr['approval_status'] != 'pending':
                raise HTTPException(status_code=400, detail="Purchase request is already processed.")
            
            if pr['policy_decision'] == 'BLOCKED':
                raise HTTPException(status_code=403, detail="Transaction blocked by policy engine.")

            # 2. Re-calculate authoritative cart total (Trust boundary)
            cart_id = pr['cart_id']
            rows = await conn.fetch("""
                SELECT p.id, p.name, ci.quantity, ci.unit_price, p.price as current_merchant_price, p.inventory
                FROM cart_items ci JOIN products p ON ci.product_id = p.id 
                WHERE ci.cart_id = $1
            """, cart_id)
            
            if not rows:
                raise HTTPException(status_code=400, detail="Cart is empty.")
                
            subtotal = sum(float(r["quantity"] * r["current_merchant_price"]) for r in rows)
            discount_percent = float(pr["discount_percent"] or 0)
            discount_amount = round(subtotal * discount_percent / 100, 2)
            actual_total = round(subtotal - discount_amount, 2)
            
            # Policy 1: Price match
            if abs(float(pr['proposed_total']) - actual_total) > 0.01:
                # Log failure
                await conn.execute("UPDATE purchase_requests SET approval_status = 'rejected', reason = 'Price mismatch' WHERE id = $1", req.purchase_request_id)
                await conn.execute(
                    "INSERT INTO audit_events (session_id, event_type, actor, payload) VALUES ($1, $2, $3, $4::jsonb)",
                    req.session_id, "POLICY_REJECTED", "SYSTEM", json.dumps({"reason": f"Agent proposed {pr['proposed_total']}, authoritative price is {actual_total}"})
                )
                raise HTTPException(status_code=400, detail=f"Purchase blocked: Merchant price changed from ₹{pr['proposed_total']} to ₹{actual_total}. No payment was initiated.")

            # Policy 2: Inventory check
            for r in rows:
                if r['inventory'] < r['quantity']:
                    await conn.execute("UPDATE purchase_requests SET approval_status = 'rejected', reason = 'Out of stock' WHERE id = $1", req.purchase_request_id)
                    raise HTTPException(status_code=400, detail=f"Purchase blocked: {r['name']} is out of stock.")

            # All checks pass, mark approved
            await conn.execute("UPDATE purchase_requests SET approval_status = 'approved' WHERE id = $1", req.purchase_request_id)
            
            # Log approval
            await conn.execute(
                "INSERT INTO audit_events (session_id, event_type, actor, payload) VALUES ($1, $2, $3, $4::jsonb)",
                req.session_id, "PURCHASE_APPROVED", "USER", json.dumps({"purchase_request_id": req.purchase_request_id})
            )
            
            # Create Razorpay Test Order
            client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))
            amount_paise = int(round(actual_total * 100))
            
            payment_link = client.payment_link.create({
                "amount": amount_paise,
                "currency": "INR",
                "accept_partial": False,
                "description": f"Order for PR: {req.purchase_request_id[:8]}",
                "customer": {
                    "name": "AI Buyer",
                    "email": "buyer@example.com",
                    "contact": "+919876543210"
                },
                "notify": {"sms": False, "email": False},
                "reminder_enable": False
            })
            
            # Record payment order
            await conn.execute(
                """INSERT INTO payment_orders
                   (purchase_request_id, razorpay_order_id, amount, status, payment_link)
                   VALUES ($1, $2, $3, $4, $5)""",
                req.purchase_request_id, payment_link["id"], actual_total, "created", payment_link["short_url"]
            )
            
            # Log razorpay creation
            await conn.execute(
                "INSERT INTO audit_events (session_id, event_type, actor, payload) VALUES ($1, $2, $3, $4::jsonb)",
                req.session_id, "RAZORPAY_ORDER_CREATED", "SYSTEM", json.dumps({"order_id": payment_link["id"], "amount": actual_total})
            )

            # Close cart
            await conn.execute("UPDATE carts SET status = 'completed' WHERE id = $1", cart_id)
            
            return {
                "success": True, 
                "amount": actual_total,
                "message": "Merchant approval recorded. The buyer can now pay using the secure payment link."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")

@app.get("/api/merchant/purchase-requests", tags=["Commerce"])
async def merchant_purchase_requests():
    """Return pending purchase requests for the merchant approval workspace."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT
                    pr.id,
                    pr.proposed_total,
                    pr.policy_decision,
                    pr.approval_status,
                    pr.created_at,
                    pr.shipping_address,
                    c.id AS cart_id,
                    COALESCE(
                        json_agg(json_build_object(
                            'name', p.name,
                            'quantity', ci.quantity,
                            'unit_price', ci.unit_price
                        ) ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL),
                        '[]'::json
                    ) AS items
                FROM purchase_requests pr
                JOIN carts c ON c.id = pr.cart_id
                LEFT JOIN cart_items ci ON ci.cart_id = c.id
                LEFT JOIN products p ON p.id = ci.product_id
                WHERE pr.approval_status = 'pending'
                GROUP BY pr.id, c.id
                ORDER BY pr.created_at DESC
            """)

        return {
            "success": True,
            "requests": [
                {
                    "id": row["id"],
                    "total": float(row["proposed_total"]),
                    "policy_decision": row["policy_decision"],
                    "approval_status": row["approval_status"],
                    "created_at": row["created_at"].isoformat(),
                    "shipping_address": row["shipping_address"],
                    "items": json.loads(row["items"]) if isinstance(row["items"], str) else row["items"],
                }
                for row in rows
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to load merchant requests: {str(e)}")


@app.post("/api/workflow/execute", tags=["Workflow"])
async def execute_workflow(req: ExecuteRequest):
    """
    Simulates executing the campaign by generating a test Razorpay Payment Link.
    Demonstrates graceful failure if customer_id == 'FAIL_TEST'.
    """
    if req.customer_id == "FAIL_TEST":
        raise HTTPException(status_code=400, detail="Razorpay Error: Customer email missing or flagged for fraud. Execution halted.")
        
    try:
        client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))
        
        # Determine amount (hardcoded 10.00 INR for demo)
        amount = 1000
        
        payment_link = client.payment_link.create({
            "amount": amount,
            "currency": "INR",
            "accept_partial": False,
            "description": req.campaign.get("offer", "Special Offer")[:20],  # Max 20 chars for description in Razorpay sometimes? It might be longer, let's just use 20 to be safe or full offer. Actually max is 2048 chars for desc.
            "customer": {
                "name": f"Customer {req.customer_id}",
                "email": f"{req.customer_id}@example.com",
                "contact": "+919876543210"
            },
            "notify": {
                "sms": False,
                "email": False
            },
            "reminder_enable": False,
            "notes": {
                "campaign_segment": req.campaign.get("segment", "")
            }
        })
        
        return {
            "success": True, 
            "payment_link_id": payment_link["id"], 
            "short_url": payment_link["short_url"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay API Error: {str(e)}")


@app.post("/api/customers/predict", tags=["Customers"])
async def predict_new_customer(req: NewCustomerRequest):
    """Dynamically calculates ML scores for a new customer and inserts into Neon DB."""
    try:
        # Calculate scores
        # Recency ratio: how far past their normal interval are they?
        recency_ratio = min(req.recency_days / max(req.purchase_interval_days, 1), 3.0)
        
        # Purchase Intent (0-1)
        intent_base = math.exp(-2.0 * (recency_ratio - 1.0) ** 2)
        purchase_intent = round(min(max(intent_base * 0.7 + req.reorder_rate * 0.3, 0), 1), 4)
        
        # Churn Probability (0-1)
        churn_prob = round(1 / (1 + math.exp(-4 * (recency_ratio - 1.5))), 4)
        
        # CLV - 12 month estimate
        expected_orders_per_year = min(365 / max(req.purchase_interval_days, 1), 52.0)
        clv = round(expected_orders_per_year * req.avg_order_value, 2)
        
        # Value Tier (heuristic)
        if clv >= 3000:
            value_tier = "high"
        elif clv >= 1000:
            value_tier = "medium"
        else:
            value_tier = "low"
            
        async with get_pool().acquire() as conn:
            await conn.execute("""
                INSERT INTO customer_features (
                    user_id, recency_days, frequency, monetary_value,
                    avg_basket_size, avg_order_value, purchase_interval_days,
                    reorder_rate, top_department, purchase_intent,
                    churn_probability, clv, value_tier, preferred_channel
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, 'unknown', $9, $10, $11, $12, $13
                )
                ON CONFLICT (user_id) DO UPDATE SET
                    recency_days = EXCLUDED.recency_days,
                    frequency = EXCLUDED.frequency,
                    monetary_value = EXCLUDED.monetary_value,
                    purchase_interval_days = EXCLUDED.purchase_interval_days,
                    purchase_intent = EXCLUDED.purchase_intent,
                    churn_probability = EXCLUDED.churn_probability,
                    clv = EXCLUDED.clv,
                    value_tier = EXCLUDED.value_tier
            """, 
            req.user_id, req.recency_days, req.frequency, req.monetary_value,
            req.avg_order_value / 5.0, req.avg_order_value, req.purchase_interval_days, 
            req.reorder_rate, purchase_intent, churn_prob, clv, value_tier, req.preferred_channel)
            
        return {
            "success": True,
            "user_id": req.user_id,
            "churn_probability": churn_prob,
            "clv": clv,
            "value_tier": value_tier,
            "purchase_intent": purchase_intent
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/customers/at-risk", tags=["Customers"])
async def get_at_risk_customers(limit: int = 10):
    """Returns top at-risk high-value customers."""
    async with get_pool().acquire() as conn:
        rows = await conn.fetch("""
            SELECT user_id, recency_days, frequency, monetary_value,
                   purchase_intent, churn_probability, clv, value_tier,
                   preferred_channel, top_department
            FROM customer_features
            WHERE churn_probability > 0.5
            ORDER BY (churn_probability * clv) DESC
            LIMIT $1
        """, limit)
    return {"customers": [dict(r) for r in rows]}


@app.get("/api/customers/{customer_id}", tags=["Customers"])
async def get_customer(customer_id: str):
    """Returns full profile for a specific customer."""
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM customer_features WHERE user_id = $1", customer_id
        )
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    return dict(row)


@app.get("/api/campaigns", tags=["Campaigns"])
async def get_campaigns(limit: int = 20):
    """Returns recently generated campaign plans."""
    async with get_pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM campaign_plans ORDER BY created_at DESC LIMIT $1", limit
        )
    return {"campaigns": [dict(r) for r in rows]}
