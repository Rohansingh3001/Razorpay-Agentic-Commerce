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
            "description": "Create a purchase request for the current cart. Does not charge the user directly. Returns the decision from the Policy Engine.",
            "parameters": {
                "type": "object",
                "properties": {
                    "shipping_address": {"type": "string", "description": "The confirmed shipping address collected from the user."}
                },
                "required": ["shipping_address"]
            }
        }
    }
]

class AIBuyerAgent:
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
            "If the request_purchase result says BLOCKED by the Policy Engine (e.g. due to price drift or limit), you MUST inform the user exactly why it was blocked and ask how they want to proceed. "
            "After a successful request_purchase, say that the request was submitted and approved, and use 'Purchase Request ID', not 'Order ID'. "
            "Never say an item is on its way, shipped, or purchased successfully unless a separate payment and fulfillment result explicitly confirms it. "
            "When you search or recommend products, the UI will display them inline automatically. "
            "Never claim that a product is unavailable without first calling search_products. "
            "Treat descriptive terms as filters, not an exact product-name requirement. "
            "For example, 'wireless headphones' should find a product named 'Wireless Noise-Canceling Headphones'. "
            "When calling create_cart, use the exact `id` returned by search_products, never the product name."
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
                
                tool_result = await self._execute_tool(fn_name, args, cart_id, session_id)
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

    async def _execute_tool(self, name: str, args: dict, cart_id: str, session_id: str) -> dict:
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
            
        elif name == "request_purchase":
            shipping_address = args.get("shipping_address", "")
            
            # Delegate to the Policy Engine in main.py
            from policy_engine import evaluate_purchase
            result = await evaluate_purchase(cart_id, self.user_id, shipping_address, session_id)
            return result
        
        return {"status": "error", "message": "Unknown tool."}
