import asyncio
import json
import sys
from main import chat_with_agent, ChatRequest, lifespan, app
from db.connection import get_pool

async def main():
    try:
        async with lifespan(app):
            pool = get_pool()
            # Clear old carts
            async with pool.acquire() as conn:
                await conn.execute("DELETE FROM purchase_requests WHERE user_id='demo_user_test1234'")
                await conn.execute("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id='demo_user_test1234')")
                await conn.execute("DELETE FROM carts WHERE user_id='demo_user_test1234'")

            req = ChatRequest(
                session_id="test1234",
                messages=[
                    {"role": "system", "content": "You are a trusted AI Buyer..."}
                ]
            )
            
            def to_dict(m):
                if isinstance(m, dict):
                    return m
                return {"role": m.role, "content": m.content, "tool_calls": [t.model_dump() for t in m.tool_calls] if getattr(m, "tool_calls", None) else []}
                
            print("--- TURN 1 ---")
            req.messages.append({"role": "user", "content": "Search for wireless headphones"})
            res = await chat_with_agent(req)
            print(json.dumps(res, indent=2))
            
            print("--- TURN 2 ---")
            safe_messages = [to_dict(m) for m in req.messages]
            safe_messages.append({"role": "assistant", "content": res["reply"], "tool_calls": res.get("tool_calls", [])})
            safe_messages.append({"role": "user", "content": "Add 2 to my cart"})
            req.messages = safe_messages
            res = await chat_with_agent(req)
            print(json.dumps(res, indent=2))

            print("--- TURN 3 ---")
            safe_messages = [to_dict(m) for m in req.messages]
            safe_messages.append({"role": "assistant", "content": res["reply"], "tool_calls": res.get("tool_calls", [])})
            safe_messages.append({"role": "user", "content": "Proceed and checkout"})
            req.messages = safe_messages
            res = await chat_with_agent(req)
            print(json.dumps(res, indent=2))
            
            print("--- TURN 4 ---")
            safe_messages = [to_dict(m) for m in req.messages]
            safe_messages.append({"role": "assistant", "content": res["reply"], "tool_calls": res.get("tool_calls", [])})
            safe_messages.append({"role": "user", "content": "Confirmed shipping address:\nName: John Doe\nAddress: 123 Test St\nPhone: 1234567890\n\nPlease call the request_purchase tool now with this address."})
            req.messages = safe_messages
            res = await chat_with_agent(req)
            print(json.dumps(res, indent=2))
    except Exception as e:
        print("ERROR:", e)

asyncio.run(main())
