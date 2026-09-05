import json
from db.connection import get_pool

async def evaluate_purchase(cart_id: str, user_id: str, shipping_address: str, session_id: str) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        # 1. Fetch current cart total and items
        cart = await conn.fetchrow("SELECT quoted_total, discount_amount, discount_percent FROM carts WHERE id = $1", cart_id)
        if not cart or cart["quoted_total"] is None:
            return {"status": "error", "message": "Cart is empty or not quoted"}
        
        quoted_total = float(cart["quoted_total"])
        
        items = await conn.fetch("""
            SELECT ci.product_id, ci.quantity, ci.unit_price as quoted_price, p.price as live_price, p.inventory
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.cart_id = $1
        """, cart_id)
        
        if not items:
            return {"status": "error", "message": "Cart is empty"}

        # 2. Check Price Drift & Inventory
        live_subtotal = 0
        for item in items:
            if item["inventory"] < item["quantity"]:
                return {
                    "purchase_request_id": None,
                    "policy_decision": "BLOCKED",
                    "message": f"BLOCKED: Product {item['product_id']} is out of stock. Available: {item['inventory']}, Requested: {item['quantity']}."
                }
            live_subtotal += float(item["live_price"]) * item["quantity"]
            
        discount_amount = round(live_subtotal * float(cart["discount_percent"]) / 100, 2)
        live_total = round(live_subtotal - discount_amount, 2)
        
        if abs(live_total - quoted_total) > 0.01:
            return {
                "purchase_request_id": None,
                "policy_decision": "BLOCKED",
                "message": f"BLOCKED: Price Drift Detected. The merchant price changed after quoting. Quoted total: ₹{quoted_total}, Live total: ₹{live_total}."
            }
            
        # 3. Check Agent Policies
        policy = await conn.fetchrow(
            """SELECT auto_approve_limit, hard_limit FROM agent_policies
               WHERE user_id = $1 OR user_id = 'demo_user'
               ORDER BY CASE WHEN user_id = $1 THEN 0 ELSE 1 END
               LIMIT 1""",
            user_id,
        )
        
        decision = "REQUIRE_APPROVAL"
        if policy:
            if live_total > policy["hard_limit"]:
                return {
                    "purchase_request_id": None,
                    "policy_decision": "BLOCKED",
                    "message": f"BLOCKED: Amount exceeds your strict hard limit of ₹{policy['hard_limit']}."
                }

        # 4. If all checks pass, create purchase request
        pr_id = await conn.fetchval(
            """INSERT INTO purchase_requests
               (cart_id, user_id, proposed_total, subtotal, discount_percent,
                discount_amount, metadata, shipping_address, policy_decision)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING id""",
            cart_id, user_id, live_total, live_subtotal, cart["discount_percent"],
            discount_amount,
            json.dumps({'discount_source': 'retention_offer' if cart["discount_percent"] > 0 else 'none'}),
            shipping_address, decision
        )
        
        await conn.execute(
            "UPDATE carts SET status = 'pending_approval', updated_at = now() WHERE id = $1",
            cart_id,
        )
        
        return {
            "purchase_request_id": pr_id,
            "proposed_total": float(live_total),
            "policy_decision": decision,
            "message": f"Purchase request submitted for merchant processing. Policy decision: {decision}"
        }
