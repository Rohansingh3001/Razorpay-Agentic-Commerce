import os
import json
from groq import Groq
from db.connection import get_pool

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Searches the live product catalog using natural-language product terms and optional filters. Always call this before saying a product is unavailable.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The customer's product request, including descriptors such as 'wireless headphones' or 'black running shoes'."},
                    "max_price": {"type": ["number", "null"], "description": "Maximum price constraint"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_product",
            "description": "Retrieve exact product facts by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"}
                },
                "required": ["product_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_inventory",
            "description": "Check current inventory for a product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"}
                },
                "required": ["product_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_cart",
            "description": "Creates or updates the cart with a list of product IDs and quantities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "product_id": {"type": "string"},
                                "quantity": {"type": "integer"}
                            },
                            "required": ["product_id", "quantity"]
                        }
                    }
                },
                "required": ["items"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_quote",
            "description": "Calculate current authoritative cart price.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_upsell",
            "description": "Find one relevant compatible add-on based on the current cart.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "collect_shipping_address",
            "description": "Trigger the UI to ask the user to confirm their pre-filled shipping address before checkout. You MUST call this before request_purchase.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "request_purchase",
            "description": "Create a purchase request for the current cart. Does not charge the user directly.",
            "parameters": {
                "type": "object",
                "properties": {
                    "shipping_address": {"type": "string", "description": "The confirmed shipping address collected from the user."}
                },
                "required": ["shipping_address"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_churn_risk",
            "description": "Check if a user is a high-value customer at risk of churning.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"}
                },
                "required": ["user_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "apply_retention_discount",
            "description": "Apply a dynamic discount (e.g., 10) to the current cart if the user has a high churn risk.",
            "parameters": {
                "type": "object",
                "properties": {
                    "percentage": {"type": "integer", "description": "The discount percentage (e.g., 10)."}
                },
                "required": ["percentage"]
            }
        }
    }
]

class CheckoutAgent:
    def __init__(self, user_id="demo_user"):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.user_id = user_id
        self.system_prompt = (
            "You are a trusted AI Buyer for an e-commerce store with Agentic Commerce capabilities. "
            "Your goal is to help customers find products, evaluate constraints, build a cart, and request a purchase safely. "
            "You must follow this workflow: "
            "1. Search products (search_products) based on user intent. Explain why you recommend a product based on authoritative facts. "
            "2. If applicable, recommend a contextual upsell (recommend_upsell). "
            "3. Create the cart (create_cart). "
            "4. Get an authoritative quote (get_quote). Never invent prices. "
            "5. After getting a quote, you MUST call collect_shipping_address to prompt the user to confirm their shipping details. Wait for the user to reply with their confirmed address. "
            "6. Once the user provides their shipping address, you MUST call the request_purchase tool with that address. NEVER tell the user the request was submitted without actually calling the request_purchase tool and receiving a success result! "
            "Always be concise, polite, and explain your reasoning. "
            "This store uses INR: format every amount with the ₹ symbol and never use $ or USD. "
            "A request_purchase result is only a secure purchase request; it is not a completed payment, shipment, or delivery. "
            "After request_purchase, say that the request was submitted for merchant processing and use 'Purchase Request ID', not 'Order ID'. "
            "Never say an item is on its way, shipped, or purchased successfully unless a separate payment and fulfillment result explicitly confirms it. "
            "When you search or recommend products, the UI will display them inline automatically. "
            "Never claim that a product is unavailable without first calling search_products. "
            "Treat descriptive terms as filters, not an exact product-name requirement. "
            "For example, 'wireless headphones' should find a product named 'Wireless Noise-Canceling Headphones'. "
            "When calling create_cart, use the exact `id` returned by search_products, never the product name. "
            "NEGOTIATION PROTOCOL: If the user hesitates due to price (e.g., 'too expensive' or 'can you do better'), do NOT immediately say no. "
            "Instead, check their churn risk using `check_churn_risk` with user_id='demo_user'. "
            "If they have a HIGH churn risk and HIGH lifetime value, use `apply_retention_discount` to authorize a 10% discount to save the sale. "
            "Explain that you are applying a dynamic Razorpay Offer because they are a valued customer."
        )

    async def run(self, messages, session_id):
        """
        Runs the Groq conversation loop.
        `session_id` is used to track the cart in the DB.
        """
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": self.system_prompt})

        audit_trail = []
        pool = get_pool()
        
        # Ensure a cart exists for this session
        cart_id = None
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT id FROM carts WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1", self.user_id)
            if row:
                cart_id = row['id']
            else:
                cart_id = await conn.fetchval("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", self.user_id)

        while True:
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=1024
            )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            if not tool_calls:
                return {
                    "content": response_message.content,
                    "audit_trail": audit_trail,
                    "cart_id": cart_id
                }

            messages.append(response_message)

            for tool_call in tool_calls:
                fn_name = tool_call.function.name
                args = json.loads(tool_call.function.arguments)
                
                # Log audit event for the intent/action
                await self._log_audit(session_id, f"AGENT_CALL_{fn_name.upper()}", {"args": args})
                audit_trail.append({"tool": fn_name, "args": args})
                
                tool_result = await self._execute_tool(fn_name, args, cart_id)
                audit_trail[-1]["result"] = tool_result
                
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": fn_name,
                    "content": json.dumps(tool_result),
                })

    async def _log_audit(self, session_id, event_type, payload):
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO audit_events (session_id, event_type, actor, payload) VALUES ($1, $2, $3, $4::jsonb)",
                session_id, event_type, "AI_BUYER", json.dumps(payload)
            )

    async def _execute_tool(self, name: str, args: dict, cart_id: str) -> dict:
        pool = get_pool()
        
        if name == "search_products":
            query = str(args.get('query', '')).strip()
            words = [word for word in query.split() if word]
            max_price = args.get('max_price')
            
            sql = "SELECT id, name, price, category, description, attributes FROM products WHERE 1=1"
            params = []
            
            for word in words:
                params.append(f"%{word}%")
                idx = len(params)
                sql += f" AND (name ILIKE ${idx} OR category ILIKE ${idx} OR description ILIKE ${idx})"
                
            if max_price:
                params.append(max_price)
                sql += f" AND price <= ${len(params)}"
                
            async with pool.acquire() as conn:
                rows = await conn.fetch(sql, *params)

                # A strict token match is preferred, but a natural-language request
                # can include a descriptor that is not present in every catalog name.
                # Fall back to matching any meaningful token so valid products are
                # still surfaced for queries such as "wireless headphones".
                if not rows and len(words) > 1:
                    fallback_sql = "SELECT id, name, price, category, description, attributes FROM products WHERE ("
                    fallback_params = []
                    clauses = []
                    for word in words:
                        fallback_params.append(f"%{word}%")
                        idx = len(fallback_params)
                        clauses.append(f"(name ILIKE ${idx} OR category ILIKE ${idx} OR description ILIKE ${idx})")
                    fallback_sql += " OR ".join(clauses) + ")"
                    if max_price:
                        fallback_params.append(max_price)
                        fallback_sql += f" AND price <= ${len(fallback_params)}"
                    fallback_sql += " ORDER BY CASE WHEN name ILIKE $1 THEN 0 ELSE 1 END, name"
                    rows = await conn.fetch(fallback_sql, *fallback_params)
            
            results = []
            for r in rows:
                d = dict(r)
                d["price"] = float(d["price"])
                d["attributes"] = json.loads(d["attributes"]) if d["attributes"] else {}
                results.append(d)
                
            return {"products": results}
            
        elif name == "get_product":
            pid = args.get("product_id")
            async with pool.acquire() as conn:
                row = await conn.fetchrow("SELECT id, name, price, description, attributes FROM products WHERE id = $1", pid)
            if row:
                d = dict(row)
                d["price"] = float(d["price"])
                d["attributes"] = json.loads(d["attributes"]) if d["attributes"] else {}
                return d
            return {"error": "Product not found"}

        elif name == "check_inventory":
            pid = args.get("product_id")
            async with pool.acquire() as conn:
                inv = await conn.fetchval("SELECT inventory FROM products WHERE id = $1", pid)
            if inv is not None:
                return {"product_id": pid, "inventory_count": inv, "in_stock": inv > 0}
            return {"error": "Product not found"}
            
        elif name == "create_cart":
            items = args.get("items", [])
            async with pool.acquire() as conn:
                resolved_items = []
                unresolved_items = []

                for item in items:
                    requested_id = str(item.get("product_id", "")).strip()
                    qty = item.get("quantity", 1)
                    product = await conn.fetchrow(
                        "SELECT id, price FROM products WHERE id = $1",
                        requested_id,
                    )

                    # Models sometimes pass the visible product name instead of
                    # the authoritative ID. Resolve that safely at the DB boundary.
                    if not product and requested_id:
                        product = await conn.fetchrow(
                            "SELECT id, price FROM products WHERE LOWER(name) = LOWER($1)",
                            requested_id,
                        )
                    if not product and requested_id:
                        product = await conn.fetchrow(
                            """SELECT id, price FROM products
                               WHERE name ILIKE $1
                               ORDER BY LENGTH(name)
                               LIMIT 1""",
                            f"%{requested_id}%",
                        )

                    if not product:
                        unresolved_items.append(requested_id)
                        continue
                    resolved_items.append((product["id"], qty, product["price"]))

                if unresolved_items:
                    return {
                        "status": "error",
                        "message": "Product not found in catalog.",
                        "unresolved_product_ids": unresolved_items,
                        "instruction": "Call search_products and retry create_cart with the returned product id.",
                    }

                # Replace the active cart only after every requested item is valid.
                await conn.execute("DELETE FROM cart_items WHERE cart_id = $1", cart_id)
                for pid, qty, price in resolved_items:
                    await conn.execute(
                        "INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)",
                        cart_id, pid, qty, price
                    )
            return {"status": "success", "message": "Cart updated"}
            
        elif name == "get_quote":
            async with pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT p.id, p.name, ci.quantity, ci.unit_price 
                    FROM cart_items ci JOIN products p ON ci.product_id = p.id 
                    WHERE ci.cart_id = $1
                """, cart_id)
                
                subtotal = sum(float(r["quantity"] * r["unit_price"]) for r in rows)
                discount_percent = float(await conn.fetchval(
                    "SELECT discount_percent FROM carts WHERE id = $1", cart_id
                ) or 0)
                discount_amount = round(subtotal * discount_percent / 100, 2)
                total = round(subtotal - discount_amount, 2)
                items = [{"id": r["id"], "name": r["name"], "quantity": r["quantity"], "price": float(r["unit_price"])} for r in rows]
                
                # Update quoted_total in carts
                await conn.execute(
                    "UPDATE carts SET quoted_total = $1, discount_amount = $2 WHERE id = $3",
                    total, discount_amount, cart_id,
                )
                
            return {
                "cart_id": cart_id,
                "items": items,
                "subtotal": subtotal,
                "discount_percent": discount_percent,
                "discount_amount": discount_amount,
                "authoritative_total": total,
            }
            
        elif name == "recommend_upsell":
            # Recommend based on first item in cart
            async with pool.acquire() as conn:
                first_item = await conn.fetchrow("SELECT product_id FROM cart_items WHERE cart_id = $1 LIMIT 1", cart_id)
                if not first_item:
                    return {"recommendation": None}
                    
                prod = await conn.fetchrow("SELECT compatible_product_ids FROM products WHERE id = $1", first_item["product_id"])
                if prod and prod["compatible_product_ids"]:
                    compat_ids = json.loads(prod["compatible_product_ids"])
                    if compat_ids:
                        upsell = await conn.fetchrow("SELECT id, name, price, description FROM products WHERE id = $1", compat_ids[0])
                        if upsell:
                            u = dict(upsell)
                            u["price"] = float(u["price"])
                            return {"recommendation": u}
            return {"recommendation": None}
            
        elif name == "collect_shipping_address":
            return {"status": "success", "message": "Address confirmation UI triggered. Wait for user to confirm address."}

        elif name == "check_churn_risk":
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT churn_probability, clv, value_tier
                       FROM customer_features
                       WHERE user_id = $1 OR user_id = 'demo_user'
                       ORDER BY CASE WHEN user_id = $1 THEN 0 ELSE 1 END
                       LIMIT 1""",
                    self.user_id,
                )
            if not row:
                return {"eligible": False, "reason": "Customer profile unavailable"}
            churn = float(row["churn_probability"] or 0)
            clv = float(row["clv"] or 0)
            eligible = churn >= 0.5 and clv >= 10000
            return {
                "eligible": eligible,
                "churn_probability": churn,
                "clv": clv,
                "value_tier": row["value_tier"],
                "reason": "High churn risk and high lifetime value" if eligible else "Offer criteria not met",
            }

        elif name == "apply_retention_discount":
            requested_percentage = int(args.get("percentage", 0))
            if requested_percentage != 10:
                return {"status": "error", "message": "Only the approved 10% retention offer is available."}
            async with pool.acquire() as conn:
                profile = await conn.fetchrow(
                    """SELECT churn_probability, clv FROM customer_features
                       WHERE user_id = $1 OR user_id = 'demo_user'
                       ORDER BY CASE WHEN user_id = $1 THEN 0 ELSE 1 END
                       LIMIT 1""",
                    self.user_id,
                )
                if not profile or float(profile["churn_probability"] or 0) < 0.5 or float(profile["clv"] or 0) < 10000:
                    return {"status": "denied", "message": "Customer is not eligible for the retention offer."}
                row = await conn.fetchrow(
                    "SELECT COALESCE(SUM(quantity * unit_price), 0) AS subtotal FROM cart_items WHERE cart_id = $1",
                    cart_id,
                )
                subtotal = float(row["subtotal"] or 0)
                discount_amount = round(subtotal * 0.10, 2)
                total = round(subtotal - discount_amount, 2)
                await conn.execute(
                    "UPDATE carts SET discount_percent = 10, discount_amount = $1, quoted_total = $2 WHERE id = $3",
                    discount_amount, total, cart_id,
                )
            return {
                "status": "applied",
                "percentage": 10,
                "subtotal": subtotal,
                "discount_amount": discount_amount,
                "discounted_total": total,
                "message": "10% retention offer applied to this cart.",
            }
            
        elif name == "request_purchase":
            shipping_address = args.get("shipping_address", "")
            async with pool.acquire() as conn:
                total = await conn.fetchval("SELECT quoted_total FROM carts WHERE id = $1", cart_id)
                if not total or total <= 0:
                    return {"status": "error", "message": "Cart is empty or not quoted"}
                
                # Create purchase request
                pr_id = await conn.fetchval(
                    """INSERT INTO purchase_requests
                       (cart_id, user_id, proposed_total, subtotal, discount_percent,
                        discount_amount, metadata, shipping_address)
                       SELECT $1, $2, quoted_total, quoted_total + discount_amount,
                              discount_percent, discount_amount,
                              jsonb_build_object('discount_source', CASE WHEN discount_percent > 0 THEN 'retention_offer' ELSE 'none' END),
                              $3
                       FROM carts WHERE id = $1
                       RETURNING id""",
                    cart_id, self.user_id, shipping_address
                )
                await conn.execute(
                    "UPDATE carts SET status = 'pending_approval', updated_at = now() WHERE id = $1",
                    cart_id,
                )
                
                # Note: Policy engine evaluation should ideally happen centrally, but for the agent to know, we can do a quick check
                # We can call the backend policy engine or do the DB check here. Let's do it here for the agent's immediate result.
                policy = await conn.fetchrow(
                    """SELECT auto_approve_limit, hard_limit FROM agent_policies
                       WHERE user_id = $1 OR user_id = 'demo_user'
                       ORDER BY CASE WHEN user_id = $1 THEN 0 ELSE 1 END
                       LIMIT 1""",
                    self.user_id,
                )
                
                # Every purchase request must pass through the merchant portal.
                # The agent may flag a hard-limit violation, but never approves
                # or creates a payment link on the buyer's behalf.
                decision = "REQUIRE_APPROVAL"
                if total > policy["hard_limit"]:
                    decision = "BLOCKED"
                    
                await conn.execute("UPDATE purchase_requests SET policy_decision = $1 WHERE id = $2", decision, pr_id)
                
                return {
                    "purchase_request_id": pr_id,
                    "proposed_total": float(total),
                    "policy_decision": decision,
                    "message": f"Purchase request submitted for merchant processing. Policy decision: {decision}"
                }
        
        return {"status": "error", "message": "Unknown tool."}
